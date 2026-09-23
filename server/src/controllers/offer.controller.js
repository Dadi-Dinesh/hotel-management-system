const prisma = require("../config/db");
const { logAudit } = require("../utils/auditLog");

/**
 * Derive a read-only lifecycle status from isEnabled/startsAt/endsAt.
 * Never stored — always computed fresh so it can't drift from reality.
 */
const computeOfferStatus = (offer, now = new Date()) => {
  if (!offer.isEnabled) return "DISABLED";
  if (offer.startsAt && new Date(offer.startsAt) > now) return "SCHEDULED";
  if (offer.endsAt && new Date(offer.endsAt) < now) return "EXPIRED";
  return "ACTIVE";
};

const withStatus = (offer) => ({ ...offer, computedStatus: computeOfferStatus(offer) });

/**
 * List all offers — restaurant-scoped.
 * GET /api/offers
 */
const getOffers = async (req, res, next) => {
  try {
    const offers = await prisma.offer.findMany({
      where: req.restaurantId ? { restaurantId: req.restaurantId } : {},
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: offers.map(withStatus) });
  } catch (error) {
    next(error);
  }
};

/**
 * Create an offer — stamped with req.restaurantId.
 * POST /api/offers
 */
const createOffer = async (req, res, next) => {
  try {
    const { title, description, discountType, discountValue, code, startsAt, endsAt, isEnabled } = req.body;

    if (!req.restaurantId) {
      return res.status(400).json({ success: false, message: "Select a restaurant before managing offers." });
    }

    if (!title || discountValue == null) {
      return res.status(400).json({
        success: false,
        message: "Title and discount value are required.",
      });
    }

    const offer = await prisma.offer.create({
      data: {
        title,
        description: description || null,
        discountType: discountType === "FLAT" ? "FLAT" : "PERCENTAGE",
        discountValue: parseFloat(discountValue),
        code: code || null,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        isEnabled: isEnabled ?? true,
        restaurantId: req.restaurantId,
      },
    });

    logAudit({ action: "offer.created", restaurantId: req.restaurantId, userId: req.user?.id, metadata: { offerId: offer.id, title: offer.title } });

    res.status(201).json({ success: true, message: "Offer created.", data: withStatus(offer) });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ success: false, message: "An offer with this code already exists." });
    }
    next(error);
  }
};

/**
 * Update an offer (also used for enable/disable toggle) — restaurant-scoped.
 * PATCH /api/offers/:id
 */
const updateOffer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, discountType, discountValue, code, startsAt, endsAt, isEnabled } = req.body;

    const existing = await prisma.offer.findUnique({ where: { id } });
    if (!existing || (req.restaurantId && existing.restaurantId !== req.restaurantId)) {
      return res.status(404).json({ success: false, message: "Offer not found." });
    }

    const data = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description || null;
    if (discountType !== undefined) data.discountType = discountType === "FLAT" ? "FLAT" : "PERCENTAGE";
    if (discountValue !== undefined) data.discountValue = parseFloat(discountValue);
    if (code !== undefined) data.code = code || null;
    if (startsAt !== undefined) data.startsAt = startsAt ? new Date(startsAt) : null;
    if (endsAt !== undefined) data.endsAt = endsAt ? new Date(endsAt) : null;
    if (isEnabled !== undefined) data.isEnabled = isEnabled;

    const offer = await prisma.offer.update({ where: { id }, data });

    logAudit({ action: "offer.updated", restaurantId: existing.restaurantId, userId: req.user?.id, metadata: { offerId: offer.id, fields: Object.keys(data) } });

    res.json({ success: true, message: "Offer updated.", data: withStatus(offer) });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ success: false, message: "An offer with this code already exists." });
    }
    next(error);
  }
};

/**
 * Duplicate an offer — copies everything except code (must stay unique) and usage count.
 * POST /api/offers/:id/duplicate
 */
const duplicateOffer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const original = await prisma.offer.findUnique({ where: { id } });
    if (!original || (req.restaurantId && original.restaurantId !== req.restaurantId)) {
      return res.status(404).json({ success: false, message: "Offer not found." });
    }

    const copy = await prisma.offer.create({
      data: {
        title: `${original.title} (Copy)`,
        description: original.description,
        discountType: original.discountType,
        discountValue: original.discountValue,
        code: null,
        startsAt: original.startsAt,
        endsAt: original.endsAt,
        isEnabled: false,
        restaurantId: original.restaurantId,
      },
    });

    res.status(201).json({ success: true, message: "Offer duplicated.", data: withStatus(copy) });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an offer — restaurant-scoped.
 * DELETE /api/offers/:id
 */
const deleteOffer = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.offer.findUnique({ where: { id } });
    if (!existing || (req.restaurantId && existing.restaurantId !== req.restaurantId)) {
      return res.status(404).json({ success: false, message: "Offer not found." });
    }

    await prisma.offer.delete({ where: { id } });
    res.json({ success: true, message: "Offer deleted." });
  } catch (error) {
    next(error);
  }
};

module.exports = { getOffers, createOffer, updateOffer, duplicateOffer, deleteOffer };
