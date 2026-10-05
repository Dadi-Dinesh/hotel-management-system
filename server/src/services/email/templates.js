/**
 * templates — reusable HTML email templates (Phase 11 "subscription
 * foundation" prep). Each function returns { subject, html } and is pure —
 * no network calls, no provider SDK. Nothing here actually sends mail yet;
 * see emailService.js for the (currently no-op) send hook these plug into.
 */
const { wrapEmail, escapeHtml } = require("./emailLayout");

function welcomeEmail({ adminName, restaurantName }) {
  return {
    subject: `Welcome to ServeSync, ${adminName}!`,
    html: wrapEmail({
      title: "Welcome to ServeSync",
      preheader: `${restaurantName} is now live on ServeSync.`,
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi ${escapeHtml(adminName)},</p>
        <p style="margin:0 0 16px;">Welcome to ServeSync! <strong>${escapeHtml(restaurantName)}</strong> is now set up and ready to take orders — QR ordering, live kitchen updates, and billing are all active.</p>
        <p style="margin:0;">Your 14-day free trial has started. Explore your dashboard to print your table QR codes and invite your staff.</p>
      `,
      ctaLabel: "Open Dashboard",
      ctaUrl: "{{dashboardUrl}}",
    }),
  };
}

function restaurantCreatedEmail({ adminName, restaurantName, slug, tableCount }) {
  return {
    subject: `${restaurantName} is live on ServeSync`,
    html: wrapEmail({
      title: "Restaurant Created",
      preheader: `${tableCount} tables created with QR codes ready.`,
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi ${escapeHtml(adminName)},</p>
        <p style="margin:0 0 16px;"><strong>${escapeHtml(restaurantName)}</strong> has been created with ${tableCount} table${tableCount === 1 ? "" : "s"}, each with its own secure QR code ready to print.</p>
        <p style="margin:0;">Your restaurant's page: <strong>servesync.app/restaurant/${escapeHtml(slug)}</strong></p>
      `,
      ctaLabel: "Print Your QR Codes",
      ctaUrl: "{{qrManagementUrl}}",
    }),
  };
}

