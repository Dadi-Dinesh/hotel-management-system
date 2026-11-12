# ServeSync

ServeSync connects a restaurant's table service and kitchen. Guests scan a table QR code, browse the menu, place orders, request supplies and ask for the bill. Captains and kitchen staff see incoming work in their own views. Restaurant admins manage the menu, tables, staff and settings. Platform owners review restaurant applications and provision new tenants.

## Stack

- **Web** — Next.js App Router, React, TypeScript and Tailwind CSS
- **API** — Node.js, Express, Zod, JWT and bcrypt
- **Data** — PostgreSQL and Prisma
- **Real time** — Socket.IO with tenant-scoped staff rooms and session-scoped guest rooms
- **Media and printing** — Cloudinary for uploads, browser and PDF printing, and an optional ESC/POS printer agent for the demo tenant

## Local setup

Use Node.js 22 and an isolated local PostgreSQL database. Copy the example files and fill in the server's database URL and a private JWT signing secret. Keep actual environment files out of Git.

```sh
cp server/.env.example server/.env
cp client/.env.example client/.env.local
(cd server && npm ci && npm run db:generate)
(cd client && npm ci)
```

For a newly created, empty local database only, initialize the schema with `npx prisma db push` from `server/`. For existing databases, use the reviewed deployment procedure. [Deployment and schema rollout](docs/DEPLOYMENT.md)

Run `npm run dev` in `server/` and `client/` in separate terminals. Open `http://localhost:3000`. The optional local demo seed requires a dedicated loopback database named `servesync_demo` and a private `DEMO_SEED_PASSWORD`. The seed inserts the existing demo catalog and demo-scoped staff accounts in one transaction. [Testing and local demo setup](docs/TESTING.md)

## Project guide

- [Architecture and role boundaries](docs/ARCHITECTURE.md)
- [Security controls and launch risks](docs/SECURITY.md)
- [Vercel, Render and environment configuration](docs/DEPLOYMENT.md)
- [Test commands and verification coverage](docs/TESTING.md)
- [API reference](docs/API.md)
- [Printer agent setup](printer-agent/README.md)

ServeSync is a portfolio project under launch review. See the testing guide for database, browser and hardware verification status.
