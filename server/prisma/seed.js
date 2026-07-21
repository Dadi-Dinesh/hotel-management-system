const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed with updated menu prices, descriptions, and ratings...\n");

  // ─── Seed Tables (T01 – T12) ──────────────────────
  console.log("📋 Creating 12 tables...");
  const tables = [];
  for (let i = 1; i <= 12; i++) {
    const code = `T${String(i).padStart(2, "0")}`;
    const table = await prisma.table.upsert({
      where: { code },
      update: {},
      create: { code, number: i, capacity: 4, isActive: true },
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
  console.log("🍽️  Creating updated menu items with ratings and pricing...");

  const menuItems = [
    // Veg Starters
    { name: "Kaju Fry", category: "Veg Starters", price: 189, description: "Whole cashew nuts fried to golden perfection with signature aromatic South Indian spices.", servingInformation: "Serves 2–3 People", isVeg: true, isPopular: false, spiceLevel: "Medium", rating: 4.1, displayRating: 4.1, ratingCount: 120, totalRating: 492.0 },
    { name: "Chilli Paneer", category: "Veg Starters", price: 190, description: "Crispy cottage cheese cubes tossed with bell peppers, green chillies, and zesty Indo-Chinese sauces.", servingInformation: "Serves 2–3 People", isVeg: true, isPopular: true, spiceLevel: "Spicy", rating: 4.6, displayRating: 4.6, ratingCount: 340, totalRating: 1564.0 },
    { name: "Chanaga Fry", category: "Veg Starters", price: 100, description: "Tender chickpeas pan-fried with onions, curry leaves, and traditional dhaba spices.", servingInformation: "Serves 2–3 People", isVeg: true, isPopular: false, spiceLevel: "Medium", rating: 3.9, displayRating: 3.9, ratingCount: 75, totalRating: 292.5 },
    { name: "Chilli Mushroom", category: "Veg Starters", price: 190, description: "Fresh button mushrooms wok-tossed with crunchy capsicum, garlic, and spicy chilli seasoning.", servingInformation: "Serves 2–3 People", isVeg: true, isPopular: false, spiceLevel: "Spicy", rating: 4.2, displayRating: 4.2, ratingCount: 145, totalRating: 609.0 },
    { name: "Veg Manchuria", category: "Veg Starters", price: 140, description: "Golden vegetable dumplings simmered in rich tangy garlic and soya sauce reduction.", servingInformation: "Serves 2–3 People", isVeg: true, isPopular: false, spiceLevel: "Medium", rating: 4.0, displayRating: 4.0, ratingCount: 180, totalRating: 720.0 },

    // Veg Curries
    { name: "SP. Methichaman", category: "Veg Curries", price: 210, description: "Special cottage cheese delicacy cooked with fresh fenugreek leaves in rich cashew gravy.", servingInformation: "Serves 8–10 Rotis", isVeg: true, isPopular: false, spiceLevel: "Mild", rating: 4.2, displayRating: 4.2, ratingCount: 95, totalRating: 399.0 },
    { name: "Saipaneer", category: "Veg Curries", price: 210, description: "Classic Shahi cottage cheese curry infused with aromatic saffron, cream, and ground spices.", servingInformation: "Serves 8–10 Rotis", isVeg: true, isPopular: false, spiceLevel: "Mild", rating: 4.1, displayRating: 4.1, ratingCount: 88, totalRating: 360.8 },
    { name: "Kaju Tomato", category: "Veg Curries", price: 190, description: "Crunchy cashews simmered in a tangy, spiced tomato gravy with rich butter glaze.", servingInformation: "Serves 8–10 Rotis", isVeg: true, isPopular: false, spiceLevel: "Medium", rating: 4.3, displayRating: 4.3, ratingCount: 160, totalRating: 688.0 },
    { name: "Kaju Paneer", category: "Veg Curries", price: 195, description: "Delightful blend of fresh cottage cheese and whole cashews in royal onion-tomato gravy.", servingInformation: "Serves 8–10 Rotis", isVeg: true, isPopular: true, spiceLevel: "Medium", rating: 4.7, displayRating: 4.7, ratingCount: 420, totalRating: 1974.0 },
    { name: "Kaju Mushroom", category: "Veg Curries", price: 195, description: "Juicy button mushrooms and fried cashews cooked in rich creamy onion tomato curry.", servingInformation: "Serves 8–10 Rotis", isVeg: true, isPopular: true, spiceLevel: "Medium", rating: 4.5, displayRating: 4.5, ratingCount: 280, totalRating: 1260.0 },
    { name: "Mushroom Curry", category: "Veg Curries", price: 190, description: "Fresh farm mushrooms slow-cooked in thick spicy dhaba gravy with roasted spices.", servingInformation: "Serves 8–10 Rotis", isVeg: true, isPopular: false, spiceLevel: "Spicy", rating: 4.0, displayRating: 4.0, ratingCount: 110, totalRating: 440.0 },
    { name: "Palak Paneer", category: "Veg Curries", price: 180, description: "Fresh cottage cheese cubes gently cooked in smooth, seasoned spinach puree with garlic.", servingInformation: "Serves 8–10 Rotis", isVeg: true, isPopular: true, spiceLevel: "Mild", rating: 4.6, displayRating: 4.6, ratingCount: 390, totalRating: 1794.0 },
    { name: "Paneer Butter Masala", category: "Veg Curries", price: 180, description: "Soft paneer cubes cooked in rich buttery tomato gravy with fragrant herbs and cream.", servingInformation: "Serves 8–10 Rotis", isVeg: true, isPopular: true, spiceLevel: "Mild", rating: 4.8, displayRating: 4.8, ratingCount: 520, totalRating: 2496.0 },
    { name: "Paneer Curry", category: "Veg Curries", price: 180, description: "Traditional cottage cheese curry simmered with onions, tomatoes, and home-ground masala.", servingInformation: "Serves 8–10 Rotis", isVeg: true, isPopular: false, spiceLevel: "Medium", rating: 4.2, displayRating: 4.2, ratingCount: 140, totalRating: 588.0 },
    { name: "Mixed Veg Curry", category: "Veg Curries", price: 180, description: "Assorted garden fresh vegetables cooked together in classic spiced onion-tomato curry.", servingInformation: "Serves 8–10 Rotis", isVeg: true, isPopular: false, spiceLevel: "Medium", rating: 3.9, displayRating: 3.9, ratingCount: 95, totalRating: 370.5 },
    { name: "Dhall Palak", category: "Veg Curries", price: 110, description: "Nourishing yellow lentils tempered with fresh spinach leaves, garlic, and cumin seeds.", servingInformation: "Serves 8–10 Rotis", isVeg: true, isPopular: false, spiceLevel: "Mild", rating: 3.7, displayRating: 3.7, ratingCount: 65, totalRating: 240.5 },
    { name: "Dhall", category: "Veg Curries", price: 100, description: "Homestyle yellow lentils tempered with ghee, mustard seeds, curry leaves, and dry chillies.", servingInformation: "Serves 8–10 Rotis", isVeg: true, isPopular: false, spiceLevel: "Mild", rating: 3.4, displayRating: 3.4, ratingCount: 50, totalRating: 170.0 },
    { name: "Chanaga Masala (Full)", category: "Veg Curries", price: 100, description: "Hearty chickpea curry cooked in authentic spicy North Indian onion-tomato gravy.", servingInformation: "Serves 8–10 Rotis", isVeg: true, isPopular: false, spiceLevel: "Spicy", rating: 3.8, displayRating: 3.8, ratingCount: 85, totalRating: 323.0 },
    { name: "Chanaga Masala (Half)", category: "Veg Curries", price: 70, description: "Half portion of authentic chickpea curry slow-cooked with roasted spices and herbs.", servingInformation: "Serves 8–10 Rotis", isVeg: true, isPopular: false, spiceLevel: "Spicy", rating: 3.5, displayRating: 3.5, ratingCount: 45, totalRating: 157.5 },

    // Fried Rice
    { name: "Veg Fried Rice", category: "Fried Rice", price: 110, description: "Wok-tossed aromatic basmati rice with finely chopped fresh vegetables and light soya.", servingInformation: "Serves 1–2 People", isVeg: true, isPopular: true, spiceLevel: "Mild", rating: 4.5, displayRating: 4.5, ratingCount: 310, totalRating: 1395.0 },
    { name: "Kaju Fried Rice", category: "Fried Rice", price: 170, description: "Fragrant basmati rice fried with golden roasted cashews, veggies, and subtle white pepper.", servingInformation: "Serves 1–2 People", isVeg: true, isPopular: false, spiceLevel: "Mild", rating: 4.3, displayRating: 4.3, ratingCount: 190, totalRating: 817.0 },
    { name: "Kaju Paneer Fried Rice", category: "Fried Rice", price: 180, description: "Deluxe fried rice loaded with crispy paneer cubes, roasted cashews, and aromatic spices.", servingInformation: "Serves 1–2 People", isVeg: true, isPopular: false, spiceLevel: "Medium", rating: 4.4, displayRating: 4.4, ratingCount: 220, totalRating: 968.0 },
    { name: "Jeera Rice", category: "Fried Rice", price: 110, description: "Long-grain basmati rice tempered with aromatic cumin seeds and fresh ghee.", servingInformation: "Serves 1–2 People", isVeg: true, isPopular: false, spiceLevel: "Mild", rating: 4.1, displayRating: 4.1, ratingCount: 130, totalRating: 533.0 },
    { name: "Paneer Fried Rice", category: "Fried Rice", price: 170, description: "Savory basmati rice tossed with marinated cottage cheese cubes and fresh vegetables.", servingInformation: "Serves 1–2 People", isVeg: true, isPopular: true, spiceLevel: "Medium", rating: 4.6, displayRating: 4.6, ratingCount: 360, totalRating: 1656.0 },
    { name: "Egg Fried Rice", category: "Fried Rice", price: 130, description: "Classic Indo-Chinese fried rice tossed with scrambled eggs, veggies, and dark soya sauce.", servingInformation: "Serves 1–2 People", isVeg: false, isPopular: false, spiceLevel: "Medium", rating: 4.2, displayRating: 4.2, ratingCount: 195, totalRating: 819.0 },
    { name: "Chicken Fried Rice", category: "Fried Rice", price: 190, description: "Wok-tossed basmati rice with juicy chicken and aromatic spices.", servingInformation: "Serves 1–2 People", isVeg: false, isPopular: true, spiceLevel: "Medium", rating: 4.7, displayRating: 4.7, ratingCount: 386, totalRating: 1814.2 },
    { name: "SP Chicken Fried Rice", category: "Fried Rice", price: 200, description: "Special signature fried rice packed with double chicken, eggs, cashews, and fiery seasonings.", servingInformation: "Serves 1–2 People", isVeg: false, isPopular: true, spiceLevel: "Spicy", rating: 4.9, displayRating: 4.9, ratingCount: 600, totalRating: 2940.0 },

    // Rotis
    { name: "Pulka", category: "Rotis", price: 7, description: "Soft, puffed whole wheat flatbread freshly baked on open fire without oil.", servingInformation: "1 Piece", isVeg: true, isPopular: false, spiceLevel: "Mild", rating: 4.2, displayRating: 4.2, ratingCount: 450, totalRating: 1890.0 },

    // Non-Veg Starters
    { name: "Talakai Fry", category: "Non-Veg Starters", price: 259, description: "Traditional goat head meat dry fried with crushed black pepper, chillies, and curry leaves.", servingInformation: "Serves 2–3 People", isVeg: false, isPopular: false, spiceLevel: "Spicy", rating: 3.6, displayRating: 3.6, ratingCount: 55, totalRating: 198.0 },
    { name: "Chilli Chicken", category: "Non-Veg Starters", price: 210, description: "Crispy chicken pieces tossed with green chillies, capsicum, garlic, and tangy soya sauce.", servingInformation: "Serves 2–3 People", isVeg: false, isPopular: true, spiceLevel: "Spicy", rating: 4.7, displayRating: 4.7, ratingCount: 480, totalRating: 2256.0 },
    { name: "Chicken Wings", category: "Non-Veg Starters", price: 210, description: "Juicy chicken wings coated in spicy batter, deep-fried, and seasoned with local herbs.", servingInformation: "Serves 2–3 People", isVeg: false, isPopular: true, spiceLevel: "Spicy", rating: 4.6, displayRating: 4.6, ratingCount: 310, totalRating: 1426.0 },
    { name: "Chicken Roast", category: "Non-Veg Starters", price: 200, description: "Tender chicken pieces pan-roasted with freshly ground aromatic spices and onions.", servingInformation: "Serves 2–3 People", isVeg: false, isPopular: true, spiceLevel: "Medium", rating: 4.7, displayRating: 4.7, ratingCount: 410, totalRating: 1927.0 },
    { name: "Boneless Roast Chicken", category: "Non-Veg Starters", price: 210, description: "Succulent boneless chicken morsels slow-roasted with spicy dhaba masala and ginger.", servingInformation: "Serves 2–3 People", isVeg: false, isPopular: false, spiceLevel: "Medium", rating: 4.4, displayRating: 4.4, ratingCount: 230, totalRating: 1012.0 },
    { name: "Roast Fry Chicken", category: "Non-Veg Starters", price: 220, description: "Crispy fried chicken tossed with caramelized onions, green chillies, and black pepper.", servingInformation: "Serves 2–3 People", isVeg: false, isPopular: false, spiceLevel: "Spicy", rating: 4.3, displayRating: 4.3, ratingCount: 175, totalRating: 752.5 },
    { name: "Kaju Chicken", category: "Non-Veg Starters", price: 270, description: "Rich chicken dry starter fried with crunchy whole cashews and signature red chilli masala.", servingInformation: "Serves 2–3 People", isVeg: false, isPopular: true, spiceLevel: "Medium", rating: 4.8, displayRating: 4.8, ratingCount: 490, totalRating: 2352.0 },
    { name: "Fish Fry", category: "Non-Veg Starters", price: 210, description: "Fresh fish fillets marinated in authentic spices and shallow fried to crispy gold.", servingInformation: "Serves 2–3 People", isVeg: false, isPopular: true, spiceLevel: "Medium", rating: 4.6, displayRating: 4.6, ratingCount: 350, totalRating: 1610.0 },
    { name: "Chilli Fish", category: "Non-Veg Starters", price: 210, description: "Tender fish bites wok-fried with bell peppers, chillies, and garlic-soya glaze.", servingInformation: "Serves 2–3 People", isVeg: false, isPopular: false, spiceLevel: "Spicy", rating: 4.3, displayRating: 4.3, ratingCount: 160, totalRating: 688.0 },
    { name: "Chilli Prawns", category: "Non-Veg Starters", price: 250, description: "Fresh prawns tossed with fiery red chillies, garlic, and Indo-Chinese sauces.", servingInformation: "Serves 2–3 People", isVeg: false, isPopular: false, spiceLevel: "Spicy", rating: 4.4, displayRating: 4.4, ratingCount: 185, totalRating: 814.0 },
    { name: "Loose Prawns", category: "Non-Veg Starters", price: 250, description: "Crispy batter-fried prawns tossed with onions, green chillies, and aromatic pepper.", servingInformation: "Serves 2–3 People", isVeg: false, isPopular: false, spiceLevel: "Medium", rating: 4.5, displayRating: 4.5, ratingCount: 210, totalRating: 945.0 },
    { name: "Pethallu Fry", category: "Non-Veg Starters", price: 249, description: "Traditional fresh crab dry fry cooked with village spices, garlic, and curry leaves.", servingInformation: "Serves 2–3 People", isVeg: false, isPopular: false, spiceLevel: "Spicy", rating: 3.5, displayRating: 3.5, ratingCount: 48, totalRating: 168.0 },
    { name: "Kouju Pitta (1)", category: "Non-Veg Starters", price: 140, description: "Single Japanese quail marinated in local spices and deep-fried till crispy.", servingInformation: "Serves 2–3 People", isVeg: false, isPopular: false, spiceLevel: "Spicy", rating: 3.7, displayRating: 3.7, ratingCount: 62, totalRating: 229.4 },
    { name: "Kouju Pitta (2)", category: "Non-Veg Starters", price: 240, description: "Two Japanese quails pan-roasted with spicy red chilli and garlic pepper marinade.", servingInformation: "Serves 2–3 People", isVeg: false, isPopular: false, spiceLevel: "Spicy", rating: 3.8, displayRating: 3.8, ratingCount: 78, totalRating: 296.4 },

    // Non-Veg Curries
    { name: "Talakai Curry", category: "Non-Veg Curries", price: 250, description: "Rich spicy goat head curry slow-cooked in traditional clay pot style gravy.", servingInformation: "Serves 8–10 Rotis", isVeg: false, isPopular: false, spiceLevel: "Spicy", rating: 3.3, displayRating: 3.3, ratingCount: 42, totalRating: 138.6 },
    { name: "Chicken (Roast Curry)", category: "Non-Veg Curries", price: 220, description: "Roasted chicken chunks simmered in thick spicy onion-tomato gravy with curry leaves.", servingInformation: "Serves 8–10 Rotis", isVeg: false, isPopular: true, spiceLevel: "Spicy", rating: 4.6, displayRating: 4.6, ratingCount: 380, totalRating: 1748.0 },
    { name: "Chicken Wings Curry", category: "Non-Veg Curries", price: 200, description: "Juicy chicken wings cooked in aromatic gravy with ground coriander and cumin.", servingInformation: "Serves 8–10 Rotis", isVeg: false, isPopular: false, spiceLevel: "Medium", rating: 4.2, displayRating: 4.2, ratingCount: 140, totalRating: 588.0 },
    { name: "Kaju Chicken Curry", category: "Non-Veg Curries", price: 305, description: "Royal chicken curry blended with whole cashews in velvety butter onion gravy.", servingInformation: "Serves 8–10 Rotis", isVeg: false, isPopular: true, spiceLevel: "Medium", rating: 4.8, displayRating: 4.8, ratingCount: 460, totalRating: 2208.0 },
    { name: "Boneless Chicken", category: "Non-Veg Curries", price: 200, description: "Tender boneless chicken pieces cooked in thick flavorful dhaba style masala gravy.", servingInformation: "Serves 8–10 Rotis", isVeg: false, isPopular: false, spiceLevel: "Medium", rating: 4.3, displayRating: 4.3, ratingCount: 190, totalRating: 817.0 },
    { name: "Bone Chicken (Full) 7 pcs", category: "Non-Veg Curries", price: 190, description: "Full portion of 7 bone-in chicken pieces cooked in authentic spicy Andhra gravy.", servingInformation: "Serves 8–10 Rotis", isVeg: false, isPopular: false, spiceLevel: "Spicy", rating: 4.1, displayRating: 4.1, ratingCount: 165, totalRating: 676.5 },
    { name: "Bone Chicken (Half) 5 pcs", category: "Non-Veg Curries", price: 140, description: "Half portion of 5 bone-in chicken pieces cooked in rich spiced country gravy.", servingInformation: "Serves 8–10 Rotis", isVeg: false, isPopular: false, spiceLevel: "Spicy", rating: 4.0, displayRating: 4.0, ratingCount: 110, totalRating: 440.0 },
    { name: "Mogal Boneless Chicken", category: "Non-Veg Curries", price: 230, description: "Mughlai style boneless chicken curry rich with cream, almonds, and aromatic spices.", servingInformation: "Serves 8–10 Rotis", isVeg: false, isPopular: false, spiceLevel: "Mild", rating: 4.4, displayRating: 4.4, ratingCount: 205, totalRating: 902.0 },
    { name: "Mogal Bone Chicken", category: "Non-Veg Curries", price: 220, description: "Mughlai style bone-in chicken curry cooked with fragrant spices and butter.", servingInformation: "Serves 8–10 Rotis", isVeg: false, isPopular: false, spiceLevel: "Mild", rating: 4.2, displayRating: 4.2, ratingCount: 135, totalRating: 567.0 },
    { name: "Fish Curry", category: "Non-Veg Curries", price: 219, description: "Fresh river fish cooked in tamarind-infused tangy and fiery spicy gravy.", servingInformation: "Serves 8–10 Rotis", isVeg: false, isPopular: true, spiceLevel: "Spicy", rating: 4.5, displayRating: 4.5, ratingCount: 290, totalRating: 1305.0 },
    { name: "Prawns Curry", category: "Non-Veg Curries", price: 230, description: "Fresh sea prawns simmered in coconut and chilli-flavored traditional Andhra gravy.", servingInformation: "Serves 8–10 Rotis", isVeg: false, isPopular: true, spiceLevel: "Spicy", rating: 4.6, displayRating: 4.6, ratingCount: 320, totalRating: 1472.0 },
    { name: "Pethallu Curry", category: "Non-Veg Curries", price: 250, description: "Fresh crab cooked in spicy roasted garlic and black pepper country gravy.", servingInformation: "Serves 8–10 Rotis", isVeg: false, isPopular: false, spiceLevel: "Spicy", rating: 3.4, displayRating: 3.4, ratingCount: 38, totalRating: 129.2 },
    { name: "Kouju Pitta Curry (1)", category: "Non-Veg Curries", price: 140, description: "Single quail cooked in spicy traditional ginger-garlic and onion curry.", servingInformation: "Serves 8–10 Rotis", isVeg: false, isPopular: false, spiceLevel: "Spicy", rating: 3.6, displayRating: 3.6, ratingCount: 52, totalRating: 187.2 },
    { name: "Kouju Pitta Curry (2)", category: "Non-Veg Curries", price: 240, description: "Two quails slow-cooked in thick spicy country masala gravy with coriander.", servingInformation: "Serves 8–10 Rotis", isVeg: false, isPopular: false, spiceLevel: "Spicy", rating: 3.7, displayRating: 3.7, ratingCount: 68, totalRating: 251.6 },
    { name: "Anda Tomato", category: "Non-Veg Curries", price: 100, description: "Hard-boiled eggs simmered in tangy spiced tomato and cumin onion gravy.", servingInformation: "Serves 8–10 Rotis", isVeg: false, isPopular: false, spiceLevel: "Medium", rating: 3.6, displayRating: 3.6, ratingCount: 72, totalRating: 259.2 },
    { name: "Anda Bujji", category: "Non-Veg Curries", price: 100, description: "Scrambled eggs stir-fried with green chillies, onions, and fresh coriander.", servingInformation: "Serves 8–10 Rotis", isVeg: false, isPopular: false, spiceLevel: "Medium", rating: 3.5, displayRating: 3.5, ratingCount: 60, totalRating: 210.0 },
    { name: "Anda Keema", category: "Non-Veg Curries", price: 100, description: "Minced boiled eggs cooked in thick spicy minced gravy with garlicky herbs.", servingInformation: "Serves 8–10 Rotis", isVeg: false, isPopular: false, spiceLevel: "Spicy", rating: 3.7, displayRating: 3.7, ratingCount: 76, totalRating: 281.2 },
    { name: "Anda Tadaka", category: "Non-Veg Curries", price: 110, description: "Boiled eggs tempered with mustard seeds, curry leaves, and spicy red gravy.", servingInformation: "Serves 8–10 Rotis", isVeg: false, isPopular: false, spiceLevel: "Spicy", rating: 3.8, displayRating: 3.8, ratingCount: 88, totalRating: 334.4 },
    { name: "Anda Palak", category: "Non-Veg Curries", price: 110, description: "Hard-boiled eggs cooked in smooth, garlic-infused creamy spinach gravy.", servingInformation: "Serves 8–10 Rotis", isVeg: false, isPopular: false, spiceLevel: "Mild", rating: 3.6, displayRating: 3.6, ratingCount: 64, totalRating: 230.4 }
  ];

  let itemCount = 0;
  for (const item of menuItems) {
    const categoryId = categories[item.category].id;
    await prisma.menuItem.create({
      data: {
        name: item.name,
        price: item.price,
        description: item.description,
        servingInformation: item.servingInformation,
        image: "",
        isVeg: item.isVeg,
        isAvailable: true,
        isPopular: item.isPopular,
        spiceLevel: item.spiceLevel,
        rating: item.rating,
        displayRating: item.displayRating,
        ratingCount: item.ratingCount,
        totalRating: item.totalRating,
        categoryId,
      },
    });
    itemCount++;
  }

  console.log(`   ✅ Created ${itemCount} rich menu items\n`);

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
