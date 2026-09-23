import type { MetadataRoute } from "next";
import { PLATFORM_NAME, PLATFORM_TAGLINE } from "./lib/branding";

/**
 * Web App Manifest (Phase 9 — PWA). Next.js serves this at /manifest.webmanifest.
 * ServeSync is the installable shell; each tenant restaurant's own branding
 * (logo/colors) is applied inside the app itself, not the manifest — the
 * manifest describes the platform app, matching how the icon/theme-color
 * metadata already works (see app/icon.svg, layout.js).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${PLATFORM_NAME} — ${PLATFORM_TAGLINE}`,
    short_name: PLATFORM_NAME,
    description:
      "QR ordering, kitchen display, and restaurant management — install ServeSync for one-tap access to your dashboard, even with a spotty connection.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#FFFDF7",
    theme_color: "#3D2710",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Admin Dashboard",
        short_name: "Admin",
        description: "Open the restaurant admin dashboard",
        url: "/admin/dashboard",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Captain Dashboard",
        short_name: "Captain",
        description: "Open the waiter/captain dashboard",
        url: "/captain/dashboard",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Kitchen Display",
        short_name: "Kitchen",
        description: "Open the live kitchen display",
        url: "/kitchen",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
    categories: ["food", "business", "productivity"],
  };
}
