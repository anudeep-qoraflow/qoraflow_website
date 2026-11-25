// GET /api/call-events?call_id=...&sig=...
// A Server-Sent Events stream for the visitor's own live call. It follows
// Retell's live transcript (wss://api.retellai.com/v2/monitor-call/<id>, which
// needs the secret key, so it can't run in the browser) and sends the page a
// "contact" event each time the agent's sentence mentions the Contact us
// button, so the page can make that button glow.
// `sig` is an HMAC of the call id issued by /api/web-call, so a visitor can
// only follow the call they started.

const CONTACT_RE = /\bcontact\s*(us|form|button|page)\b/i;
const MAX_STREAM_MS = 5 * 60 * 1000;

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

async function openMonitor(callId, apiKey) {
  // The call can take a moment to turn live (close code 4004 / non-101); retry briefly.
  for (let attempt = 0; attempt < 8; attempt++) {
    const resp = await fetch(`https://api.retellai.com/v2/monitor-call/${encodeURIComponent(callId)}`, {
      headers: {
        Upgrade: "websocket",
        "Sec-WebSocket-Protocol": `bearer, ${apiKey}`,
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (resp.webSocket) {
      resp.webSocket.accept();
      return resp.webSocket;
    }
    await new Promise((r) => setTimeout(r, 400 + attempt * 300));
  }
  return null;
}

export async function onRequestGet({ request, env }) {
  if (!env.RETELL_API_KEY) return new Response("Not configured", { status: 503 });
  const url = new URL(request.url);
  const callId = url.searchParams.get("call_id") || "";
  const sig = url.searchParams.get("sig") || "";
  if (!/^[A-Za-z0-9_-]{6,100}$/.test(callId) || !sig) return new Response("Bad request", { status: 400 });
  if (!safeEqual(sig, await sign(callId, env.RETELL_API_KEY))) return new Response("Forbidden", { status: 403 });

  const ws = await openMonitor(callId, env.RETELL_API_KEY);
  if (!ws) return new Response("Call not live", { status: 409 });

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const enc = new TextEncoder();
  let closed = false;
  const flagged = new Set();
  const content = new Map();

  const send = (text) => {
    if (closed) return;
    writer.write(enc.encode(text)).catch(() => finish());
  };
  const finish = () => {
    if (closed) return;
    closed = true;
    clearInterval(ping);
    clearTimeout(cap);
    try { ws.close(1000, "done"); } catch {}
    writer.close().catch(() => {});
  };

  ws.addEventListener("message", (ev) => {
    let msg;
    try { msg = JSON.parse(typeof ev.data === "string" ? ev.data : new TextDecoder().decode(ev.data)); } catch { return; }
    if (msg?.type === "call_ended") { send("event: ended\ndata: {}\n\n"); finish(); return; }
    if (msg?.type !== "transcript") return;
    for (const item of msg.transcripts || []) {
      if (!item || item.role !== "agent" || typeof item.content !== "string") continue;
      const id = String(item.id ?? item.time_sec ?? "");
      // Items arrive as snapshots or growing deltas; keep the longest text per id.
      const text = (content.get(id) || "").length >= item.content.length ? content.get(id) : item.content;
      content.set(id, text);
      if (!flagged.has(id) && CONTACT_RE.test(text)) {
        flagged.add(id);
        send(`event: contact\ndata: ${JSON.stringify({ id })}\n\n`);
      }
    }
  });
  ws.addEventListener("close", finish);
  ws.addEventListener("error", finish);

  const ping = setInterval(() => send(": ping\n\n"), 15000);
  const cap = setTimeout(finish, MAX_STREAM_MS);
  send("event: ready\ndata: {}\n\n");

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
