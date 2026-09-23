const prisma = require("../config/db");

/**
 * Get all categories
 * GET /api/categories (legacy, demo-scoped) | GET /api/restaurants/:slug/categories
 */
const getCategories = async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: { restaurantId: req.restaurantId },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { items: true } },
      },
    });

    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new category — stamped with req.restaurantId (staff).
 * POST /api/categories
 */
const createCategory = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!req.restaurantId) {
      return res.status(400).json({ success: false, message: "Select a restaurant before managing the menu." });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required.",
      });
    }

    const category = await prisma.category.create({
      data: { name: name.trim(), restaurantId: req.restaurantId },
    });

    res.status(201).json({
      success: true,
      message: `Category "${category.name}" created.`,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a category — restaurant-scoped.
 * PATCH /api/categories/:id
 */
const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required.",
      });
    }

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing || (req.restaurantId && existing.restaurantId !== req.restaurantId)) {
      return res.status(404).json({ success: false, message: "Category not found." });
    }

    const category = await prisma.category.update({
      where: { id },
      data: { name: name.trim() },
    });

    res.json({
      success: true,
      message: `Category updated to "${category.name}".`,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a category — restaurant-scoped.
 * DELETE /api/categories/:id
 */
const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing || (req.restaurantId && existing.restaurantId !== req.restaurantId)) {
      return res.status(404).json({ success: false, message: "Category not found." });
    }

    // Check if category has menu items
    const itemCount = await prisma.menuItem.count({
      where: { categoryId: id },
    });

    if (itemCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It has ${itemCount} menu item(s). Remove them first.`,
      });
    }

    const category = await prisma.category.delete({ where: { id } });

    res.json({
      success: true,
      message: `Category "${category.name}" deleted.`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
