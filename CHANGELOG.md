# Changelog — qoraflow.com

Every change that goes live on the website, newest first.

## v1.3.1 — 27 Nov 2026

- **Business card removed from the customer confirmation email.** The name and title lines are also gone from the plain-text version. The card image is no longer on the website.

## v1.3.0 — 27 Nov 2026

- **Customers get a confirmation email.** After they send the contact form, visitors receive a branded "You're in!" email in the Qoraflow style. It has:
  - a hero image,
  - the three "What happens next" steps (we reach out within 2 business days),
  - an Explore Qoraflow button,
  - Anudeep's business card.
- **Safety guards on the confirmation:**
  - fixed wording, with only a cleaned first name added,
  - at most one per email address per day,
  - sent only after the lead reaches us.
- **Redesigned lead email** to contact@qoraflow.com, in the same style, with a details panel and Call now / Email them buttons.
- **Email images** are served from qoraflow.com/email/ and can be rebuilt with `email-assets/build.sh`.

## v1.2.1 — 27 Nov 2026

- **Fix:** the contact form's bot check showed "Invalid sitekey", so nobody could send the form. The wrong public Turnstile key had been typed into the page (one extra letter). It's now corrected.

## v1.2.0 — 27 Nov 2026

- **The contact form sends directly.** Pressing "Request a callback" now emails the details to contact@qoraflow.com (through Resend). The visitor's email app never opens. Replying to that email in Zoho goes straight to the visitor.
- **Spam protection on the form:**
  - a Cloudflare Turnstile bot check,
  - a hidden anti-spam field,
  - at most 3 sends per visitor per hour.
- **Every "Contact" link on the About, Privacy, Terms and Refund pages** opens the contact form on the homepage instead of the email app.
- **New messages:** "Thanks, we got it!" after sending, and a friendly message with contact@qoraflow.com if something goes wrong.

## v1.1.0 — 27 Nov 2026

- **One contact email everywhere:** the About, Privacy, Terms and Refund pages now use contact@qoraflow.com, matching the homepage. They used hello@qoraflow.com before.
- **New Refund Policy page** at qoraflow.com/refund. It restates the billing, cancellation and refund rules from the Terms in plain words. Every footer links to it, and so does Terms section 5.

## v1.0.0 — before 27 Nov 2026

- First live version: Home, About, Privacy and Terms pages, plus the "Talk to Qoraflow" live demo.
