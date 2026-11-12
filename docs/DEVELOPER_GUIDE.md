# Developer Guide

## Local Setup

Use the [local setup instructions](../README.md#local-setup) and an isolated PostgreSQL database. Prisma validation and client generation work with a placeholder connection URL and require no database access.

For new, empty local databases, initialize the schema from `server/prisma/schema.prisma`. Use the [schema rollout procedure](DEPLOYMENT.md#order-schema-rollout) for existing databases. The [testing guide](TESTING.md) describes the guarded local demo seed and integration suite.

## Conventions

- **Multi-tenancy**: every new tenant-owned Prisma model needs a `restaurantId` field, and every controller query touching it must filter by `req.restaurantId` (set by `resolveStaffTenant`/`resolvePublicTenant`). There is no other enforcement layer — a missing filter is a real cross-tenant data leak.
- **Validation**: JSON-body endpoints get a Zod schema in `server/src/validation/schemas.js` and `validate(schema)` in the route. Multipart (file-upload) endpoints — menu items, restaurant settings, onboarding — deliberately keep their existing inline validation instead; form fields arrive as strings regardless of logical type, and Zod-coercing them risks subtly changing accepted values on already-working, tested routes.
- **Errors**: throw `AppError(message, statusCode)` (`server/src/utils/AppError.js`) for any deliberate 4xx from a controller — its message is guaranteed to reach the client even in production. Anything else that throws gets a generic production message (see `errorHandler.js`) — full details are always logged server-side via `logger.js`.
- **Audit log**: any action in the brief's list (menu changes, offers, staff, tables, QR regen, settings, bill generation) calls `logAudit({ action, restaurantId, userId, metadata })` after the write succeeds. It's fire-and-forget — a logging failure never fails the request. Never put secrets in `metadata`.
- **Rate limits**: every public write/scan endpoint has one, sized to a realistic worst case (a full dining room scanning QR codes in the same minute, a table placing several rounds of orders) — see the reasoning comments next to each `rateLimit(...)` call in the route files before changing a limit.

## Testing

```bash
cd server
npm test
```

Runs Node's built-in test runner (`node:test`, zero extra dependencies) over `server/src/__tests__/`. This is a **unit-test foundation**, not full end-to-end coverage — it covers pure, dependency-free logic:

- Zod validation schemas (`schemas.test.js`)
- ESC/POS byte-level receipt formatting (`escposBuilder.test.js`)
- Token hashing/generation (`tokenUtils.test.js`)
- Feedback keyword classification (`feedbackKeywords.test.js`)

**Why not full e2e against a live database?** This project has one shared Neon Postgres instance across dev/demo, with no isolated, disposable test database provisioned — running destructive/mutating e2e tests against it would risk corrupting real demo data. Extending coverage properly would mean either provisioning a dedicated test database (e.g. a throwaway Neon branch per CI run) or reaching for something like `supertest` + a Dockerized Postgres in CI. The Docker Compose setup already includes a real `postgres:16-alpine` service, which is the natural next step for that.

If you add a new pure function (a calculation, a formatter, a classifier) — add a test for it in `src/__tests__/`. If you touch a Prisma-querying controller, the honest current answer is: test it manually against your own dev database, the way this whole project has been verified phase over phase.

## Common Workflows

**Add a new API endpoint**
1. Controller function in `src/controllers/<resource>.controller.js`.
2. Route in `src/routes/<resource>.routes.js` — wire `authenticate`/`requireRole`/`resolveStaffTenant` as appropriate, plus `rateLimit` and `validate` if it's a public/write endpoint.
3. If it changes something audit-worthy, add a `logAudit(...)` call after the write.
4. Update `docs/API.md`.

**Add a new client page**
1. New folder under `client/app/` (App Router — the folder path is the route).
2. Pull data via `client/app/lib/api.js` (already attaches the JWT + tenant header).
3. Reuse `EmptyState`, the existing toast conventions (`react-hot-toast`), and the CSS custom-property color tokens (`var(--color-brown-900)`, etc.) already used throughout `app/components/`.

**Change the database schema**
1. Edit `server/prisma/schema.prisma`.
2. Update the schema on a new disposable database or rehearse a reviewed migration on an isolated copy.
3. If the model is tenant-owned, add `restaurantId` and filter every query that touches it.

## CI

`.github/workflows/ci.yml` runs on every push/PR to `main`, three parallel jobs:

- **server** — install, syntax-check every `.js` file (no ESLint config exists on the server yet), `prisma validate`, `npm test`.
- **client** — install, `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- **printer-agent** — install, syntax-check.

It never deploys — see [Deployment](../README.md#deployment) in the README.

### A note on the client's ESLint config

`client/eslint.config.mjs` downgrades three React Compiler rules (`react-hooks/set-state-in-effect`, `react-hooks/immutability`, `react-hooks/preserve-manual-memoization`) from error to warning. `reactCompiler: true` was enabled in `next.config.mjs` in an earlier phase; its ESLint plugin surfaced ~57 pre-existing findings across 55 files on first run — almost all `setState` calls inside `useEffect`, written before the compiler existed to flag them. Fixing those properly means restructuring effect logic file-by-file across every portal, which is real refactoring work with real regression risk, not a lint-config problem. They're downgraded (visible in CI output, never silenced) rather than fixed blind, and are the natural next chunk of work for whoever picks this up next.
