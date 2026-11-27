// Branded email templates for the contact form (Qoraflow brand kit: black ground,
// orange #FF9F1C, sky blue #3DB8FF, Manrope). Built with email-safe tables and
// inline styles so they render in Gmail, Outlook, Apple Mail and Zoho Mail.
// Images live at qoraflow.com/email/ (rebuild them with email-assets/build.sh).

const OR = "#FF9F1C";
const BL = "#3DB8FF";
const INK = "#FFFFFF";
const DIM = "#AEB8CA";
const PANEL = "#111114";
const LINE = "#24242B";
const FONT = "Manrope, 'Segoe UI', Helvetica, Arial, sans-serif";

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// Only a plain first name ever goes into the customer email: letters, apostrophes
// and hyphens, max 24 characters. Anything else becomes "there".
export function safeFirstName(fullName) {
  const first = String(fullName || "").trim().split(/\s+/)[0] || "";
  if (!/^[\p{L}][\p{L}'’-]{0,23}$/u.test(first)) return "";
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function shell({ title, preheader, body, assets }) {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escapeHtml(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">
<style>
  body { margin: 0; padding: 0; background: #000000; }
  a { color: ${BL}; }
  @media (max-width: 620px) {
    .wrap { width: 100% !important; }
    .px { padding-left: 22px !important; padding-right: 22px !important; }
    .h1 { font-size: 30px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#000000;" bgcolor="#000000">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#000000;">${escapeHtml(preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#000000" style="background:#000000;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#000000;border:1px solid ${LINE};border-radius:20px;overflow:hidden;" bgcolor="#000000">
<tr><td class="px" style="padding:26px 36px 18px 36px;" bgcolor="#000000">
<img src="${assets}/logo-lockup.png" width="141" height="44" alt="Qoraflow" style="display:block;border:0;width:141px;height:44px;">
</td></tr>
${body}
</table>
</td></tr>
</table>
</body>
</html>`;
}

function button(href, label, bg, color) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${bg}" style="border-radius:999px;background:${bg};">
<a href="${escapeHtml(href)}" style="display:inline-block;padding:15px 30px;font-family:${FONT};font-size:16px;font-weight:800;color:${color};text-decoration:none;border-radius:999px;">${label}</a>
</td></tr></table>`;
}

function step(num, color, title, text) {
  return `<tr>
<td width="44" valign="top" style="padding:0 14px 18px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="34" height="34" align="center" valign="middle" style="width:34px;height:34px;border-radius:17px;border:2px solid ${color};font-family:${FONT};font-size:15px;font-weight:800;color:${color};">${num}</td></tr></table>
</td>
<td valign="top" style="padding:0 0 18px 0;font-family:${FONT};">
<div style="font-size:16px;font-weight:800;color:${INK};line-height:1.4;">${title}</div>
<div style="font-size:15px;color:${DIM};line-height:1.6;">${text}</div>
</td>
</tr>`;
}

// ---------- Email to the customer ----------
export function customerConfirmation({ firstName, assets, siteUrl }) {
  const hi = firstName ? `You're in, ${escapeHtml(firstName)}!` : "You're in!";
  const subject = firstName ? `You're in, ${firstName}! Your free Qoraflow trial is on its way` : "You're in! Your free Qoraflow trial is on its way";
  const preheader = "Thanks for reaching out. We'll be in touch within 2 business days to start building your voice agent.";

  const body = `
<tr><td style="padding:0;" bgcolor="#000000"><img src="${assets}/hero.jpg" width="600" alt="" style="display:block;border:0;width:100%;max-width:600px;height:auto;"></td></tr>
<tr><td class="px" style="padding:8px 36px 0 36px;font-family:${FONT};" bgcolor="#000000">
<div style="font-size:13px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${BL};">Request received</div>
<h1 class="h1" style="margin:10px 0 14px 0;font-size:36px;line-height:1.1;font-weight:800;color:${INK};">${hi}<br><span style="color:${OR};">Your free 14 day trial is on its way.</span></h1>
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.7;color:#D5DEEC;">Thank you for reaching out to Qoraflow. We're genuinely glad you're here.</p>
<p style="margin:0 0 26px 0;font-size:16px;line-height:1.7;color:#D5DEEC;">Your request just landed with our team, and we're already looking forward to it. We're putting real care into building you the best voice agent out there: one that sounds natural, knows your business inside out, and never lets a call go unanswered.</p>
</td></tr>

<tr><td class="px" style="padding:0 36px;" bgcolor="#000000">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PANEL}" style="background:${PANEL};border:1px solid ${LINE};border-radius:18px;">
<tr><td style="padding:24px 24px 8px 24px;font-family:${FONT};">
<div style="font-size:13px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${DIM};margin-bottom:18px;">What happens next</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${step(1, BL, "Today", "Your request is safely with our team.")}
${step(2, OR, "Within 2 business days", "We reach out to learn how your business runs: your hours, your services, and the questions your callers ask most.")}
${step(3, BL, "Then we build", "We set up and fine tune your voice agent around your business, so it's ready to answer every call.")}
</table>
</td></tr>
</table>
</td></tr>

<tr><td class="px" style="padding:30px 36px 8px 36px;font-family:${FONT};" bgcolor="#000000">
<p style="margin:0 0 18px 0;font-size:16px;line-height:1.7;color:#D5DEEC;"><b style="color:${INK};">In the meantime,</b> take a look around our website. You can even talk to Qora, our own AI voice agent, and hear exactly what your callers will experience.</p>
${button(siteUrl, "Explore Qoraflow", OR, "#000000")}
<p style="margin:26px 0 0 0;font-size:16px;line-height:1.7;color:#D5DEEC;">Got a question before then? Just reply to this email. It comes straight to us.</p>
<p style="margin:22px 0 0 0;font-size:16px;line-height:1.6;color:#D5DEEC;">Warmly,<br><b style="color:${INK};font-size:17px;">The Qoraflow team</b></p>
</td></tr>

<tr><td class="px" style="padding:26px 36px 8px 36px;" bgcolor="#000000">
<img src="${assets}/card-front.jpg" width="528" alt="Anudeep Cherukupalli, Founder, Qoraflow. contact@qoraflow.com" style="display:block;border:0;width:100%;max-width:528px;height:auto;border-radius:14px;">
</td></tr>

<tr><td class="px" style="padding:22px 36px 30px 36px;font-family:${FONT};" bgcolor="#000000">
<div style="height:1px;line-height:1px;background:${LINE};margin-bottom:18px;">&nbsp;</div>
<div style="font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${DIM};">Every call answered. Every booking made.</div>
<div style="font-size:12px;line-height:1.6;color:#6E7787;margin-top:8px;">You're receiving this because you requested a free trial with Qoraflow. If that wasn't you, simply ignore this email.</div>
</td></tr>`;

  const text = [
    firstName ? `You're in, ${firstName}! Your free 14 day trial is on its way.` : "You're in! Your free 14 day trial is on its way.",
    "",
    "Thank you for reaching out to Qoraflow. We're genuinely glad you're here.",
    "",
    "Your request just landed with our team, and we're already looking forward to it. We're putting real care into building you the best voice agent out there: one that sounds natural, knows your business inside out, and never lets a call go unanswered.",
    "",
    "WHAT HAPPENS NEXT",
    "1. Today: your request is safely with our team.",
    "2. Within 2 business days: we reach out to learn how your business runs: your hours, your services, and the questions your callers ask most.",
    "3. Then we build: we set up and fine tune your voice agent around your business, so it's ready to answer every call.",
    "",
    "In the meantime, take a look around our website. You can even talk to Qora, our own AI voice agent, and hear exactly what your callers will experience.",
    `Explore Qoraflow: ${siteUrl}`,
    "",
    "Got a question before then? Just reply to this email. It comes straight to us.",
    "",
    "Warmly,",
    "The Qoraflow team",
    "",
    "Anudeep Cherukupalli, Founder, Qoraflow",
    "contact@qoraflow.com",
    "",
    "Every call answered. Every booking made.",
  ].join("\n");

  return { subject, html: shell({ title: subject, preheader, body, assets }), text };
}

// ---------- Email to the Qoraflow team (new lead) ----------
export function leadNotification({ f, assets }) {
  const subject = `New trial request: ${f.business}`.slice(0, 200);
  const preheader = `${f.name} from ${f.business} wants a free trial.`;
  const tel = f.phone.replace(/[^\d+]/g, "");
  const row = (label, value, link) => `<tr>
<td valign="top" style="padding:10px 0;border-bottom:1px solid ${LINE};font-family:${FONT};font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:${BL};width:130px;">${label}</td>
<td valign="top" style="padding:10px 0;border-bottom:1px solid ${LINE};font-family:${FONT};font-size:16px;font-weight:600;color:${INK};">${link ? `<a href="${escapeHtml(link)}" style="color:${INK};text-decoration:none;">${escapeHtml(value)}</a>` : escapeHtml(value)}</td>
</tr>`;

  const body = `
<tr><td class="px" style="padding:8px 36px 0 36px;font-family:${FONT};" bgcolor="#000000">
<div style="font-size:13px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${OR};">New lead · Website</div>
<h1 class="h1" style="margin:10px 0 6px 0;font-size:32px;line-height:1.15;font-weight:800;color:${INK};">New trial request</h1>
<p style="margin:0 0 22px 0;font-size:16px;line-height:1.6;color:${DIM};">${escapeHtml(f.name)} from <b style="color:${INK};">${escapeHtml(f.business)}</b> wants a free 14 day trial. They've been told we'll reach out within 2 business days.</p>
</td></tr>
<tr><td class="px" style="padding:0 36px;" bgcolor="#000000">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PANEL}" style="background:${PANEL};border:1px solid ${LINE};border-radius:18px;">
<tr><td style="padding:10px 24px 18px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${row("Name", f.name)}
${row("Business", f.business)}
${row("Phone", f.phone, tel ? `tel:${tel}` : "")}
${row("Email", f.email, `mailto:${f.email}`)}
</table>
<div style="font-family:${FONT};font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:${BL};margin:18px 0 8px 0;">About the business</div>
<div style="font-family:${FONT};font-size:16px;line-height:1.7;color:#D5DEEC;">${escapeHtml(f.message).replace(/\n/g, "<br>")}</div>
</td></tr>
</table>
</td></tr>
<tr><td class="px" style="padding:26px 36px 32px 36px;" bgcolor="#000000">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
${tel ? `<td style="padding:0 12px 10px 0;">${button(`tel:${tel}`, "Call now", OR, "#000000")}</td>` : ""}
<td style="padding:0 0 10px 0;">${button(`mailto:${f.email}`, "Email them", BL, "#000000")}</td>
</tr></table>
<p style="margin:14px 0 0 0;font-family:${FONT};font-size:13px;line-height:1.6;color:#6E7787;">Or just hit Reply: it goes straight to ${escapeHtml(f.email)}.</p>
</td></tr>`;

  const text = [
    "New trial request from qoraflow.com",
    "",
    `Name: ${f.name}`,
    `Business: ${f.business}`,
    `Phone: ${f.phone}`,
    `Email: ${f.email}`,
    "",
    "About the business:",
    f.message,
    "",
    "Reply to this email to answer them directly.",
  ].join("\n");

  return { subject, html: shell({ title: subject, preheader, body, assets }), text };
}
