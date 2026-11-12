# Testing ServeSync

Use Node.js 22 in CI. The local launch review ran with Node.js 26 and the existing npm workspaces as separate packages.

| Check | Command and location |
|---|---|
| Backend test suite | `npm test` in `server/` with `DATABASE_URL_TEST` unset for fixture tests |
| Frontend test suite | `node --test tests/*test*` in `client/` |
| Frontend lint | `npm run lint` in `client/` |
| Frontend type check | `npx tsc --noEmit` in `client/` |
| Production frontend build | `npm run build` in `client/` with the three public URLs set |
| Prisma validation and generation | `npx prisma validate` and `npm run db:generate` in `server/` with a placeholder connection URL |
| Server and agent JavaScript syntax | `node --check <file>` for each source file |
| Dependency advisories | `npm audit` separately in `client/`, `server/`, and `printer-agent/` |

## Database isolation

The PostgreSQL integration file skips explicitly when `DATABASE_URL_TEST` is unset. It checks for loopback and checks the connected database and user before fixture setup. Its teardown removes its own fixture rows. Use an empty, disposable local database named `servesync_test_db` and an isolated role named `servesync_test_user`. Never point it at a tunnel, shared database, production instance or the demo database. Use a schema-initialized database with the order columns and unique index.

The optional `npm run seed` command is restricted to a separate loopback database named `servesync_demo` and requires `DEMO_SEED_PASSWORD`. It creates the existing local demo catalog and demo-scoped staff accounts from `server/prisma/seed.js`. It fails if the demo already exists. Keep the seed off hosted or shared databases.

## Launch review coverage

| Area | Verified | Still pending |
|---|---|---|
| Marketing and entry screens | Chrome loaded 15 public or sign-in routes at 360, 390, 768, 1366 and 1920 px. No horizontal overflow, failed local image loads or uncaught browser exceptions were detected in the sampled pages. Home CTA clicks reached registration and the demo entry. | Live demo QR scan, signed-in layouts, full keyboard and accessibility review, external links and install behavior |
| Onboarding and platform | Anonymous platform access rejected. Direct provisioning returned 410. Incomplete application returned 400. The browser guard redirected to login. | Real duplicate registration, pending status, approval and rejection races, credential handoff, notification delivery |
| Restaurant administration | Anonymous API access rejected and dashboard redirected to sign-in. Client and controller tests covered selected validation and role boundaries. | Signed-in dashboard, menu and category CRUD, image upload, portions, staff and table management, settings and historical records |
| Customer ordering | Test coverage for QR and session authorization, cart state, retry identity, order conflict and lost response, supply dispatch, closed bill replay and separate rooms for successive guests. | PostgreSQL concurrency and the live QR → order → kitchen → staff → bill → thank-you → next guest → history flow |
| Captain and kitchen | Sign-in guards, fixture-backed tenant isolation, authorization revocation and notification deduplication | Live staff and kitchen operations, KOT output and physical timing |
| Printing | Agent key acceptance/rejection tests, parser/encoder coverage and source syntax | Reconnect, network and serial printer behavior, job acknowledgement on hardware and printer model compatibility |
| Production infrastructure | Frontend build, loopback backend liveness and DB-unavailable readiness, HTTP and Socket.IO polling origin checks | Hosted Vercel/Render integration, live WebSocket transport, Cloudinary, real messaging, performance and resource behavior under load |

The only database endpoint used for process smoke checks was a deliberately unavailable loopback address. A Docker client was present, but its daemon was unavailable, and no isolated PostgreSQL instance was confirmed.
