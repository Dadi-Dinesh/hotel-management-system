/**
 * WhatsApp Provider Abstraction — Two-Sided Platform Architecture.
 *
 * Pluggable providers:
 *   - Meta WhatsApp Cloud API (Graph API)
 *   - Twilio WhatsApp Messaging API
 *   - Gupshup Enterprise WhatsApp API
 *   - NullProvider (safe local/queue fallback when no credentials are configured)
 *
 * Every provider implements the interface:
 *   { name: string, isConfigured(): boolean, send({ to, message }): Promise<void> }
 *
 * If no provider credentials exist in the environment, messages are automatically
 * queued in the database (`WhatsAppMessage` table) for manual resending from the
 * Platform Admin Dashboard.
 */

const NullProvider = {
  name: "none",
  isConfigured: () => false,
  async send() {
    throw new Error("No WhatsApp provider configured.");
  },
};

const MetaWhatsAppProvider = {
  name: "meta",
  isConfigured: () => Boolean(process.env.WHATSAPP_META_TOKEN && process.env.WHATSAPP_META_PHONE_ID),
  async send({ to, message }) {
    const cleanPhone = String(to).replace(/[^0-9]/g, "");
    const phoneId = process.env.WHATSAPP_META_PHONE_ID;
    const token = process.env.WHATSAPP_META_TOKEN;

    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "text",
        text: { preview_url: true, body: message },
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`Meta WhatsApp API error (${res.status}): ${errorData?.error?.message || res.statusText}`);
    }
  },
};

const TwilioWhatsAppProvider = {
  name: "twilio",
  isConfigured: () => Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_NUMBER),
  async send({ to, message }) {
    const cleanPhone = String(to).replace(/[^0-9+]/g, "");
    const formattedTo = cleanPhone.startsWith("+") ? `whatsapp:${cleanPhone}` : `whatsapp:+${cleanPhone}`;
    const formattedFrom = process.env.TWILIO_WHATSAPP_NUMBER.startsWith("whatsapp:")
      ? process.env.TWILIO_WHATSAPP_NUMBER
      : `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    const bodyParams = new URLSearchParams({
      From: formattedFrom,
      To: formattedTo,
      Body: message,
    });

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: bodyParams.toString(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Twilio WhatsApp error (${res.status}): ${err?.message || res.statusText}`);
    }
  },
};

const GupshupWhatsAppProvider = {
  name: "gupshup",
  isConfigured: () => Boolean(process.env.GUPSHUP_API_KEY && process.env.GUPSHUP_APP_NAME),
  async send({ to, message }) {
    const cleanPhone = String(to).replace(/[^0-9]/g, "");
    const apiKey = process.env.GUPSHUP_API_KEY;
    const appName = process.env.GUPSHUP_APP_NAME;

    const params = new URLSearchParams({
      channel: "whatsapp",
      source: process.env.GUPSHUP_SOURCE_NUMBER || "917834811114",
      destination: cleanPhone,
      message: JSON.stringify({ type: "text", text: message }),
      "src.name": appName,
    });

    const res = await fetch("https://api.gupshup.io/sm/api/v1/msg", {
      method: "POST",
      headers: {
        apikey: apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Gupshup error (${res.status}): ${err?.message || res.statusText}`);
    }
  },
};

const PROVIDERS = [
  MetaWhatsAppProvider,
  TwilioWhatsAppProvider,
  GupshupWhatsAppProvider,
  NullProvider,
];

/**
 * Resolves the provider:
 * 1. Honors explicit WHATSAPP_PROVIDER env var (meta / twilio / gupshup) if configured.
 * 2. Otherwise auto-detects the first provider with credentials.
 * 3. Falls back to NullProvider.
 */
function resolveProvider() {
  const preferred = (process.env.WHATSAPP_PROVIDER || "").toLowerCase().trim();
  if (preferred) {
    const match = PROVIDERS.find((p) => p.name === preferred && p.isConfigured());
    if (match) return match;
  }
  return PROVIDERS.find((p) => p.isConfigured()) || NullProvider;
}

module.exports = {
  resolveProvider,
  NullProvider,
  MetaWhatsAppProvider,
  TwilioWhatsAppProvider,
  GupshupWhatsAppProvider,
};
