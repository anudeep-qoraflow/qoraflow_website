// Cloudflare Worker for qoraflow.com.
// Handles the voice-agent API routes and serves every other request from the
// static site files (the ASSETS binding, configured in wrangler.jsonc).

import * as webCall from "./web-call.js";
import * as callEvents from "./call-events.js";
import * as contact from "./contact.js";

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const context = { request, env };

    if (pathname === "/api/web-call") {
      return request.method === "POST" ? webCall.onRequestPost(context) : webCall.onRequest(context);
    }
    if (pathname === "/api/call-events") {
      return request.method === "GET"
        ? callEvents.onRequestGet(context)
        : new Response("Method not allowed", { status: 405 });
    }
    if (pathname === "/api/contact") {
      return request.method === "POST"
        ? contact.onRequestPost(context)
        : new Response("Method not allowed", { status: 405 });
    }
    if (pathname.startsWith("/api/")) return new Response("Not found", { status: 404 });

    return env.ASSETS.fetch(request);
  },
};
