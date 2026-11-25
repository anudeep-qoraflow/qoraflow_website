QORAFLOW WEBSITE — READY TO HOST
================================

Files
  about.html     About us
  index.html     Home page (intro, AI core, features, how it works, app, pricing, FAQ, contact, talk mode)
  privacy.html   Privacy Policy
  terms.html     Terms of Service
  favicon.svg    Browser tab icon

Everything is plain HTML, CSS and JavaScript. No build step and no server code needed.

HOW TO HOST (pick one)

Netlify (easiest)
  1. Go to app.netlify.com/drop
  2. Drag the whole qoraflow-website folder onto the page
  3. In Site settings > Domain management, add qoraflow.com

Vercel
  1. Go to vercel.com/new and choose "Deploy" with this folder (or push it to a GitHub repo and import it)
  2. Framework preset: "Other". No build command. Output directory: the folder itself
  3. In Project settings > Domains, add qoraflow.com

Any web host / cPanel
  Upload all files to the public_html (or www) folder.

BEFORE YOU GO LIVE
  - Fill in the [bracketed] placeholders: Privacy Policy and Terms
    (company name, address, effective date, retention period, etc.)
  - The contact form currently opens the visitor's email app addressed to hello@qoraflow.com.
    To receive submissions directly, connect it to a form service such as Formspree.
  - Have an attorney review the Privacy Policy and Terms of Service.

VOICE AGENT ("Talk to Qoraflow")
  How it works
    - qoraflow.com is a Cloudflare Worker ("qoraflow-website") that serves these files. wrangler.jsonc configures it;
      every push to main is built and deployed by Cloudflare automatically.
    - worker/index.js handles /api/* and serves everything else from the site files. .assetsignore keeps the code,
      prompt and config from being served publicly.
    - The talk screen in index.html starts a Retell web call (retell-client-js-sdk 3.0.4 from jsDelivr). The SDK's
      create-web-call request goes to /api/web-call (worker/web-call.js), which adds the secret Retell key and forwards
      it to Retell /v3/create-web-call. The key never reaches the browser.
    - During a call, /api/call-events (worker/call-events.js) follows Retell's live transcript server-side and tells
      the page when the agent mentions Contact us, so the Contact us button glows twice.
    - Before the first call after a page load, visitors enter their name and phone number. Both are saved on each call
      in Retell > Call History (call metadata), so you can follow up. Qora greets them by name.
  Settings
    RETELL_API_KEY   Worker secret. Set or change it with:  npx wrangler secret put RETELL_API_KEY --name qoraflow-website
    RETELL_AGENT_ID  in wrangler.jsonc ("vars"); also saved in voice-agent/retell-ids.json
  Change what the agent says
    1. Edit voice-agent/prompt.md
    2. export RETELL_API_KEY=...   then   node voice-agent/setup-retell.mjs
       (updates the same agent; list voices with --voices, switch with RETELL_VOICE_ID=...)
  Costs and limits
    - Retell dashboard > Billing: keep a monthly budget cap. Calls pause when it is reached.
    - Calls end after 4 minutes, after 20 seconds of silence, or when the visitor leaves.
    - Optional: Cloudflare > Security > WAF > Rate limiting on /api/web-call (about 5 requests per 10 minutes per IP).
  Test locally
    Put RETELL_API_KEY=... and RETELL_AGENT_ID=... in a file named .dev.vars (git-ignored), then run
      npx wrangler dev --port 8790
    and open http://localhost:8790
