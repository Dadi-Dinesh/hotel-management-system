import type { MetadataRoute } from "next";
import { SITE_URL } from "./lib/siteUrl";

/**
 * Only the public marketing pages are meant to be crawled. Every staff
 * portal, per-table customer session route, and API-adjacent path is
 * disallowed — none of that content is useful in search results, and
 * table/session URLs are effectively infinite.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/features", "/pricing", "/demo", "/faq", "/contact", "/privacy", "/terms"],
      disallow: ["/admin/", "/captain/", "/kitchen/", "/table/", "/restaurant/", "/onboard", "/invite/", "/offline"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
