/**
 * One-time backfill for the multi-tenant migration (Phase 6).
 * Creates the demo Restaurant row and assigns every existing record to it.
 * Safe to re-run — every step is idempotent (upsert / "only if null").
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🏢 Backfilling multi-tenant data...\n");

  // ─── 1. Create (or find) the demo restaurant ──────────
  const demo = await prisma.restaurant.upsert({
    where: { slug: "nookambika" },
    update: {},
    create: {
      name: "Sree Nookambika Family Dhaba",
      slug: "nookambika",
      shortName: "Nookambika Dhaba",
      cuisine: "Authentic Indian Cuisine",
      logo: "/dhaba-logo.jpg",
      primaryColor: "#E8891C",
      secondaryColor: "#3D2710",
      currency: "INR",
      timeZone: "Asia/Kolkata",
      isActive: true,
      plan: "FREE_TRIAL",
      subscriptionStatus: "ACTIVE", // demo restaurant is not a real trial
      trialEndsAt: null,
    },
  });
  console.log(`   ✅ Demo restaurant: ${demo.name} (slug: ${demo.slug}, id: ${demo.id})\n`);

  // ─── 2. Create a Platform Owner account (restaurantId stays null) ──
  const ownerEmail = "owner@servesync.app";
  const existingOwner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!existingOwner) {
    const password = await bcrypt.hash("owner@123", 12);
    const owner = await prisma.user.create({
      data: { name: "Platform Owner", email: ownerEmail, password, role: "ADMIN", restaurantId: null },
    });
    console.log(`   ✅ Platform Owner created: ${owner.email} / owner@123 (restaurantId: null)\n`);
  } else {
    console.log(`   ⏭  Platform Owner already exists: ${ownerEmail}\n`);
  }

  // ─── 3. Backfill restaurantId on every existing tenant-owned row ──
  const results = await prisma.$transaction([
    prisma.user.updateMany({ where: { restaurantId: null, email: { not: ownerEmail } }, data: { restaurantId: demo.id } }),
    prisma.table.updateMany({ where: { restaurantId: null }, data: { restaurantId: demo.id } }),
    prisma.category.updateMany({ where: { restaurantId: null }, data: { restaurantId: demo.id } }),
    prisma.menuItem.updateMany({ where: { restaurantId: null }, data: { restaurantId: demo.id } }),
    prisma.session.updateMany({ where: { restaurantId: null }, data: { restaurantId: demo.id } }),
    prisma.order.updateMany({ where: { restaurantId: null }, data: { restaurantId: demo.id } }),
    prisma.feedback.updateMany({ where: { restaurantId: null }, data: { restaurantId: demo.id } }),
    prisma.offer.updateMany({ where: { restaurantId: null }, data: { restaurantId: demo.id } }),
  ]);

  const [u, t, c, m, s, o, f, of] = results;
  console.log("   Backfilled row counts:");
  console.log(`     users:      ${u.count}`);
  console.log(`     tables:     ${t.count}`);
  console.log(`     categories: ${c.count}`);
  console.log(`     menuItems:  ${m.count}`);
  console.log(`     sessions:   ${s.count}`);
  console.log(`     orders:     ${o.count}`);
  console.log(`     feedbacks:  ${f.count}`);
  console.log(`     offers:     ${of.count}`);

  console.log("\n✅ Backfill complete.");
}

main()
  .catch((e) => {
    console.error("❌ Backfill failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
