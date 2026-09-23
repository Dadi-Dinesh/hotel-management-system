/**
 * Canonical public site URL — used by sitemap.ts, robots.ts, and any
 * absolute-URL metadata. Prefers NEXT_PUBLIC_SITE_URL so this matches
 * wherever the client is actually deployed; falls back to the known
 * production Vercel URL (see server/.env.example's CLIENT_URL) so SEO
 * output is still correct without extra configuration.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://hotel-management-system-psi-kohl.vercel.app";
