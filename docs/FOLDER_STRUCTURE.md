# Folder Structure

Three independently-runnable services in one repository — no shared root `node_modules`, no monorepo tooling (Turborepo/Nx). Each has its own `package.json`, `Dockerfile`, and `.dockerignore`.

```
hotel-management-system/
├── client/              # Next.js 16 (App Router) — all four portals + marketing site
├── server/               # Express 5 + Socket.IO — the REST/WebSocket API
├── printer-agent/        # Node.js — bridges the server to a physical thermal printer
├── config/                # Runtime-persisted printer config/queue state (gitignored contents)
├── docs/                  # This documentation set
├── docker-compose.yml    # Local full-stack orchestration (db + server + client)
└── .github/workflows/    # CI (ci.yml) — install/lint/typecheck/build/prisma-validate/test
```

## `server/`

```
server/
├── server.js                    # Entry point — env validation, Helmet/CORS, route mounting, Socket.IO init
├── prisma/
│   ├── schema.prisma           # The single source of truth for the data model
│   ├── seed.js                 # Seeds the demo restaurant + demo data
│   └── backfillRestaurant.js   # One-off migration helper (pre-multi-tenant → tenant-scoped)
├── Dockerfile / .dockerignore
└── src/
    ├── config/
    │   ├── db.js                # Prisma client singleton
    │   └── validateEnv.js       # Startup env validation (fails fast on missing required vars)
    ├── controllers/             # One file per resource — request handling + Prisma queries
    ├── routes/                  # One file per resource — Express routers, auth/validation/rate-limit wiring
    ├── middleware/
    │   ├── auth.js              # JWT verification, role checks
    │   ├── tenant.js             # Multi-tenant resolution (resolveStaffTenant / resolvePublicTenant)
    │   ├── validate.js          # Zod schema → 400 response middleware
    │   ├── rateLimit.js          # In-memory rate limiter
    │   ├── upload.js             # Multer + Cloudinary image upload
    │   └── errorHandler.js      # Centralized error → HTTP response mapping
    ├── validation/
    │   └── schemas.js            # Zod schemas for JSON-body endpoints
    ├── services/
    │   ├── printer/               # Printer hardware service, ESC/POS builder, auto-print logic
    │   ├── insights/              # AI Copilot: intent matching, aggregations, feedback keyword engine
    │   ├── email/                  # Transactional email (invites, etc.)
    │   └── kds.service.js         # Kitchen Display System aggregation logic
    ├── socket/                    # Socket.IO server setup + event emitters
    ├── utils/
    │   ├── logger.js              # Structured logger (dev-colored / prod-JSON)
    │   ├── AppError.js            # Operational-error class for safe production messages
    │   ├── auditLog.js            # Fire-and-forget audit log writer
    │   └── tokenUtils.js          # Token hashing/generation (invites, etc.)
    └── __tests__/                 # node:test unit tests (pure-logic coverage)
```

## `client/`

Next.js App Router — folders under `app/` are routes.

```
client/
├── next.config.mjs        # React Compiler, standalone output, image remote patterns, env check
├── eslint.config.mjs
├── Dockerfile / .dockerignore
└── app/
    ├── layout.js           # Root layout — fonts, Socket/Network providers, toaster
    ├── page.js             # Marketing homepage
    ├── error.js            # Route-segment error boundary (Phase 12)
    ├── global-error.js    # Root-layout error boundary (Phase 12)
    ├── not-found.js        # Custom 404 (Phase 12)
    ├── admin/               # Admin Dashboard — menu, tables, staff, offers, analytics, printer, AI copilot, settings
    ├── captain/             # Captain/Waiter login + dashboard
    ├── kitchen/             # Kitchen Display System login + dashboard
    ├── table/[code]/       # Customer portal — legacy un-prefixed QR flow (menu, orders, thank-you)
    ├── restaurant/[slug]/  # Customer portal — tenant-scoped QR flow
    ├── invite/[code]/      # Staff invite acceptance
    ├── onboard/             # Public self-serve restaurant onboarding wizard
    ├── pricing/, features/, faq/, contact/, demo/, privacy/, terms/   # Marketing pages
    ├── components/          # Shared UI components (25+) — EmptyState, MenuCard, modals, providers, etc.
    ├── hooks/                # Shared React hooks
    ├── lib/
    │   ├── api.js            # Axios instance — attaches JWT + tenant header automatically
    │   ├── socket.js         # Socket.IO client setup
    │   ├── auth.js            # Token storage helpers
    │   ├── branding.js        # Platform name + demo restaurant constants
    │   ├── printer/            # Client-side printer adapters (network/bluetooth) + print service
    │   ├── insights/           # AI Copilot client helpers
    │   ├── marketing/          # Marketing-site content/helpers
    │   └── pwa/                # Service worker / install prompt / offline helpers
    └── types/                 # Shared TypeScript types
```

## `printer-agent/`

```
printer-agent/
├── src/
│   ├── agent.js               # Entry point — connects to the backend over Socket.IO
│   ├── drivers/
│   │   ├── SerialPrinter.js   # USB/serial thermal printer driver
│   │   └── NetworkPrinter.js  # Raw-TCP network printer driver
│   ├── formatters/              # ESC/POS receipt/KOT builders, routing logic
│   ├── queue/                    # Local print job queue with retry
│   ├── config/                   # Persisted printer config (printerConfigManager.js)
│   └── utils/                    # Local file logger
├── Dockerfile / .dockerignore    # See README's Printing Setup — native install is still recommended
└── .env.example
```

## `docs/`

- [`API.md`](API.md) — full REST endpoint reference
- [`DEVELOPER_GUIDE.md`](DEVELOPER_GUIDE.md) — local setup, conventions, testing strategy
- `FOLDER_STRUCTURE.md` — this file
