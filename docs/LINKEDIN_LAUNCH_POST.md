# LinkedIn draft

I built **ServeSync** to explore how a restaurant can coordinate table service and kitchen work without passing every update by hand.

Guests scan a QR code to browse the menu, place an order, request supplies or ask for the bill. Captains and kitchen staff see orders as they come in, and restaurant admins can manage menus, tables and staff. A separate platform portal handles restaurant applications and onboarding.

I built it with Next.js, React, TypeScript, Express, PostgreSQL, Prisma and Socket.IO. The part I learned most from was handling what happens when a request is retried, a table changes guests or a staff member loses access while still connected. Those cases pushed me to design for order idempotency, session-scoped updates and authorization at delivery time.

I’m sharing ServeSync as a portfolio project. I’d be interested to hear how others handle flaky connections and live order updates in restaurant software.

Demo — [LIVE DEMO URL]  
Code — [GITHUB REPOSITORY URL]

#FullStackDevelopment #NextJS #PostgreSQL #SoftwareEngineering

## Resume description

Built ServeSync, a multi-tenant restaurant operations platform using Next.js, Express, Prisma, PostgreSQL and Socket.IO. Implemented QR-based ordering, live captain and kitchen workflows, role-scoped tenant access and retry-safe order submission with database-backed idempotency.
