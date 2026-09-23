/**
 * emailService — the single send hook every part of the app should call
 * through, once a real provider (SES, Postmark, Resend, etc.) is wired up.
 *
 * Phase 11 explicitly scopes this to "HTML templates only... do not
 * integrate an email provider yet." So sendEmail() is intentionally a
 * no-op that only logs — it exists so the calling code (future invite/
 * onboarding/trial-reminder flows) can be written against a stable
 * interface now and only this one function needs to change later.
 */
/**
 * @param {{ to: string, subject: string, html: string }} message
 */
async function sendEmail({ to, subject, html }) {
  console.log(`✉️  [EmailService] (not sent — no provider configured) Would send "${subject}" to ${to} (${html?.length || 0} chars of HTML)`);
  return { sent: false, reason: "No email provider configured yet." };
}

module.exports = { sendEmail };
