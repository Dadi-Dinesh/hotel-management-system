/**
 * Central branding configuration.
 *
 * ServeSync is the platform; each restaurant tenant supplies its own name/
 * logo (as of Phase 6, real tenants — see RestaurantContext). DEMO_RESTAURANT
 * describes the seeded demo restaurant ("nookambika" slug on the backend) and
 * is used as the client-side fallback wherever no live restaurant context is
 * available yet (e.g. before RestaurantContext has loaded).
 */

export const PLATFORM_NAME = "ServeSync";
export const PLATFORM_TAGLINE = "Smart QR Restaurant Management Platform";
export const PLATFORM_SUBTITLE = "Run Your Restaurant Smarter";
export const PLATFORM_POWERED_BY = "Powered by ServeSync";
export const PLATFORM_FOOTER_COPYRIGHT = "© 2026 ServeSync — Smart QR Restaurant Management Platform";
export const DEMO_BADGE_TEXT = "Live Demo • Sree Nookambika Family Dhaba";
export const PLATFORM_LOGO = "/servesync-logo.svg";

export const DEMO_RESTAURANT = {
  name: "Sree Nookambika Family Dhaba",
  shortName: "Nookambika Dhaba",
  slug: "nookambika",
  cuisine: "Authentic Indian Cuisine",
  logo: "/dhaba-logo.jpg",
};

