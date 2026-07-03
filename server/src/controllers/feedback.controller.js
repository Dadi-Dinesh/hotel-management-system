const prisma = require("../config/db");

/**
 * Get all feedback
 * GET /api/feedbacks
 */
const getAllFeedbacks = async (req, res, next) => {
  try {
    const feedbacks = await prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        menuItem: true,
        session: {
          include: {
            table: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: feedbacks,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllFeedbacks,
};