function trialReminderEmail({ adminName, restaurantName, daysRemaining }) {
  return {
    subject: daysRemaining <= 1 ? `Your ServeSync trial ends tomorrow` : `${daysRemaining} days left in your ServeSync trial`,
    html: wrapEmail({
      title: "Trial Ending Soon",
      preheader: `${restaurantName}'s free trial ends in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}.`,
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi ${escapeHtml(adminName)},</p>
        <p style="margin:0 0 16px;">Your free trial for <strong>${escapeHtml(restaurantName)}</strong> ends in <strong>${daysRemaining} day${daysRemaining === 1 ? "" : "s"}</strong>.</p>
        <p style="margin:0;">Choose a plan to keep QR ordering, kitchen display, and billing running without interruption.</p>
      `,
      ctaLabel: "View Plans",
      ctaUrl: "{{pricingUrl}}",
    }),
  };
}

function inviteWaiterEmail({ inviteeName, restaurantName, role, inviteCode }) {
  return {
    subject: `You've been invited to join ${restaurantName} on ServeSync`,
    html: wrapEmail({
      title: "Staff Invite",
      preheader: `Join ${restaurantName} as ${role} on ServeSync.`,
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi ${escapeHtml(inviteeName)},</p>
        <p style="margin:0 0 16px;">You've been invited to join <strong>${escapeHtml(restaurantName)}</strong> on ServeSync as <strong>${escapeHtml(role)}</strong>.</p>
        <p style="margin:0 0 16px;">Your invite code: <strong style="letter-spacing:2px;">${escapeHtml(inviteCode)}</strong></p>
        <p style="margin:0;">Use the link below or enter the code to set your password and get started.</p>
      `,
      ctaLabel: "Accept Invite",
      ctaUrl: "{{inviteUrl}}",
    }),
  };
}

/** Sent immediately on submission — confirms receipt, sets expectations. No credentials exist yet. */
function applicationReceivedEmail({ ownerName, restaurantName }) {
  return {
    subject: "We've received your ServeSync application",
    html: wrapEmail({
      title: "Application Received",
      preheader: `${restaurantName}'s application is in review.`,
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi ${escapeHtml(ownerName)},</p>
        <p style="margin:0 0 16px;">Thank you for applying! We've received your application for <strong>${escapeHtml(restaurantName)}</strong>.</p>
        <p style="margin:0 0 16px;">Our team will verify your restaurant. Once approved, your complete QR Kit and dashboard access will be sent to this email and your WhatsApp number.</p>
        <p style="margin:0;">You can check your application status anytime using the link below.</p>
      `,
      ctaLabel: "Check Application Status",
      ctaUrl: "{{statusUrl}}",
    }),
  };
}

/**
 * Sent on approval — the one email that carries the temp password. Callers
 * must never log this template's rendered HTML (it contains a live
 * credential); logging is fine for every other template here.
 */
function applicationApprovedEmail({ ownerName, restaurantName, loginEmail, tempPassword, dashboardUrl, qrKitUrl }) {
  return {
    subject: "Your ServeSync Restaurant is Ready!",
    html: wrapEmail({
      title: "Application Approved",
      preheader: `${restaurantName} is now live on ServeSync.`,
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi ${escapeHtml(ownerName)},</p>
        <p style="margin:0 0 16px;">Congratulations! <strong>${escapeHtml(restaurantName)}</strong> has been approved and is now live on ServeSync — QR ordering, live kitchen updates, and billing are all active.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:#FFF8E7;border:1px solid #EADFC8;border-radius:10px;">
          <tr><td style="padding:16px 20px;">
            <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#78716C;">Login Details</p>
            <p style="margin:0 0 4px;"><strong>Email:</strong> ${escapeHtml(loginEmail)}</p>
            <p style="margin:0;"><strong>Temporary Password:</strong> <code style="background:#fff;padding:2px 8px;border-radius:4px;border:1px solid #EADFC8;">${escapeHtml(tempPassword)}</code></p>
          </td></tr>
        </table>
        <p style="margin:0 0 16px;">Please log in and change this password from your account settings as soon as possible.</p>
        <p style="margin:0 0 16px;">Your <a href="${escapeHtml(qrKitUrl)}" style="color:#E8891C;">complete QR Kit</a> — welcome letter, table QR posters, and setup guides — is ready to download.</p>
        <p style="margin:0;">Questions? Reply to this email and our team will help.</p>
      `,
      ctaLabel: "Open Dashboard",
      ctaUrl: dashboardUrl,
    }),
  };
}

/**
 * Sent by "Send Credentials" on the Platform Admin side — the role logins
 * (Restaurant Admin, Captain, Kitchen) for one restaurant. Carries live
 * temporary passwords: never log the rendered HTML.
 */
function clientCredentialsEmail({ ownerName, restaurantName, accounts, loginUrl }) {
  const ROLE_LABELS = { ADMIN: "Restaurant Admin", CAPTAIN: "Captain", KITCHEN: "Kitchen" };
  const rows = accounts
    .map(
      (a) => `<tr><td style="padding:8px 20px;border-top:1px solid #EADFC8;">
        <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#78716C;">${escapeHtml(ROLE_LABELS[a.role] || a.role)}</p>
        <p style="margin:0 0 2px;"><strong>Login:</strong> ${escapeHtml(a.email)}</p>
        <p style="margin:0;"><strong>Temporary Password:</strong> <code style="background:#fff;padding:2px 8px;border-radius:4px;border:1px solid #EADFC8;">${escapeHtml(a.tempPassword)}</code></p>
      </td></tr>`
    )
    .join("");
  return {
    subject: `Your ServeSync logins for ${restaurantName}`,
    html: wrapEmail({
      title: "Your ServeSync Access",
      preheader: `Restaurant Admin, Captain and Kitchen logins for ${restaurantName}.`,
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi ${escapeHtml(ownerName)},</p>
        <p style="margin:0 0 16px;">Here are the ServeSync logins for <strong>${escapeHtml(restaurantName)}</strong>. Each role signs in from the same login page.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:#FFF8E7;border:1px solid #EADFC8;border-radius:10px;">${rows}</table>
        <p style="margin:0;">Please sign in and change these temporary passwords as soon as possible.</p>
      `,
      ctaLabel: "Sign In",
      ctaUrl: loginUrl,
    }),
  };
}

/** Sent on rejection — polite, includes the reason and reapply guidance. */
function applicationRejectedEmail({ ownerName, restaurantName, rejectionReason }) {
  return {
    subject: "An update on your ServeSync application",
    html: wrapEmail({
      title: "Application Update",
      preheader: `An update on ${restaurantName}'s ServeSync application.`,
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi ${escapeHtml(ownerName)},</p>
        <p style="margin:0 0 16px;">Thank you for your interest in ServeSync. After reviewing your application for <strong>${escapeHtml(restaurantName)}</strong>, we're not able to approve it at this time.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:#FFF8E7;border:1px solid #EADFC8;border-radius:10px;">
          <tr><td style="padding:16px 20px;">
            <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#78716C;">Reason</p>
            <p style="margin:0;">${escapeHtml(rejectionReason)}</p>
          </td></tr>
        </table>
        <p style="margin:0 0 16px;">You're welcome to submit a new application once this is addressed — we review every application individually.</p>
        <p style="margin:0;">In the meantime, feel free to explore our live demo restaurant to see the full platform in action.</p>
      `,
      ctaLabel: "Explore the Live Demo",
      ctaUrl: "{{demoUrl}}",
    }),
  };
}

module.exports = {
  welcomeEmail,
  restaurantCreatedEmail,
  trialReminderEmail,
  inviteWaiterEmail,
  applicationReceivedEmail,
  applicationApprovedEmail,
  applicationRejectedEmail,
  clientCredentialsEmail,
};
