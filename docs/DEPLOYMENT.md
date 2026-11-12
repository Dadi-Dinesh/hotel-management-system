# Deployment

The intended split is the Next.js app on Vercel, the Express API and Socket.IO server on Render, and PostgreSQL as a separate managed service. Build and smoke-test a staging deployment with its own database and provider settings before publishing a demo link. The repository includes Dockerfiles and local Compose configuration. Configure the hosting dashboards explicitly.

| Service | Root | Build | Start or runtime |
|---|---|---|---|
| Vercel | `client` | `npm ci` then `npm run build` | Next.js framework preset |
| Render | `server` | `npm ci` then `npm run db:generate` | `npm start` |
| Printer agent | `printer-agent` | `npm ci` | `npm start` on the local demo printer host |

Set Render's health check to `/api/health`. It reports database connectivity. Verify the application schema separately. Check allowed and denied origins for REST and Socket.IO, including WebSocket transport on staging. Use one backend instance initially because the Socket.IO adapter, rate limits and printer retry queue are process-local.

## Environment

Start from the checked-in examples. Set the frontend variables at build time. Use HTTPS origins for hosted environments.

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Browser API base including `/api` |
| `NEXT_PUBLIC_SOCKET_URL` | Browser Socket.IO server origin |
| `NEXT_PUBLIC_SITE_URL` | Canonical public site origin used by metadata |
| `DATABASE_URL` | PostgreSQL connection URL for the API |
| `JWT_SECRET` | Private random signing secret with at least 32 characters in production |
| `NODE_ENV`, `PORT`, `HOST` | Runtime mode and listener. Render provides the port. Leave the host unset on Render to bind all interfaces |
| `CLIENT_URL` | Comma-separated browser origins with no trailing slash. Required by the production API |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Server-side image upload configuration |
| `PRINTER_AGENT_KEY` | Optional private key configured identically on API and demo agent |
| `BACKEND_URL` | API origin reached by the local printer agent |
| `PRINTER_PORT`, `PRINTER_BAUD_RATE`, `KITCHEN_MODE`, `PRINTER_TARGET` | Local printer connection and routing options |
| `WHATSAPP_PROVIDER` and provider-specific variables in `server/.env.example` | Optional WhatsApp delivery |
| `DEMO_SEED_PASSWORD` | Private password for disposable local demo staff accounts |
| `DATABASE_URL_TEST` | Explicitly isolated loopback PostgreSQL URL used only by integration tests |

Set all three frontend URLs even when the app's bundled defaults happen to point to the intended deployment. The email service currently has no provider. Keep WhatsApp and printer hardware disabled until each integration is independently verified.

## Order schema rollout

The repository has a reviewed SQL patch and no Prisma migration baseline. The patch adds nullable order key/hash columns and a unique index on restaurant, session and key. Existing rows retain NULL. Treat the live schema as unknown until an authorized operator compares it with staging and records the result.

1. Rehearse on an isolated database with representative size and historical NULL keys. Check row counts, index validity, lock waits and all retry scenarios.
2. For a live table where blocking writes is unacceptable, commit the nullable column additions in a short transaction with a lock timeout. Build the equivalent unique index using `CREATE UNIQUE INDEX CONCURRENTLY` as a separate statement outside a transaction block. Check the index definition and validity. A failed concurrent build can leave an invalid index that requires explicit operator recovery. [PostgreSQL CREATE INDEX](https://www.postgresql.org/docs/current/sql-createindex.html)
3. Release the API and frontend after the schema check. Verify lost-response retry, payload conflict, and the complete QR-to-closed-session workflow before exposing the demo. Preserve the additive columns on application rollback. Reconcile uncertain legacy submissions with staff before retries.
4. Establish and review a migration baseline before adopting `prisma migrate deploy`. Use a least-privilege runtime role and a separate authorized migration identity.

[Reviewed SQL patch](../server/prisma/patches/20261020_order_idempotency.sql)
