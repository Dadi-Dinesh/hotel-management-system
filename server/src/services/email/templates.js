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

module.exports = { welcomeEmail, restaurantCreatedEmail, trialReminderEmail, inviteWaiterEmail };
