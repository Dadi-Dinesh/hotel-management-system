/**
 * whatsappService — the single send hook every part of the app should call
 * through, mirroring emailService.js's exact philosophy: a stable interface
 * now, real delivery once a provider is configured.
 *
 * Unlike email (a silent no-op log line), the brief asks WhatsApp to queue
 * and allow manual resend — so every attempt is persisted as a
 * WhatsAppMessage row, regardless of outcome. sendWhatsApp() never throws;
 * a delivery failure just leaves the row in a resendable state.
 */
const prisma = require("../../config/db");
const logger = require("../../utils/logger");
const { resolveProvider } = require("./providers");

/**
 * @param {{ to: string, message: string, applicationId?: string }} params
 * @returns {Promise<{ id: string, status: "SENT"|"QUEUED"|"FAILED" }>}
 */
async function sendWhatsApp({ to, message, applicationId = null }) {
  const provider = resolveProvider();

  if (!provider.isConfigured()) {
    const queued = await prisma.whatsAppMessage.create({
      data: { to, message, applicationId, status: "QUEUED", provider: null },
    });
    logger.info(`[WhatsApp] No provider configured — queued message ${queued.id} to ${to}`);
    return { id: queued.id, status: "QUEUED" };
  }

  try {
    await provider.send({ to, message });
    const sent = await prisma.whatsAppMessage.create({
      data: { to, message, applicationId, status: "SENT", provider: provider.name, sentAt: new Date() },
    });
    return { id: sent.id, status: "SENT" };
  } catch (error) {
    const failed = await prisma.whatsAppMessage.create({
      data: { to, message, applicationId, status: "FAILED", provider: provider.name, error: error.message },
    });
    logger.warn(`[WhatsApp] Send failed via ${provider.name}: ${error.message}`);
    return { id: failed.id, status: "FAILED" };
  }
}

/** Retries a QUEUED or FAILED message — Platform Dashboard "resend" action. */
async function resendWhatsAppMessage(id) {
  const existing = await prisma.whatsAppMessage.findUnique({ where: { id } });
  if (!existing) throw new Error("Message not found.");

  const provider = resolveProvider();
  if (!provider.isConfigured()) {
    logger.info(`[WhatsApp] Resend requested for ${id} but still no provider configured — stays queued.`);
    return { id, status: "QUEUED" };
  }

  try {
    await provider.send({ to: existing.to, message: existing.message });
    const updated = await prisma.whatsAppMessage.update({
      where: { id },
      data: { status: "SENT", provider: provider.name, sentAt: new Date(), error: null },
    });
    return { id: updated.id, status: updated.status };
  } catch (error) {
    const updated = await prisma.whatsAppMessage.update({
      where: { id },
      data: { status: "FAILED", provider: provider.name, error: error.message },
    });
    return { id: updated.id, status: updated.status };
  }
}

module.exports = { sendWhatsApp, resendWhatsAppMessage };
