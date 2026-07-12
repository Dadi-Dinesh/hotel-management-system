const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...\n");

  // ─── Seed Tables (T01 – T12) ──────────────────────
  console.log("📋 Creating 12 tables...");
  const tables = [];
  for (let i = 1; i <= 12; i++) {
    const code = `T${String(i).padStart(2, "0")}`;
    const table = await prisma.table.upsert({
      where: { code },
      update: {},
      create: { code, number: i, isActive: true },
    });
    tables.push(table);
  }
  console.log(`   ✅ Created ${tables.length} tables (T01–T12)\n`);

  // ─── Seed Admin Account ────────────────────────────
  console.log("👤 Creating admin account...");
  const adminPassword = await bcrypt.hash("admin@123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@nookambika.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@nookambika.com",
      password: adminPassword,
      role: "ADMIN",
    },
  });
  console.log(`   ✅ Admin: ${admin.email} / admin@123\n`);

  // ─── Seed Captain Account ─────────────────────────
  console.log("👤 Creating captain account...");
  const captainPassword = await bcrypt.hash("captain@123", 12);
  const captain = await prisma.user.upsert({
    where: { email: "captain@nookambika.com" },
    update: {},
    create: {
      name: "Captain",
      email: "captain@nookambika.com",
      password: captainPassword,
      role: "CAPTAIN",
    },
  });
  console.log(`   ✅ Captain: ${captain.email} / captain@123\n`);

  // ─── Clean Existing Menu Data ──────────────────────
  console.log("🧹 Cleaning old menu, orders, and sessions data...");
  await prisma.feedback.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.menuItem.deleteMany({});
  await prisma.category.deleteMany({});
  console.log("   ✅ Cleaned old records\n");

  // ─── Seed Categories ──────────────────────────────
  console.log("📂 Creating menu categories...");
  const categoryNames = [
    "Veg Starters",
    "Veg Curries",
    "Fried Rice",
    "Rotis",
    "Non-Veg Starters",
    "Non-Veg Curries",
  ];

  const categories = {};
  for (const name of categoryNames) {
    const category = await prisma.category.create({
      data: { name },
    });
    categories[name] = category;
  }
  console.log(`   ✅ Created ${categoryNames.length} categories\n`);

  // ─── Seed Menu Items ──────────────────────────────
  console.log("🍽️  Creating new simplified menu items...");
  const menuData = {
    "Veg Starters": [
      { name: "Kaju Fry", price: 179 },
      { name: "Chilli Paneer", price: 180 },
      { name: "Chanaga Fry", price: 90 },
      { name: "Chilli Mushroom", price: 180 },
      { name: "Veg Manchuria", price: 130 }
    ],
    "Veg Curries": [
      { name: "SP. Methichaman", price: 200 },
      { name: "Saipaneer", price: 200 },
      { name: "Kaju Tomato", price: 180 },
      { name: "Kaju Paneer", price: 185 },
      { name: "Kaju Mushroom", price: 185 },
      { name: "Mushroom Curry", price: 180 },
      { name: "Palak Paneer", price: 170 },
      { name: "Paneer Butter Masala", price: 170 },
      { name: "Paneer Curry", price: 170 },
      { name: "Mixed Veg Curry", price: 170 },
      { name: "Dhall Palak", price: 100 },
      { name: "Dhall", price: 90 },
      { name: "Chanaga Masala (Full)", price: 90 },
      { name: "Chanaga Masala (Half)", price: 60 }
    ],
    "Fried Rice": [
      { name: "Veg Fried Rice", price: 100 },
      { name: "Kaju Fried Rice", price: 160 },
      { name: "Kaju Paneer Fried Rice", price: 170 },
      { name: "Jeera Rice", price: 100 },
      { name: "Paneer Fried Rice", price: 160 },
      { name: "Egg Fried Rice", price: 120 },
      { name: "Chicken Fried Rice", price: 170 },
      { name: "SP Chicken Fried Rice", price: 190 }
    ],
    "Rotis": [
      { name: "Pulka", price: 7 }
    ],
    "Non-Veg Starters": [
      { name: "Talakai Fry", price: 249 },
      { name: "Chilli Chicken", price: 200 },
      { name: "Chicken Wings", price: 200 },
      { name: "Chicken Roast", price: 190 },
      { name: "Boneless Roast Chicken", price: 200 },
      { name: "Roast Fry Chicken", price: 210 },
      { name: "Kaju Chicken", price: 260 },
      { name: "Fish Fry", price: 200 },
      { name: "Chilli Fish", price: 200 },
      { name: "Chilli Prawns", price: 240 },
      { name: "Loose Prawns", price: 240 },
      { name: "Pethallu Fry", price: 239 },
      { name: "Kouju Pitta (1)", price: 130 },
      { name: "Kouju Pitta (2)", price: 230 }
    ],
    "Non-Veg Curries": [
      { name: "Talakai Curry", price: 240 },
      { name: "Chicken (Roast Curry)", price: 210 },
      { name: "Chicken Wings Curry", price: 190 },
      { name: "Kaju Chicken Curry", price: 295 },
      { name: "Boneless Chicken", price: 190 },
      { name: "Bone Chicken (Full) 7 pcs", price: 180 },
      { name: "Bone Chicken (Half) 5 pcs", price: 130 },
      { name: "Mogal Boneless Chicken", price: 220 },
      { name: "Mogal Bone Chicken", price: 210 },
      { name: "Fish Curry", price: 209 },
      { name: "Prawns Curry", price: 220 },
      { name: "Pethallu Curry", price: 240 },
      { name: "Kouju Pitta Curry (1)", price: 130 },
      { name: "Kouju Pitta Curry (2)", price: 230 },
      { name: "Anda Tomato", price: 90 },
      { name: "Anda Bujji", price: 90 },
      { name: "Anda Keema", price: 90 },
      { name: "Anda Tadaka", price: 100 },
      { name: "Anda Palak", price: 100 }
    ]
  };

  let itemCount = 0;
  for (const [catName, items] of Object.entries(menuData)) {
    const categoryId = categories[catName].id;
    for (const item of items) {
      await prisma.menuItem.create({
        data: {
          name: item.name,
          price: item.price,
          categoryId,
          isAvailable: true,
        }
      });
      itemCount++;
    }
  }
  console.log(`   ✅ Created ${itemCount} simplified menu items\n`);

  console.log("─".repeat(40));
  console.log("🎉 Database seeded successfully!");
  console.log("─".repeat(40));
  console.log("\n📋 Login Credentials:");
  console.log("   Admin:   admin@nookambika.com / admin@123");
  console.log("   Captain: captain@nookambika.com / captain@123");
  console.log("");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
