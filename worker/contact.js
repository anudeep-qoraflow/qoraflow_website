// POST /api/contact
// The "Try your own voice agent" contact form. Checks the submission, then
// emails it to contact@qoraflow.com through Resend, with Reply-To set to the
// visitor so a reply from Zoho goes straight to them.
//
// Protection, in order:
//   1. Same-site only (Origin check) and a small body size limit.
//   2. Field checks (lengths, email format, phone digits).
//   3. Honeypot: a hidden "website" field that people never see. Bots that
//      fill it get a fake "ok" and nothing is sent.
//   4. Cloudflare Turnstile token, verified server-side (hostname checked).
//   5. At most RATE_LIMIT sends per visitor IP per hour (KV counter).
//   6. Resend API key and Turnstile secret are Worker secrets, never in the page.
// After the lead email is sent, the visitor gets a branded confirmation email
// (fixed wording; only a cleaned first name is personalised; at most one per
// email address per day, so the form can't be used to spam someone).
//
// Secrets: RESEND_API_KEY, TURNSTILE_SECRET_KEY
// Vars (wrangler.jsonc): CONTACT_TO, CONTACT_FROM, CONFIRM_FROM, EMAIL_ASSETS_URL, TURNSTILE_HOSTNAMES
// Binding: CONTACT_LIMITS (KV namespace)

const ALLOWED_ORIGINS = new Set([
  "https://qoraflow.com",
  "https://www.qoraflow.com",
  "http://localhost:8788",
  "http://127.0.0.1:8788",
  "http://localhost:8790",
  "http://127.0.0.1:8790",
]);

const RATE_LIMIT = 3; // sends per visitor per hour
const MAX_BODY_BYTES = 10_000;
const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const RESEND_URL = "https://api.resend.com/emails";
import { customerConfirmation, leadNotification, safeFirstName } from "./emails.js";

const EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/;

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function originAllowed(origin, requestUrl) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  // Preview URLs of this same Worker (*.workers.dev).
  try {
    const o = new URL(origin);
    return o.hostname.endsWith(".workers.dev") && o.host === new URL(requestUrl).host;
  } catch {
    return false;
  }
}

// Trim, remove control characters (blocks header injection), cap length.
function clean(value, max) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, " ").replace(/\r\n?/g, "\n").trim().slice(0, max);
}
function oneLine(value) {
  return value.replace(/\s+/g, " ").trim();
}

function validate(body) {
  const f = {
    name: oneLine(clean(body.name, 100)),
    email: oneLine(clean(body.email, 254)).toLowerCase(),
    phone: oneLine(clean(body.phone, 30)),
    business: oneLine(clean(body.business, 150)),
    message: clean(body.message, 2000),
  };
  const digits = f.phone.replace(/\D/g, "");
  if (f.name.length < 2) return { error: "Please enter your full name." };
  if (!EMAIL_RE.test(f.email)) return { error: "Please enter a valid email address." };
  if (digits.length < 7 || digits.length > 15) return { error: "Please enter a valid phone number." };
  if (f.business.length < 2) return { error: "Please enter your business name." };
  if (f.message.length < 2) return { error: "Please tell us a little about your business." };
  return { fields: f };
}

async function verifyTurnstile(token, ip, env) {
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) return false;
  const form = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token, idempotency_key: crypto.randomUUID() });
  if (ip) form.set("remoteip", ip);
  try {
    const res = await fetch(SITEVERIFY_URL, { method: "POST", body: form, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return false;
    const out = await res.json();
    if (out.success !== true) return false;
    const allowed = String(env.TURNSTILE_HOSTNAMES || "qoraflow.com,www.qoraflow.com")
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);
    return allowed.includes(out.hostname);
  } catch {
    return false;
  }
}

// Fixed one-hour window per IP. KV is eventually consistent, so this is a
// good-enough spam guard, not an exact counter; Turnstile is the main defence.
async function underRateLimit(ip, env) {
  const bucket = Math.floor(Date.now() / 3_600_000);
  const key = `contact:${ip || "unknown"}:${bucket}`;
  const count = parseInt((await env.CONTACT_LIMITS.get(key)) || "0", 10);
  if (count >= RATE_LIMIT) return false;
  await env.CONTACT_LIMITS.put(key, String(count + 1), { expirationTtl: 3900 });
  return true;
}

async function resendSend(env, payload) {
  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    // Log status and Resend's error only, never the visitor's details.
    console.error("Resend send failed", res.status, detail.slice(0, 300));
    return false;
  }
  return true;
}

function assetsUrl(env) {
  return String(env.EMAIL_ASSETS_URL || "https://qoraflow.com/email").replace(/\/$/, "");
}

// The lead, to the Qoraflow inbox. Reply-To is the visitor.
async function sendLead(f, env) {
  const mail = leadNotification({ f, assets: assetsUrl(env) });
  return resendSend(env, {
    from: env.CONTACT_FROM || "Qoraflow Website <website@qoraflow.com>",
    to: [env.CONTACT_TO || "contact@qoraflow.com"],
    reply_to: f.email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });
}

// The confirmation, to the visitor. Max one per email address per 24 hours.
async function sendConfirmation(f, env) {
  const key = `confirm:${f.email}`;
  if (await env.CONTACT_LIMITS.get(key)) return false;
  await env.CONTACT_LIMITS.put(key, "1", { expirationTtl: 86400 });
  const mail = customerConfirmation({ firstName: safeFirstName(f.name), assets: assetsUrl(env), siteUrl: "https://qoraflow.com" });
  return resendSend(env, {
    from: env.CONFIRM_FROM || "Qoraflow <contact@qoraflow.com>",
    to: [f.email],
    reply_to: env.CONTACT_TO || "contact@qoraflow.com",
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });
}

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin") || "";
  if (!originAllowed(origin, request.url)) return json({ error: "Forbidden" }, 403);
  if (!env.RESEND_API_KEY || !env.TURNSTILE_SECRET_KEY || !env.CONTACT_LIMITS) {
    console.error("Contact form is not configured (missing secret or KV binding)");
    return json({ error: "The form is unavailable right now." }, 503);
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json({ error: "Your message is too long." }, 413);
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Bad request" }, 400);
  }
  if (!body || typeof body !== "object") return json({ error: "Bad request" }, 400);

  // Honeypot filled in: pretend it worked, send nothing.
  if (typeof body.website === "string" && body.website.trim() !== "") return json({ ok: true }, 200);

  const { fields, error } = validate(body);
  if (error) return json({ error }, 400);

  const ip = request.headers.get("CF-Connecting-IP") || "";
  if (!(await verifyTurnstile(body.turnstile_token, ip, env))) {
    return json({ error: "Please complete the security check and try again.", retry: true }, 400);
  }
  if (!(await underRateLimit(ip, env))) {
    return json({ error: "You've already sent us a few requests. We'll be in touch soon." }, 429);
  }
  if (!(await sendLead(fields, env))) {
    return json({ error: "We couldn't send your details." }, 502);
  }
  // The lead is safe with us; a failed confirmation must not show the visitor an error.
  try {
    await sendConfirmation(fields, env);
  } catch (err) {
    console.error("Confirmation email failed", String(err).slice(0, 200));
  }
  return json({ ok: true }, 200);
}
