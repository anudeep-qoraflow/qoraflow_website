QORAFLOW WEBSITE — READY TO HOST
================================

Files
  index.html     Home page (intro, AI core, features, how it works, app, pricing, FAQ, contact, talk mode)
  about.html     About us
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
  - Fill in the [bracketed] placeholders: FAQ setup time, Privacy Policy and Terms
    (company name, address, effective date, retention period, etc.)
  - The contact form currently opens the visitor's email app addressed to hello@qoraflow.com.
    To receive submissions directly, connect it to a form service such as Formspree.
  - "Log in" links point to https://app.qoraflow.com
  - Have an attorney review the Privacy Policy and Terms of Service.
