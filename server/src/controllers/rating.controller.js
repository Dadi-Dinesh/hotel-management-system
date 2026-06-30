const prisma = require("../config/db");

/**
 * Submit ratings and feedback for an order session
 * POST /api/ratings
 */
const submitRatings = async (req, res, next) => {
  try {
    const { sessionId, ratings, overallFeedback, customerId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required.",
      });
    }

    // 1. Find the session and its non-cancelled orders
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        orders: {
          where: {
            status: { not: "CANCELLED" },
          },
          include: {
            items: true,
          },
        },
      },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Active session not found.",
      });
    }

    if (session.orders.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No orders found for this session to rate.",
      });
    }

    // 2. Map ratings to appropriate orders
    const ratingSubmissions = [];
    const orders = session.orders;

    if (ratings && Array.isArray(ratings)) {
      for (const r of ratings) {
        const { menuItemId, rating, feedback } = r;

        if (!menuItemId || !rating) {
          return res.status(400).json({
            success: false,
            message: "Each rating must have a menuItemId and rating value.",
          });
        }

        if (rating < 1 || rating > 5) {
          return res.status(400).json({
            success: false,
            message: "Rating must be between 1 and 5 stars.",
          });
        }

        // Find which order in this session contains the menuItemId
        const matchingOrder = orders.find((o) =>
          o.items.some((item) => item.menuItemId === menuItemId)
        );

        if (!matchingOrder) {
          return res.status(400).json({
            success: false,
            message: `Menu item with ID ${menuItemId} was not ordered in this session.`,
          });
        }

        // Check if rating already exists for this order & menuItem
        const existingRating = await prisma.itemRating.findUnique({
          where: {
            orderId_menuItemId: {
              orderId: matchingOrder.id,
              menuItemId,
            },
          },
        });

        if (existingRating) {
          return res.status(400).json({
            success: false,
            message: "You have already submitted a rating for this order's items.",
          });
        }

        ratingSubmissions.push({
          orderId: matchingOrder.id,
          menuItemId,
          rating: parseInt(rating),
          feedback: feedback || null,
          customerId: customerId || null,
        });
      }
    }

    // Save ratings in a transaction
    await prisma.$transaction(async (tx) => {
      // 3. Create Item Ratings
      for (const submission of ratingSubmissions) {
        await tx.itemRating.create({
          data: submission,
        });
      }

      // 4. Create Overall Order Feedback if provided
      if (overallFeedback && overallFeedback.trim() !== "") {
        // Associate with the first order in the session
        const primaryOrderId = orders[0].id;

        const existingFeedback = await tx.orderFeedback.findUnique({
          where: { orderId: primaryOrderId },
        });

        if (!existingFeedback) {
          await tx.orderFeedback.create({
            data: {
              orderId: primaryOrderId,
              overallFeedback: overallFeedback.trim(),
              customerId: customerId || null,
            },
          });
        }
      }
    });

    res.json({
      success: true,
      message: "Thank you for your rating and feedback! 🙏",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch ratings overview for customer menu
 * GET /api/ratings/menu
 */
const getMenuRatings = async (req, res, next) => {
  try {
    const ratings = await prisma.itemRating.groupBy({
      by: ["menuItemId"],
      _avg: { rating: true },
      _count: { rating: true },
    });

    const ratingsMap = {};
    ratings.forEach((r) => {
      ratingsMap[r.menuItemId] = {
        averageRating: r._avg.rating ? parseFloat(r._avg.rating.toFixed(1)) : 0,
        totalReviews: r._count.rating,
      };
    });

    res.json({
      success: true,
      data: ratingsMap,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch list of reviews for admin dashboard
 * GET /api/ratings/admin/reviews
 */
const getAdminReviews = async (req, res, next) => {
  try {
    const { menuItemId } = req.query;

    const where = {};
    if (menuItemId) {
      where.menuItemId = menuItemId;
    }

    // Fetch food item reviews
    const reviews = await prisma.itemRating.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        menuItem: {
          select: {
            name: true,
            image: true,
            category: { select: { name: true } },
          },
        },
        order: {
          select: {
            orderNumber: true,
            session: {
              select: {
                table: { select: { code: true } },
              },
            },
          },
        },
      },
    });

    // Fetch overall experience feedbacks if no specific menu item is selected
    let overallFeedbacks = [];
    if (!menuItemId) {
      overallFeedbacks = await prisma.orderFeedback.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          order: {
            select: {
              orderNumber: true,
              session: {
                select: {
                  table: { select: { code: true } },
                },
              },
            },
          },
        },
      });
    }

    res.json({
      success: true,
      data: {
        reviews: reviews.map((r) => ({
          id: r.id,
          menuItemId: r.menuItemId,
          itemName: r.menuItem.name,
          itemImage: r.menuItem.image,
          categoryName: r.menuItem.category?.name,
          rating: r.rating,
          feedback: r.feedback,
          orderNumber: r.order.orderNumber,
          tableCode: r.order.session?.table?.code || "N/A",
          createdAt: r.createdAt,
        })),
        overallFeedbacks: overallFeedbacks.map((f) => ({
          id: f.id,
          feedback: f.overallFeedback,
          orderNumber: f.order.orderNumber,
          tableCode: f.order.session?.table?.code || "N/A",
          createdAt: f.createdAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch rating stats for admin dashboard
 * GET /api/ratings/admin/stats
 */
const getAdminStats = async (req, res, next) => {
  try {
    // 1. Overall stats
    const ratingStats = await prisma.itemRating.aggregate({
      _avg: { rating: true },
      _count: { rating: true },
    });

    // 2. Average rating and total reviews per menu item
    const itemRatings = await prisma.itemRating.groupBy({
      by: ["menuItemId"],
      _avg: { rating: true },
      _count: { rating: true },
    });

    // Load full menu items to match names
    const menuItems = await prisma.menuItem.findMany({
      select: {
        id: true,
        name: true,
        category: { select: { name: true } },
      },
    });

    const itemStats = menuItems.map((item) => {
      const stats = itemRatings.find((r) => r.menuItemId === item.id);
      return {
        id: item.id,
        name: item.name,
        categoryName: item.category?.name,
        averageRating: stats?._avg.rating ? parseFloat(stats._avg.rating.toFixed(2)) : 0,
        totalReviews: stats?._count.rating || 0,
      };
    });

    res.json({
      success: true,
      data: {
        overallAverage: ratingStats._avg.rating ? parseFloat(ratingStats._avg.rating.toFixed(2)) : 0,
        totalReviews: ratingStats._count.rating || 0,
        itemStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitRatings,
  getMenuRatings,
  getAdminReviews,
  getAdminStats,
};
