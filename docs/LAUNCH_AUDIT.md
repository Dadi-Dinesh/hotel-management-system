# ServeSync launch readiness review

Reviewed November 12, 2026 on `main` at `059b654`. The working tree started clean and matched the local `origin/main` reference.

## A. Overall readiness assessment

The frontend compiles and its public entry points passed browser smoke checks. The API starts and passes local boundary checks with PostgreSQL intentionally unavailable. Public launch remains blocked by credential rotation, pending database schema verification, the remaining Prisma advisories, and the absence of end-to-end verification against an isolated environment.

## B. Findings by severity

| Severity | Finding and disposition |
|---|---|
| Critical | A printer agent environment file was tracked, and the legacy demo seed contained known staff passwords. Removed the files and literals from the working tree. The agent settings and old logs were moved to ignored local paths. Treat historical credentials as exposed until rotated and review historical access. |
| Critical | Initial npm audit reported 2 client and 1 server critical findings. Compatible updates cleared all three in the follow-up audit. |
| High | Public instant provisioning bypassed the reviewed application workflow. It now returns 410. Approval and provisioning commit together, and rejection is conditional on pending state. Database race behavior still needs staging verification. |
| High | The global hardware gateway was available to admins across tenants. Manual and automatic hardware dispatch now use the demo tenant boundary. The single agent and raw TCP printer feature still require a trusted operator and segregated hardware network. |
| High | Customer events followed the physical table across dining sessions. They now follow the authorized session. Staff event delivery across overlapping rooms uses a room union for the affected order and closure events. |
| High | Ordering could fall back to writes without an idempotency key when the schema was missing. It now returns 503. Writes lock the session, and scans lock the table, to guard concurrent close/order and start/start races. |
| High | Deleting a table or item could remove session, order line or feedback history. Deletion now relies on foreign keys and returns a conflict when history exists. The obsolete seed's blanket deletes were removed. |
| High | Staff JWT verification included a static fallback, and platform authorization relied only on a missing tenant. Verification now requires the configured key, platform access requires an admin with a null tenant, and platform support mutations require a selected tenant. |
| High | After compatible dependency updates, three high npm findings remain in the server's Prisma CLI dependency chain. The registry's remediation requires Prisma 7. Review and test that major upgrade separately. |
| Medium | HTTP production allowlist included local and fixed hosted origins, while Socket.IO reflected origins. Both now use explicit production browser origins. Reverse-proxy IP handling and multi-instance limits need staging validation. |
| Medium | Unscoped menu item lookups and broad public restaurant projections exposed fields beyond the intended public tenant scope. Added tenant filters, public menu availability filtering and a public restaurant field selection. |
| Medium | Public health and print paths exposed raw error or request details. Removed these fields and bodies from the reviewed paths. Review other logs and retention before hosting. |
| Medium | Applicant follow-up claimed delivery with no email provider. The endpoint now reports unavailability. Cloudinary and actual WhatsApp delivery remain unverified. |
| Medium | npm audit reports seven client and two server moderate findings after the compatible update. The agent reported zero. |
| Low | Frontend ESLint passed with 85 warnings, up from 82 before the compatible Next and ESLint config updates. Node emitted module-type warnings for mixed JS test imports. Prisma emitted its package configuration deprecation warning. |

## C. Files changed and why

