# API Reference

Base URL: `{SERVER_URL}/api` (local: `http://localhost:4000/api`).

## Conventions

- **Auth**: `Authorization: Bearer <jwt>` header. Tokens are issued by `POST /auth/login` and carry `userId`, `role`, and `restaurantId`.
- **Roles**: `ADMIN`, `MANAGER`, `CAPTAIN`, `KITCHEN`. A route marked "Admin" requires the `ADMIN` role; "Staff" accepts any authenticated staff role listed.
- **Tenant resolution**: staff-protected routes resolve the tenant from the caller's own account (`resolveStaffTenant`) — a token can never act on another restaurant's data. Public routes resolve the tenant from a `:slug` in the URL, or implicitly via an already-tenant-scoped resource like a `sessionId`.
- **Validation errors** (400): `{ "success": false, "message": "...", "errors": [{ "field": "...", "message": "..." }] }`
- **Rate-limited responses** (429): `{ "success": false, "message": "<route-specific message>" }`
- **Response envelope**: most endpoints return `{ "success": true, "data": ... }` or `{ "success": true, ...fields }`; errors return `{ "success": false, "message": "..." }` (never a raw stack trace in production — see `src/middleware/errorHandler.js`).

---

## Auth — `/api/auth`

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/login` | Public (rate-limited: 30 / 15 min) | Body validated by `loginSchema` |
| GET | `/me` | Authenticated | Returns the current user + restaurant |

## Health — `/api/health`

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/` | Public | Aggregate: DB, Socket.IO, Printer — 200 if DB up, else 503 |
| GET | `/db` | Public | Live `SELECT 1` against Postgres, with latency |
| GET | `/socket` | Public | Socket.IO server + connected client count |
| GET | `/printer` | Public | Printer Agent connection status (disconnected ≠ unhealthy — optional hardware) |

## Restaurants — `/api/restaurants` (multi-tenant, slug-scoped)

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/` | Admin (platform owner) | List every restaurant, for the restaurant switcher |
| POST | `/` | Public (rate-limited: 10 / hour) | Onboarding wizard — creates a new tenant + admin account |
| GET | `/:slug` | Public | Restaurant profile (name, branding, logo) |
| GET | `/:slug/tables/:code` | Public (rate-limited: 30 / min) | QR-scan table lookup, slug-scoped |
| GET | `/:slug/menu` | Public | Slug-scoped mirror of `/menu` |
| GET | `/:slug/categories` | Public | Slug-scoped mirror of `/categories` |
| POST | `/:slug/sessions` | Public (rate-limited: 20 / min) | Slug-scoped mirror of `POST /sessions` |
| GET | `/:slug/settings` | Admin | Full settings record (tax, service charge, etc.) |
| PATCH | `/:slug/settings` | Admin | Updates branding/settings — multipart (logo + cover image) |
| PATCH | `/:slug/status` | Admin | Enable/disable the restaurant (never deletes data) |
| GET | `/:slug/printer-settings` | Admin, Manager | Universal Print Engine preferences |
| PATCH | `/:slug/printer-settings` | Admin, Manager | Update print routing preferences |

## Tables — `/api/tables`

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/` | Admin, Captain | List all tables |
| GET | `/qr-overview` | Admin | QR Management Center summary |
| POST | `/regenerate-qr-bulk` | Admin | Regenerate every table's QR code (audit-logged) |
| POST | `/:id/regenerate-qr` | Admin | Regenerate one table's QR code (audit-logged) |
| POST | `/` | Admin | Create a table (audit-logged) |
| PATCH | `/:id` | Admin | Update a table |
| DELETE | `/:id` | Admin | Delete a table |
| GET | `/:code` | Public (rate-limited: 30 / min) | Legacy un-prefixed QR-scan lookup (demo-scoped) |

## Sessions — `/api/sessions`

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/bill-requests` | Admin, Captain | All sessions awaiting a bill |
| POST | `/` | Public (rate-limited: 20 / min) | Starts a session — the QR scan |
| GET | `/:id` | Public | Session detail (guest polls this for order status) |
| PATCH | `/:id/request-bill` | Public | Guest requests the bill |
| POST | `/:id/feedback` | Public (rate-limited: 20 / 10 min) | Body validated by `submitFeedbackSchema` |
| PATCH | `/:id/close` | Admin, Captain | Closes the session, computes bill total, audit-logs `bill.generated` |

## Orders — `/api/orders`

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/` | Public (rate-limited: 40 / 5 min) | Body validated by `placeOrderSchema` |
| GET | `/kitchen/aggregated` | Admin, Captain, Kitchen | Live KDS feed |
| GET | `/` | Admin, Captain, Kitchen | Order list |
| PATCH | `/:id/accept` | Admin, Captain | Accept an order |
| PATCH | `/:id/status` | Admin, Captain | Update order status |
| PATCH | `/items/:itemId/status` | Admin, Captain, Kitchen | Update one item's status |

