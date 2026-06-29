const prisma = require("../config/db");

/**
 * Get all categories
 * GET /api/categories
 */
const getCategories = async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
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
 * Create a new category
 * POST /api/categories
 */
const createCategory = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required.",
      });
    }

    const category = await prisma.category.create({
      data: { name: name.trim() },
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
 * Update a category
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
 * Delete a category
 * DELETE /api/categories/:id
 */
const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

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