- `.github/workflows/ci.yml` adds frontend tests to CI.
- `client/.gitignore`, `client/.env.example` and `client/next.config.mjs` document local build configuration and constrain Turbopack's workspace root. `client/package.json`, `client/package-lock.json` and `server/package-lock.json` apply advisory-driven updates, including Next.js and its ESLint configuration at 16.4.6.
- `server/.env.example`, `server/server.js`, `server/src/config/validateEnv.js`, `server/src/controllers/health.controller.js`, `server/src/middleware/errorHandler.js` and `server/src/socket/index.js` configure startup, listener, origins and public errors. The socket file also scopes guest rooms to a session.
- `server/src/middleware/auth.js`, `server/src/middleware/tenant.js`, `server/src/middleware/upload.js`, `server/src/routes/menu.routes.js` and `server/src/controllers/menu.controller.js` enforce role and tenant boundaries, filter public menu access, tighten upload metadata validation and protect order history.
- `server/src/routes/restaurant.routes.js`, `server/src/controllers/restaurant.controller.js`, `server/src/controllers/application.controller.js`, `server/src/services/restaurantProvisioning.js` and `server/src/services/email/emailService.js` enforce reviewed provisioning, atomic approval and accurate email delivery responses.
- `server/src/controllers/order.controller.js`, `server/src/controllers/session.controller.js`, `server/src/controllers/table.controller.js` and `server/src/services/orderIdempotency.js` protect order retries, session transitions, delivery scope and retained records.
- `server/src/routes/printer.routes.js`, `server/src/controllers/printer.controller.js` and `server/src/services/printer/autoPrintService.js` enforce demo hardware scope and remove print body logging. `printer-agent/.env.example`, `printer-agent/install.sh` and `printer-agent/src/agent.js` support safe configuration. `printer-agent/.env`, `printer-agent/logs/agent.log` and `server/logs/printer.log` were removed from the tracked paths and archived locally under Git-ignored paths.
- `server/prisma/seed.js` protects existing data and removes fixed credentials while preserving the demo catalog. `server/prisma/patches/README.md` documents the live index strategy. The SQL patch itself has no change.
- `server/src/__tests__/customerOrdering.test.js`, `server/src/__tests__/orderIdempotency.test.js`, `server/src/__tests__/postgresIdempotencyIntegration.test.js` and `server/src/__tests__/reviewSecurity.test.js` cover the new guards, update transaction fixtures, and report an actual database skip.
- `README.md`, `docs/API.md`, `docs/DEVELOPER_GUIDE.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/DEPLOYMENT.md`, `docs/TESTING.md`, `docs/LINKEDIN_LAUNCH_POST.md` and this audit provide the project, testing and launch documentation.

## D. Security verification

The fixture suites exercised invalid and expired guest credentials, foreign sessions and menu items, staff socket joins, cross-tenant room membership, account deletion and demotion, tenant reassignment, delivery-time authorization and revocation, duplicate dispatch, guarded bill replay, server-side pricing and order retry identity. HTTP smoke checks verified unauthenticated role boundaries, missing customer access, origin handling and public health response redaction. Source review covered bcrypt, input validation, Cloudinary, environment handling and raw printer queue behavior. Independent database-backed authorization, adversarial input load testing and real provider behavior remain pending.

## E. Database and migration