## Menu — `/api/menu`

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/` | Public | Full menu |
| GET | `/:id` | Public | One item |
| POST | `/` | Admin | Multipart (image upload); audit-logs `menu.item_added` |
| PATCH | `/:id` | Admin | Multipart; audit-logs `menu.item_edited` |
| DELETE | `/:id` | Admin | **Hard-deletes** the item + its feedback + order-item rows; audit-logs `menu.item_deleted` |

## Categories — `/api/categories`

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/` | Public | List categories |
| POST | `/` | Admin | Create |
| PATCH | `/:id` | Admin | Update |
| DELETE | `/:id` | Admin | Delete |

## Offers — `/api/offers`

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/` | Admin | List offers |
| POST | `/` | Admin | Create — audit-logs `offer.created` |
| PATCH | `/:id` | Admin | Update — audit-logs `offer.updated` |
| POST | `/:id/duplicate` | Admin | Duplicate an offer |
| DELETE | `/:id` | Admin | Delete |

## Feedback — `/api/feedbacks`

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/` | Admin | All customer feedback for the restaurant |

## Invites — `/api/invites`

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/:code` | Public | Look up an invite by its claim code |
| POST | `/:code/accept` | Public (rate-limited: 15 / 15 min) | Accept the invite, create the staff account |
| GET | `/` | Admin | List outstanding invites |
| POST | `/` | Admin | Create an invite — audit-logs `staff.added` at acceptance |
| DELETE | `/:id` | Admin | Revoke an invite |

## Admin — `/api/admin`

All routes here are `ADMIN`-only and rate-limited at 400 requests / 5 min (a backstop, not a usage constraint).

| Method | Path | Notes |
|---|---|---|
| GET | `/stats` | Dashboard summary stats |
| GET | `/orders` | Full order history |
| GET | `/users` | Staff accounts |
| POST | `/users` | Create a staff account — body validated by `createStaffUserSchema`; audit-logs `staff.added` |
| DELETE | `/users/:id` | Remove a staff account |

## Analytics — `/api/admin/analytics`

All `ADMIN`-only.

| Method | Path |
|---|---|
| GET | `/revenue-trend` |
| GET | `/peak-hours` |
| GET | `/sellers` |
| GET | `/menu-performance` |
| GET | `/tables` |
| GET | `/waiters` |

## AI Copilot / Insights — `/api/admin/insights`

All `ADMIN`-only.

| Method | Path | Notes |
|---|---|---|
| GET | `/overview` | Summary insights |
| GET | `/trends` | Trend data |
| GET | `/report` | Full report |
| POST | `/ask` | Rate-limited (20 / min); body validated by `askAISchema`; answers grounded in real Prisma queries — see [AI Copilot](../README.md#ai-copilot) |

## Printer — `/api/printer`

`ADMIN`/`MANAGER`-only (hardware control — locked down in Phase 12; previously unauthenticated). Manual actions only — automatic KOT/bill printing on order-accept/session-close never goes through these HTTP routes.

| Method | Path | Notes |
|---|---|---|
| GET | `/status` | Current connection/printer status |
| GET | `/ports` | Available system serial ports |
| POST | `/config` | Update port/baud rate/kitchen mode |
| POST | `/reconnect` | Force a reconnect attempt |
| POST | `/test` | Print a test receipt |
| POST | `/bill` | Print a customer bill |
| POST | `/kot` | Print a kitchen order ticket |
| POST | `/network/test` | Test a network (TCP) printer |

## Print Jobs — `/api/print-jobs`

Staff-only (`ADMIN`, `MANAGER`, `CAPTAIN`, `KITCHEN`).

| Method | Path | Notes |
|---|---|---|
| GET | `/` | Print queue / history |
| POST | `/` | Enqueue a print job |
| PATCH | `/:id` | Update a job |
| PATCH | `/:id/cancel` | Cancel a job |

---

For the underlying data model, see [`server/prisma/schema.prisma`](../server/prisma/schema.prisma) and the [ER diagram in the README](../README.md#database-schema).
