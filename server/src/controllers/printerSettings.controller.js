const prisma = require("../config/db");
const { logAudit } = require("../utils/auditLog");

const DEFAULTS = {
  billPrinterType: "BROWSER",
  kitchenPrinterType: "BROWSER",
  billPaperWidth: "80mm",
  kotPaperWidth: "80mm",
  copies: 1,
  autoPrintKOT: false,
  autoPrintBill: false,
  networkPrinterIp: null,
  networkPrinterPort: 9100,
};

const ADAPTERS = ["THERMAL_AGENT", "BROWSER", "PDF", "NETWORK", "BLUETOOTH"];
const PAPER_WIDTHS = ["58mm", "80mm", "A4"];

/**
 * Get this restaurant's print settings — creates a default row lazily so
 * every restaurant (including ones onboarded before Phase 8) gets sane
 * defaults without a migration/backfill step.
 * GET /api/restaurants/:slug/printer-settings
 */
const getPrinterSettings = async (req, res, next) => {
  try {
    const restaurant = await prisma.restaurant.findUnique({ where: { slug: req.params.slug } });
    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found." });
    }
    if (req.restaurantId && restaurant.id !== req.restaurantId) {
      return res.status(403).json({ success: false, message: "You can only view your own restaurant's print settings." });
    }

    let settings = await prisma.printerSettings.findUnique({ where: { restaurantId: restaurant.id } });
    if (!settings) {
      settings = await prisma.printerSettings.create({ data: { restaurantId: restaurant.id, ...DEFAULTS } });
    }

    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

/**
 * Update this restaurant's print settings (upsert).
 * PATCH /api/restaurants/:slug/printer-settings
 */
const updatePrinterSettings = async (req, res, next) => {
  try {
    const restaurant = await prisma.restaurant.findUnique({ where: { slug: req.params.slug } });
    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found." });
    }
    if (req.restaurantId && restaurant.id !== req.restaurantId) {
      return res.status(403).json({ success: false, message: "You can only edit your own restaurant's print settings." });
    }

    const {
      billPrinterType,
      kitchenPrinterType,
      billPaperWidth,
      kotPaperWidth,
      copies,
      autoPrintKOT,
      autoPrintBill,
      networkPrinterIp,
      networkPrinterPort,
    } = req.body;

    if (billPrinterType !== undefined && !ADAPTERS.includes(billPrinterType)) {
      return res.status(400).json({ success: false, message: `billPrinterType must be one of ${ADAPTERS.join(", ")}` });
    }
    if (kitchenPrinterType !== undefined && !ADAPTERS.includes(kitchenPrinterType)) {
      return res.status(400).json({ success: false, message: `kitchenPrinterType must be one of ${ADAPTERS.join(", ")}` });
    }
    if (billPaperWidth !== undefined && !PAPER_WIDTHS.includes(billPaperWidth)) {
      return res.status(400).json({ success: false, message: `billPaperWidth must be one of ${PAPER_WIDTHS.join(", ")}` });
    }
    if (kotPaperWidth !== undefined && !PAPER_WIDTHS.includes(kotPaperWidth)) {
      return res.status(400).json({ success: false, message: `kotPaperWidth must be one of ${PAPER_WIDTHS.join(", ")}` });
    }

    const data = {};
    if (billPrinterType !== undefined) data.billPrinterType = billPrinterType;
    if (kitchenPrinterType !== undefined) data.kitchenPrinterType = kitchenPrinterType;
    if (billPaperWidth !== undefined) data.billPaperWidth = billPaperWidth;
    if (kotPaperWidth !== undefined) data.kotPaperWidth = kotPaperWidth;
    if (copies !== undefined) data.copies = Math.max(1, Math.min(5, parseInt(copies, 10) || 1));
    if (autoPrintKOT !== undefined) data.autoPrintKOT = !!autoPrintKOT;
    if (autoPrintBill !== undefined) data.autoPrintBill = !!autoPrintBill;
    if (networkPrinterIp !== undefined) data.networkPrinterIp = networkPrinterIp || null;
    if (networkPrinterPort !== undefined) data.networkPrinterPort = parseInt(networkPrinterPort, 10) || 9100;

    const settings = await prisma.printerSettings.upsert({
      where: { restaurantId: restaurant.id },
      create: { restaurantId: restaurant.id, ...DEFAULTS, ...data },
      update: data,
    });

    logAudit({ action: "printer_settings.updated", restaurantId: restaurant.id, userId: req.user?.id, metadata: data });

    res.json({ success: true, message: "Print settings saved.", data: settings });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPrinterSettings, updatePrinterSettings };