No isolated PostgreSQL instance was confirmed. The local Docker daemon was unavailable. No production or shared database was contacted. No migration, seed or destructive database command was run. The idempotency patch's application status remains unknown. Its normal index build blocks writes while it runs. For a busy live table, rehearse a short column-add transaction followed by a separately issued concurrent unique index build and confirm index validity before releasing application code. PostgreSQL permits multiple NULL keys under the patch's default unique-index semantics. [Deployment procedure](DEPLOYMENT.md#order-schema-rollout)

## F. Backend tests

`npm test` with `DATABASE_URL_TEST` unset — **85 passed, 0 failed, 1 skipped**, 86 reported total. The skipped entry represents the PostgreSQL integration suite. Fixture tests do not establish real lock or constraint behavior.

## G. Frontend tests

`node --test tests/*test*` — **18 passed, 0 failed, 0 skipped**.

## H. Build, lint, types and Prisma

- `npm run build` — passed with Next.js 16.4.6, explicit loopback frontend URLs and a reachable public font service. Next reported 52 generated pages.
- `npm run lint` — passed with 0 errors and 85 warnings.
- `tsc --noEmit` — passed.
- `prisma validate` and `npm run db:generate` — passed with Prisma 6.19.3 and a placeholder URL.
- Backend and printer-agent JavaScript syntax and printer installer shell syntax — passed.
- Backend production-mode startup — served loopback HTTP and reported 503 readiness while the database was unavailable.
- Follow-up npm audit — client 7 moderate, server 3 high and 2 moderate, printer agent 0. No critical advisories remained in these reports.

## I. Workflows verified

- Chrome loaded 15 public and sign-in routes at each of 360, 390, 768, 1366 and 1920 px. All returned HTTP 200. The check found no horizontal document overflow, broken local images or uncaught browser exceptions. Home calls to action navigated to registration and the demo entry.
- Signed-out visits to platform, restaurant admin, captain and kitchen dashboards redirected to the corresponding sign-in route.
- Thirteen loopback HTTP checks passed, including CORS allow and deny for both Express and Socket.IO polling, liveness, unavailable DB readiness, direct-provisioning retirement, protected dashboard and hardware endpoints, missing customer authorization, and incomplete application rejection.
- The automated fixture tests cover customer cart behavior, order handling, bill replay and staff notifications. They use simulated database data and transaction responses.

## J. Workflows not verified

- **Blocked on isolated PostgreSQL** — demo QR ordering, full guest-to-kitchen-to-bill flow, actual duplicate and concurrent writes, approval/rejection and account access, menu/category/table/staff CRUD, historical bill retrieval, settings, and authenticated layouts across the requested breakpoints.
- **Blocked on isolated providers or hardware** — Cloudinary uploads, WhatsApp, Render/Vercel and live WebSocket transport, network and serial printers, offline recovery and physical KOT and receipt output. Email has no delivery provider.
- **Not measured** — sustained traffic, network or printer timing, memory profiles, unused-dependency analysis, full accessibility review and real workload query performance. Asset inspection identified two logo PNGs of about 1.2 MB each. The broadcast adapter performs authorization lookups per eligible staff socket, which merits measurement under staging load.

## K. Deployment readiness and manual steps

1. Rotate the historical printer credential at both ends and audit access to the credential and logs in repository history. Check historical demo staff accounts and rotate or disable known passwords.
2. Rehearse the additive patch and migration baseline on isolated PostgreSQL. Verify write contention, order replay, rollback, the entire table lifecycle and historical data retention.
3. Review and resolve the outstanding Prisma advisories and repeat checks on the Node 22 CI target.
4. Configure Vercel and Render explicitly, verify API and WebSocket origins, readiness, proxy IP handling and scoped accounts. Test uploads, messaging and physical printing only where configured and isolated.
5. Complete a signed-in browser and accessibility pass before publishing a live demo link.

## L. Documentation

[README](../README.md), [Architecture](ARCHITECTURE.md), [Security](SECURITY.md), [Deployment](DEPLOYMENT.md), [Testing](TESTING.md), [API reference](API.md), [Developer guide](DEVELOPER_GUIDE.md) and [patch notes](../server/prisma/patches/README.md).

## M. LinkedIn and resume

[LinkedIn draft and resume description](LINKEDIN_LAUNCH_POST.md). Both link placeholders are intentional. No publication occurred.

## N. Final Git status

Changes are unstaged on `main`. No commit or deployment was made.

```text
## main...origin/main
 M .github/workflows/ci.yml
 M README.md
 M client/.gitignore
 M client/next.config.mjs
 M client/package-lock.json
 M client/package.json
 M docs/API.md
 M docs/DEVELOPER_GUIDE.md
 D printer-agent/.env
 M printer-agent/.env.example
 M printer-agent/install.sh
 D printer-agent/logs/agent.log
 M printer-agent/src/agent.js
 M server/.env.example
 D server/logs/printer.log
 M server/package-lock.json
 M server/prisma/patches/README.md
 M server/prisma/seed.js
 M server/server.js
 M server/src/__tests__/customerOrdering.test.js
 M server/src/__tests__/orderIdempotency.test.js
 M server/src/__tests__/postgresIdempotencyIntegration.test.js
 M server/src/__tests__/reviewSecurity.test.js
 M server/src/config/validateEnv.js
 M server/src/controllers/application.controller.js
 M server/src/controllers/health.controller.js
 M server/src/controllers/menu.controller.js
 M server/src/controllers/order.controller.js
 M server/src/controllers/printer.controller.js
 M server/src/controllers/restaurant.controller.js
 M server/src/controllers/session.controller.js
 M server/src/controllers/table.controller.js
 M server/src/middleware/auth.js
 M server/src/middleware/errorHandler.js
 M server/src/middleware/tenant.js
 M server/src/middleware/upload.js
 M server/src/routes/menu.routes.js
 M server/src/routes/printer.routes.js
 M server/src/routes/restaurant.routes.js
 M server/src/services/email/emailService.js
 M server/src/services/orderIdempotency.js
 M server/src/services/printer/autoPrintService.js
 M server/src/services/restaurantProvisioning.js
 M server/src/socket/index.js
?? client/.env.example
?? docs/ARCHITECTURE.md
?? docs/DEPLOYMENT.md
?? docs/LAUNCH_AUDIT.md
?? docs/LINKEDIN_LAUNCH_POST.md
?? docs/SECURITY.md
?? docs/TESTING.md
```

## O. Recommendation

**NOT READY** for a public live showcase. The portfolio copy is ready for review. Release the demo link after isolated staging verifies the database lifecycle and credential remediation is complete.
