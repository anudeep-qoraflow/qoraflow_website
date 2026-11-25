// POST /api/web-call
// Starts a Retell web call for the "Talk to Qoraflow" screen. The browser's
// Retell SDK sends its create-web-call request here instead of to Retell; this
// adds the secret key (Worker secret RETELL_API_KEY), the agent and
// the visitor's details, forwards it to Retell's /v3/create-web-call and hands
// the SDK back Retell's answer (call id + short-lived join credentials).
// The API key never reaches the browser.

const ALLOWED_ORIGINS = new Set([
  "https://qoraflow.com",
  "https://www.qoraflow.com",
  "http://localhost:8788",
  "http://127.0.0.1:8788",
  "http://localhost:8790",
  "http://127.0.0.1:8790",
]);

const SCENARIOS = {
  general: "The visitor wants to learn about Qoraflow.",
  how: "The visitor asked: how does Qoraflow work?",
  pricing: "The visitor asked: what does Qoraflow cost?",
  setup: "The visitor asked: how fast is setup?",
  dental: "DEMO MODE: act as the AI receptionist for Bright Smile Dental, a dental clinic.",
  hvac: "DEMO MODE: act as the AI receptionist for CoolAir Heating & Cooling, an HVAC company.",
  salon: "DEMO MODE: act as the AI receptionist for Luxe Hair Studio, a hair salon.",
};

const LANGUAGES = { en: "English", es: "Spanish" };

// The agent's first sentence is fixed here, not written by the AI, so the
// introduction is said once per page visit and never repeated on a restart.
const DEMO_OPENERS = {
  dental: "Thank you for calling Bright Smile Dental, this is Qora. How can I help you today?",
  hvac: "Thanks for calling CoolAir Heating and Cooling, this is Qora. How can I help?",
  salon: "Thank you for calling Luxe Hair Studio, this is Qora. How can I help you today?",
};
function openingLine(scenarioKey, firstName, restarted) {
  if (restarted) return firstName ? `Hi again, ${firstName}! Where were we?` : "Hi again! Where were we?";
  if (DEMO_OPENERS[scenarioKey]) return DEMO_OPENERS[scenarioKey];
  const hi = firstName ? `Hi ${firstName}, ` : "Hi, ";
  return `${hi}I'm Qora from Qoraflow. We build AI voice agents that answer the phone for businesses like HVAC companies and dental clinics. What can I help you with?`;
}

// Same signing as worker/call-events.js: lets the page follow only its own call.
async function sign(callId, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode("qf-call-events:" + secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(callId));
  return btoa(String.fromCharCode(...new Uint8Array(mac))).replace(/[+/=]/g, (c) => ({ "+": "-", "/": "_", "=": "" })[c]);
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// When a visitor taps Start again on the same page, the page sends the
// previous call's id and signature. We fetch that call's transcript so the
// agent continues the conversation instead of introducing itself again.
async function previousTranscript(callId, sig, env) {
  if (typeof callId !== "string" || typeof sig !== "string") return null;
  if (!/^[A-Za-z0-9_-]{6,100}$/.test(callId)) return null;
  if (!safeEqual(sig, await sign(callId, env.RETELL_API_KEY))) return null;
  try {
    const res = await fetch(`https://api.retellai.com/v2/get-call/${callId}`, {
      headers: { Authorization: `Bearer ${env.RETELL_API_KEY}` },
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return "";
    const call = await res.json();
    const t = typeof call.transcript === "string" ? call.transcript.trim() : "";
    return t.length > 2000 ? "..." + t.slice(-2000) : t;
  } catch {
    return "";
  }
}

function json(body, status, origin) {
  const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  return new Response(JSON.stringify(body), { status, headers });
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

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin") || "";
  if (!originAllowed(origin, request.url)) {
    return json({ error: "Forbidden" }, 403);
  }
  if (!env.RETELL_API_KEY || !env.RETELL_AGENT_ID) {
    return json({ error: "Voice agent is not configured yet." }, 503, origin);
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    // An empty body is fine: defaults below.
  }
  const scenarioKey = Object.hasOwn(SCENARIOS, body.scenario) ? body.scenario : "general";
  const languageKey = Object.hasOwn(LANGUAGES, body.language) ? body.language : "en";
  const pagePath = typeof body.page_path === "string" ? body.page_path.slice(0, 200) : "/";
  const clean = (v, max) => (typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max) : "");
  const visitorName = clean(body.visitor_name, 80);
  const visitorPhone = clean(body.visitor_phone, 30);
  const phoneDigits = visitorPhone.replace(/\D/g, "");
  if (visitorName.length < 2 || phoneDigits.length < 7 || phoneDigits.length > 15) {
    return json({ error: "Please enter your name and phone number." }, 400, origin);
  }

  // null = first call on this page; "" = a restart whose transcript isn't available.
  const prev = await previousTranscript(body.prev_call_id, body.prev_sig, env);

  const first = visitorName.split(/\s+/)[0] || "";
  const firstName = first.charAt(0).toUpperCase() + first.slice(1);
  const opening = openingLine(scenarioKey, firstName, prev !== null);

  const sdkVersion = request.headers.get("X-Retell-Client-JS-SDK-Version");
  const upstream = await fetch("https://api.retellai.com/v3/create-web-call", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RETELL_API_KEY}`,
      "Content-Type": "application/json",
      ...(sdkVersion ? { "X-Retell-Client-JS-SDK-Version": sdkVersion.slice(0, 20) } : {}),
    },
    body: JSON.stringify({
      agent_id: env.RETELL_AGENT_ID,
      retell_llm_dynamic_variables: {
        scenario: SCENARIOS[scenarioKey],
        language: LANGUAGES[languageKey],
        visitor_name: visitorName,
        returning: prev === null ? "no" : "yes",
        previous_conversation: prev || "(not available)",
        opening_line: opening,
      },
      // Shows on each call in Retell's Call History, so you can follow up.
      metadata: { source: "website", visitor_name: visitorName, visitor_phone: visitorPhone, scenario: scenarioKey, page_path: pagePath },
    }),
  });

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    console.error("Retell create-web-call failed", upstream.status, detail.slice(0, 500));
    return json({ error: "Could not start the call. Please try again." }, 502, origin);
  }

  // Pass Retell's response through (the SDK needs every join field), plus a
  // signature the page uses to open /api/call-events for this call only.
  const data = await upstream.json();
  if (data && typeof data.call_id === "string") data.qf_sig = await sign(data.call_id, env.RETELL_API_KEY);
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": origin,
      Vary: "Origin",
    },
  });
}

export function onRequest({ request }) {
  const origin = request.headers.get("Origin") || "";
  if (request.method === "OPTIONS" && originAllowed(origin, request.url)) {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Retell-Client-JS-SDK-Version",
        "Access-Control-Max-Age": "86400",
      },
    });
  }
  return json({ error: "Method not allowed" }, 405);
}
