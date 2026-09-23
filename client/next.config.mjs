// Build-time env check (Phase 12, Part 10) — NEXT_PUBLIC_* vars are baked
// into the browser bundle at build time, so there's no client-side runtime
// "startup" moment to validate against the way server/src/config/validateEnv.js
// has. This module IS evaluated once, up front, every `next build`/`next dev`,
// so it's the closest equivalent. Every var here already has a safe
// production-URL fallback in app/lib/{api,socket,siteUrl}.js, so a missing
// var is never fatal — just worth flagging so a Docker/custom-env build
// doesn't silently point at production URLs by accident.
const RECOMMENDED_PUBLIC_VARS = [
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_SOCKET_URL",
  "NEXT_PUBLIC_SITE_URL",
];

const missingPublicVars = RECOMMENDED_PUBLIC_VARS.filter((key) => !process.env[key]);
if (missingPublicVars.length > 0) {
  console.warn(
    `⚠️  [ServeSync] Missing ${missingPublicVars.join(", ")} — falling back to production URLs baked into app/lib/{api,socket,siteUrl}.js. Set these to target a different backend (e.g. Docker/local).`
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  // Standalone output — a minimal, self-contained server bundle with only
  // the production dependencies actually used, copied into the Docker
  // image (see client/Dockerfile). Has no effect on `next dev`.
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
