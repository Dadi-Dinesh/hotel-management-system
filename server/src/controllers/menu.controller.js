const prisma = require("../config/db");
const { uploadToCloudinary, deleteFromCloudinary } = require("../middleware/upload");

/**
 * Get full menu grouped by category
 * GET /api/menu
 */
const getMenu = async (req, res, next) => {
  try {
    const { available } = req.query;

    const where = {};
    if (available === "true") {
      where.isAvailable = true;
    }

    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        items: {
          where,
          orderBy: { name: "asc" },
        },
      },
    });

    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single menu item
 * GET /api/menu/:id
 */
const getMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    const item = await prisma.menuItem.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found.",
      });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a new menu item
 * POST /api/menu
 */
const addMenuItem = async (req, res, next) => {
  try {
    const { name, price, categoryId, servingInformation, description, calories, isAvailable } = req.body;

    if (!name || !price || !categoryId) {
      return res.status(400).json({
        success: false,
        message: "Name, price, and category are required.",
      });
    }

    let imageUrl = null;
    let publicId = null;

    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer);
      imageUrl = uploadResult.secure_url;
      publicId = uploadResult.public_id;
    }

    const item = await prisma.menuItem.create({
      data: {
        name,
        price: parseFloat(price),
        categoryId,
        servingInformation: servingInformation || null,
        description: description || null,
        calories: calories ? parseInt(calories, 10) : null,
        imageUrl,
        publicId,
        image: imageUrl, // For backward compatibility
        isAvailable: isAvailable !== undefined ? (isAvailable === "true" || isAvailable === true) : true,
      },
      include: { category: true },
    });

    res.status(201).json({
      success: true,
      message: `${name} added to menu.`,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a menu item
 * PATCH /api/menu/:id
 */
const updateMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, price, categoryId, servingInformation, description, calories, removeImage, isAvailable } = req.body;

    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found.",
      });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (servingInformation !== undefined) updateData.servingInformation = servingInformation || null;
    if (description !== undefined) updateData.description = description || null;
    if (calories !== undefined) updateData.calories = calories ? parseInt(calories, 10) : null;
    if (isAvailable !== undefined) {
      updateData.isAvailable = isAvailable === "true" || isAvailable === true;
    }

    // Handle image upload / replacement / removal
    if (req.file) {
      // Delete old image from Cloudinary if it exists
      if (existing.publicId) {
        await deleteFromCloudinary(existing.publicId);
      } else if (existing.image) {
        await deleteFromCloudinary(existing.image);
      }

      const uploadResult = await uploadToCloudinary(req.file.buffer);
      updateData.imageUrl = uploadResult.secure_url;
      updateData.publicId = uploadResult.public_id;
      updateData.image = uploadResult.secure_url; // backward compatibility
    } else if (removeImage === "true" || removeImage === true) {
      // Delete old image from Cloudinary if it exists
      if (existing.publicId) {
        await deleteFromCloudinary(existing.publicId);
      } else if (existing.image) {
        await deleteFromCloudinary(existing.image);
      }

      updateData.imageUrl = null;
      updateData.publicId = null;
      updateData.image = null;
    }

    const item = await prisma.menuItem.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });

    res.json({
      success: true,
      message: `${item.name} updated.`,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a menu item
 * DELETE /api/menu/:id
 */
const deleteMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found.",
      });
    }

    // Delete image from Cloudinary
    if (existing.publicId) {
      await deleteFromCloudinary(existing.publicId);
    } else if (existing.image) {
      await deleteFromCloudinary(existing.image);
    }

    // Delete associated feedbacks and order items first to satisfy foreign key constraints
    await prisma.feedback.deleteMany({ where: { menuItemId: id } });
    await prisma.orderItem.deleteMany({ where: { menuItemId: id } });

    // Then delete the menu item itself
    await prisma.menuItem.delete({ where: { id } });

    res.json({
      success: true,
      message: `${existing.name} deleted from menu.`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMenu, getMenuItem, addMenuItem, updateMenuItem, deleteMenuItem };
