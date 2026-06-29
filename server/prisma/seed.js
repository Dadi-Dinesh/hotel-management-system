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

  // ─── Seed Categories ──────────────────────────────
  console.log("📂 Creating menu categories...");
  const categoryNames = [
    "Starters",
    "Biryanis",
    "Main Course",
    "Breads",
    "Rice",
    "Beverages",
    "Desserts",
  ];

  const categories = {};
  for (const name of categoryNames) {
    const category = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categories[name] = category;
  }
  console.log(`   ✅ Created ${categoryNames.length} categories\n`);

  // ─── Seed Menu Items ──────────────────────────────
  console.log("🍽️  Creating sample menu items...");
  const menuItems = [
    // Starters
    { name: "Chicken 65", price: 220, categoryId: categories["Starters"].id },
    { name: "Paneer Tikka", price: 200, categoryId: categories["Starters"].id },
    { name: "Gobi Manchurian", price: 180, categoryId: categories["Starters"].id },
    { name: "Fish Fry", price: 250, categoryId: categories["Starters"].id },
    { name: "Mushroom Pepper Fry", price: 190, categoryId: categories["Starters"].id },

    // Biryanis
    { name: "Chicken Biryani", price: 250, categoryId: categories["Biryanis"].id },
    { name: "Mutton Biryani", price: 320, categoryId: categories["Biryanis"].id },
    { name: "Egg Biryani", price: 180, categoryId: categories["Biryanis"].id },
    { name: "Veg Biryani", price: 180, categoryId: categories["Biryanis"].id },
    { name: "Prawns Biryani", price: 350, categoryId: categories["Biryanis"].id },

    // Main Course
    { name: "Butter Chicken", price: 280, categoryId: categories["Main Course"].id },
    { name: "Chicken Curry", price: 240, categoryId: categories["Main Course"].id },
    { name: "Mutton Curry", price: 320, categoryId: categories["Main Course"].id },
    { name: "Paneer Butter Masala", price: 220, categoryId: categories["Main Course"].id },
    { name: "Dal Tadka", price: 150, categoryId: categories["Main Course"].id },
    { name: "Fish Curry", price: 280, categoryId: categories["Main Course"].id },

    // Breads
    { name: "Butter Naan", price: 50, categoryId: categories["Breads"].id },
    { name: "Garlic Naan", price: 60, categoryId: categories["Breads"].id },
    { name: "Tandoori Roti", price: 30, categoryId: categories["Breads"].id },
    { name: "Chapathi", price: 20, categoryId: categories["Breads"].id },
    { name: "Parota", price: 40, categoryId: categories["Breads"].id },

    // Rice
    { name: "Steamed Rice", price: 80, categoryId: categories["Rice"].id },
    { name: "Jeera Rice", price: 120, categoryId: categories["Rice"].id },
    { name: "Chicken Fried Rice", price: 200, categoryId: categories["Rice"].id },
    { name: "Egg Fried Rice", price: 160, categoryId: categories["Rice"].id },

    // Beverages
    { name: "Coke", price: 40, categoryId: categories["Beverages"].id },
    { name: "Sprite", price: 40, categoryId: categories["Beverages"].id },
    { name: "Fresh Lime Soda", price: 60, categoryId: categories["Beverages"].id },
    { name: "Mango Lassi", price: 80, categoryId: categories["Beverages"].id },
    { name: "Buttermilk", price: 30, categoryId: categories["Beverages"].id },
    { name: "Water Bottle", price: 20, categoryId: categories["Beverages"].id },

    // Desserts
    { name: "Gulab Jamun", price: 60, categoryId: categories["Desserts"].id },
    { name: "Ice Cream", price: 80, categoryId: categories["Desserts"].id },
    { name: "Kheer", price: 70, categoryId: categories["Desserts"].id },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: { id: `seed-${item.name.toLowerCase().replace(/\s+/g, "-")}` },
      update: {},
      create: {
        name: item.name,
        price: item.price,
        categoryId: item.categoryId,
        isAvailable: true,
      },
    });
  }
  console.log(`   ✅ Created ${menuItems.length} menu items\n`);

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
