# Security review

## Identity and tenant boundaries

- Staff logins compare bcrypt hashes and issue expiring JWTs. Protected HTTP routes look up the current account, role and restaurant state. Platform routes require the admin role and a null restaurant ID. Restaurant staff cannot use the tenant header to switch restaurants.
- Staff Socket.IO joins verify the current account, requested tenant and role. The broadcast adapter rechecks authorization before protected delivery. Existing tests cover foreign room joins, demotion, account deletion, reassignment, expired tokens and overlapping rooms.
- Guest capabilities are HS256 JWTs with a customer audience and an expiry. Access is checked against the restaurant, table, QR version and session. Order and closure events target a specific session so successive guests at one table receive separate updates. Legacy demo QR codes remain open by design. Give the public demo its own environment and keep real guest or order information out of it.
- Orders require a valid idempotency key. The server hashes normalized line items and relies on a unique index scoped to tenant and session. A committed request can be replayed, including after closure. A different payload with the same key conflicts. A missing column fails ordering closed. PostgreSQL behavior remains pending staging verification.
- Bill requests use a guarded state transition. New order writes lock the session before checking its status. Session creation locks the table. Foreign-key failures protect table and menu-item history during deletion.

## Configuration and exposure

- Production HTTP and Socket.IO share an explicit browser origin allowlist. Origin-less clients still need authorization for protected operations. Confirm the trusted reverse-proxy boundary before changing rate limiting. The current limiter is in-memory, per process and per IP.
- Uploads are bounded to 10 MB per file and filtered by declared MIME and extension. Cloudinary handles the image upload. Provider behavior and content validation need staging coverage.
- Public health responses return component status without raw provider errors. Review remaining controller and agent logging against the staging data retention policy.
- The printer key stays server-side and agent-side. A missing key rejects printer agent connections. The shared hardware routes and automatic dispatch are confined to the demo tenant. Treat staff with demo hardware permissions as trusted operators and isolate the printer network before enabling raw TCP printing.
- The tracked agent environment file and runtime logs were removed from the working tree and preserved at ignored local paths. Rotate the exposed printer credential at both ends before reconnecting an agent. Review access to the repository history and follow the repository owner's incident procedure for historical credentials and logs. The legacy seed's known passwords were removed. Verify any previously seeded accounts are disabled or rotated before exposure.

## Open items

The remaining high-severity npm findings are in the Prisma CLI dependency chain. Review the upgrade in isolated staging before production. Dev tooling retains moderate findings. Verify browser-to-backend deployment settings, cross-tenant REST behavior against a real isolated database, QR rotation behavior on already connected guests, proxy-aware rate limits and uploads before public operation.
