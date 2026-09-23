/**
 * emailLayout — shared HTML shell every template wraps its content in, so
 * every ServeSync email looks like it came from the same product. Plain
 * inline-styled table-based HTML (the only style that renders consistently
 * across real email clients — no external stylesheet, no flexbox/grid).
 */
const BRAND = {
  brown: "#3D2710",
  orange: "#E8891C",
  cream: "#FFFDF7",
  creamCard: "#FFF8E7",
  textMuted: "#78716C",
};

function wrapEmail({ preheader = "", title, bodyHtml, ctaLabel, ctaUrl }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.cream};font-family:Georgia,'Times New Roman',serif;">
  <span style="display:none;font-size:1px;color:${BRAND.cream};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.cream};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border:2px solid ${BRAND.brown};border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:${BRAND.brown};padding:24px 32px;text-align:center;">
              <span style="color:${BRAND.orange};font-size:22px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">ServeSync</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:${BRAND.brown};font-size:15px;line-height:1.6;">
              ${bodyHtml}
              ${
                ctaLabel && ctaUrl
                  ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                      <tr><td style="border-radius:10px;background:${BRAND.orange};">
                        <a href="${ctaUrl}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:1px;border-radius:10px;">${escapeHtml(ctaLabel)}</a>
                      </td></tr>
                    </table>`
                  : ""
              }
            </td>
          </tr>
          <tr>
            <td style="background:${BRAND.creamCard};padding:20px 32px;text-align:center;border-top:1px solid #EADFC8;">
              <p style="margin:0;color:${BRAND.textMuted};font-size:11px;text-transform:uppercase;letter-spacing:1px;">
                Sent by ServeSync — Smart QR Restaurant Management Platform
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

module.exports = { wrapEmail, escapeHtml, BRAND };
