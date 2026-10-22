/**
 * tableCode.js
 * Utilities for extracting and validating table identifiers from customer input,
 * QR scanner text, or deep-link URLs.
 */

/**
 * Extracts a normalized table code (e.g. "T01") from input text or scanned QR URL.
 * Supports:
 * - Table numbers: "1" -> "T01", "12" -> "T12"
 * - Table codes: "t1" -> "T01", "T01" -> "T01", "T12" -> "T12"
 * - Scanned URLs: "https://servesync.in/table/1" -> "T01", ".../table/T01" -> "T01"
 * - Custom alphanumeric table codes: "VIP-1" -> "VIP-1"
 *
 * @param {string} rawInput
 * @returns {string|null} Normalized table code or null if invalid
 */
export function extractTableCode(rawInput) {
  if (!rawInput || typeof rawInput !== "string") return null;
  const text = rawInput.trim();
  if (!text) return null;

  // 1. Check for URL containing /table/:code
  const urlMatch = text.match(/\/table\/([A-Za-z0-9-_]+)/i);
  if (urlMatch && urlMatch[1]) {
    const raw = urlMatch[1].toUpperCase();
    if (/^\d+$/.test(raw)) {
      const num = parseInt(raw, 10);
      if (num >= 1 && num <= 12) return `T${String(num).padStart(2, "0")}`;
    }
    return raw;
  }

  // 2. Numeric-only input (e.g. "1" or "01")
  if (/^\d+$/.test(text)) {
    const num = parseInt(text, 10);
    if (num >= 1 && num <= 12) return `T${String(num).padStart(2, "0")}`;
  }

  // 3. T + digit(s) (e.g. "T1", "t01", "T12")
  const codeMatch = text.match(/^T(\d+)$/i);
  if (codeMatch && codeMatch[1]) {
    const num = parseInt(codeMatch[1], 10);
    if (num >= 1 && num <= 12) return `T${String(num).padStart(2, "0")}`;
  }

  // 4. Custom valid slug/code (e.g., "VIP-1")
  if (/^[A-Z0-9-_]{2,20}$/i.test(text) && !/^\d+$/.test(text)) {
    return text.toUpperCase();
  }

  return null;
}
