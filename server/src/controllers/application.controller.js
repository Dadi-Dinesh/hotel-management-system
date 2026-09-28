/**
 * application.controller — the new front door for becoming a ServeSync
 * restaurant: submit → review → approve/reject, replacing instant self-serve
 * signup. Approval reuses restaurantProvisioning.js (the exact same
 * transaction the legacy /api/restaurants onboarding endpoint uses) rather
 * than duplicating restaurant/table/QR-token creation.
 */
const prisma = require("../config/db");
const { uploadToCloudinary } = require("../middleware/upload");
const { provisionRestaurant } = require("../services/restaurantProvisioning");
const { generateTempPassword } = require("../utils/tokenUtils");
const { logAudit } = require("../utils/auditLog");
const { sendEmail } = require("../services/email/emailService");
const {
  applicationReceivedEmail,
  applicationApprovedEmail,
  applicationRejectedEmail,
} = require("../services/email/templates");
const { sendWhatsApp, resendWhatsAppMessage } = require("../services/whatsapp/whatsappService");

function getClientBaseUrl() {
  const configured = process.env.CLIENT_URL?.split(",")[0]?.trim();
  return configured || "https://hotel-management-system-psi-kohl.vercel.app";
}

const PUBLIC_STATUS_FIELDS = {
  id: true,
  restaurantName: true,
  status: true,
  rejectionReason: true,
  createdAt: true,
  reviewedAt: true,
};

/**
 * Submit a new restaurant application — public, multipart (logo upload).
 * Inline validation, matching the existing convention for every other
 * multipart endpoint in this codebase (form fields arrive as strings
 * regardless of logical type, so Zod-coercing them isn't worth the risk
 * on a route with no prior tested behavior to preserve — this one's brand
 * new, so the convention is chosen for consistency, not caution).
 * POST /api/applications
 */
const submitApplication = async (req, res, next) => {
  try {
    const {
      restaurantName,
      ownerName,
      phone,
      whatsapp,
      email,
      address,
      city,
      state,
      pincode,
      cuisine,
      tableCount,
      printerModel,
      existingPos,
      notes,
    } = req.body;

    const required = { restaurantName, ownerName, phone, whatsapp, email, address, city, state, pincode, cuisine };
    const missing = Object.entries(required).filter(([, v]) => !v || !String(v).trim());
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required field(s): ${missing.map(([k]) => k).join(", ")}.`,
      });
    }

    const numTables = Math.min(Math.max(parseInt(tableCount, 10) || 1, 1), 200);

    let logoUrl = null;
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, "servesync-applications");
      logoUrl = uploadResult.secure_url;
    }

    const application = await prisma.restaurantApplication.create({
      data: {
        restaurantName: String(restaurantName).trim(),
        ownerName: String(ownerName).trim(),
        phone: String(phone).trim(),
        whatsapp: String(whatsapp).trim(),
        email: String(email).trim().toLowerCase(),
        address: String(address).trim(),
        city: String(city).trim(),
        state: String(state).trim(),
        pincode: String(pincode).trim(),
        cuisine: String(cuisine).trim(),
        tableCount: numTables,
        logo: logoUrl,
        printerModel: printerModel ? String(printerModel).trim() : null,
        existingPos: existingPos ? String(existingPos).trim() : null,
        notes: notes ? String(notes).trim() : null,
      },
    });

    res.status(201).json({ success: true, message: "Application submitted.", data: application });

    // Real-time Platform Admin notification via Socket.IO (no page refresh)
    try {
      const { getIO } = require("../socket");
      const io = getIO();
      const notifPayload = {
        id: application.id,
        restaurantName: application.restaurantName,
        ownerName: application.ownerName,
        city: application.city,
        tableCount: application.tableCount,
        createdAt: application.createdAt,
        status: application.status,
      };
      io.to("platform:admins").emit("application:new", notifPayload);
      io.emit("application:new", notifPayload);
    } catch (socketErr) {
      // Non-blocking if socket is uninitialized or in test mode
    }

    logAudit({ action: "application.submitted", metadata: { applicationId: application.id, restaurantName: application.restaurantName } });

    const received = applicationReceivedEmail({ ownerName: application.ownerName, restaurantName: application.restaurantName });
    sendEmail({ to: application.email, subject: received.subject, html: received.html }).catch(() => {});
  } catch (error) {
    next(error);
  }
};

/**
 * Public status lookup — requires BOTH email and phone to match, and
 * returns only that one application's status fields. Never exposes any
 * other applicant's information: a non-match returns the same 404 whether
 * the email exists under a different phone or doesn't exist at all.
 * POST /api/applications/status
 */
const checkApplicationStatus = async (req, res, next) => {
  try {
    const { email, phone } = req.body;
    const application = await prisma.restaurantApplication.findFirst({
      where: { email: email.toLowerCase(), phone },
      orderBy: { createdAt: "desc" },
      select: PUBLIC_STATUS_FIELDS,
    });

    if (!application) {
      return res.status(404).json({ success: false, message: "No application found matching that email and phone number." });
    }

    res.json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
};

/**
 * List applications — Platform Owner only. Supports status filter + a
 * simple text search across restaurant/owner name and city.
 * GET /api/platform/applications
 */
const listApplications = async (req, res, next) => {
  try {
    const { status, q } = req.query;
    const where = {};
    if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      where.status = status;
    }
    if (q) {
      where.OR = [
        { restaurantName: { contains: q, mode: "insensitive" } },
        { ownerName: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }

    const applications = await prisma.restaurantApplication.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: applications });
  } catch (error) {
    next(error);
  }
};

/**
 * Full application detail — Platform Owner only.
 * GET /api/platform/applications/:id
 */
const getApplication = async (req, res, next) => {
  try {
    const application = await prisma.restaurantApplication.findUnique({
      where: { id: req.params.id },
      include: { reviewedBy: { select: { id: true, name: true, email: true } }, whatsappMessages: true },
    });
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found." });
    }
    res.json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve — the automation the brief calls "the most important part."
 * Provisions the real tenant via the SAME transaction the legacy onboarding
 * endpoint uses, issues a temporary password, marks the application
 * APPROVED, and fires off (queued, non-blocking) email + WhatsApp
 * notifications. Returns everything the Platform Dashboard needs to render
 * the QR Kit download immediately (raw QR tokens are one-time-visible,
 * exactly like the legacy onboarding response).
 * POST /api/platform/applications/:id/approve
 */
const approveApplication = async (req, res, next) => {
  try {
    const application = await prisma.restaurantApplication.findUnique({ where: { id: req.params.id } });
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found." });
    }
    if (application.status !== "PENDING") {
      return res.status(409).json({ success: false, message: `This application was already ${application.status.toLowerCase()}.` });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: application.email } });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "An account with this applicant's email already exists." });
    }

    const tempPassword = generateTempPassword();

    const result = await provisionRestaurant({
      name: application.restaurantName,
      cuisine: application.cuisine,
      phone: application.phone,
      address: `${application.address}, ${application.city}, ${application.state} ${application.pincode}`,
      logoUrl: application.logo,
      primaryColor: null,
      tableCount: application.tableCount,
      adminName: application.ownerName,
      adminEmail: application.email,
      adminPassword: tempPassword,
    });

    const updated = await prisma.restaurantApplication.update({
      where: { id: application.id },
      data: {
        status: "APPROVED",
        reviewedByUserId: req.user.id,
        reviewedAt: new Date(),
        restaurantId: result.restaurant.id,
      },
    });

    const dashboardUrl = `${getClientBaseUrl()}/admin/login`;

    res.json({
      success: true,
      message: `${result.restaurant.name} approved and provisioned!`,
      data: {
        application: updated,
        restaurant: result.restaurant,
        admin: { email: result.admin.email, tempPassword },
        // Strip the hash before it ever leaves the server — same rule as
        // the legacy onboarding response this reuses provisionRestaurant from.
        tables: result.tables.map(({ qrTokenHash, ...t }) => t),
        dashboardUrl,
      },
    });

    // Never log tempPassword itself — logAudit's metadata is retained
    // indefinitely and this endpoint's own response already carries it once.
    logAudit({
      action: "application.approved",
      restaurantId: result.restaurant.id,
      userId: req.user.id,
      metadata: { applicationId: application.id, restaurantName: result.restaurant.name, tableCount: result.tables.length },
    });

    const approvedEmail = applicationApprovedEmail({
      ownerName: application.ownerName,
      restaurantName: result.restaurant.name,
      loginEmail: result.admin.email,
      tempPassword,
      dashboardUrl,
      qrKitUrl: dashboardUrl,
    });
    sendEmail({ to: application.email, subject: approvedEmail.subject, html: approvedEmail.html }).catch(() => {});

    const whatsappMessage = `Congratulations! Your ServeSync restaurant "${result.restaurant.name}" has been approved.\n\nYour QR Kit is ready.\nLogin: ${result.admin.email}\nDashboard: ${dashboardUrl}`;
    sendWhatsApp({ to: application.whatsapp, message: whatsappMessage, applicationId: application.id }).catch(() => {});

    // Real-time Platform Admin event
    try {
      const { getIO } = require("../socket");
      const io = getIO();
      io.to("platform:admins").emit("application:approved", { id: application.id, restaurantName: result.restaurant.name });
      io.emit("application:approved", { id: application.id, restaurantName: result.restaurant.name });
    } catch (e) {}
  } catch (error) {
    next(error);
  }
};

/**
 * Reject — requires a reason, sends a polite email, never deletes the record.
 * POST /api/platform/applications/:id/reject
 */
const rejectApplication = async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;
    const application = await prisma.restaurantApplication.findUnique({ where: { id: req.params.id } });
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found." });
    }
    if (application.status !== "PENDING") {
      return res.status(409).json({ success: false, message: `This application was already ${application.status.toLowerCase()}.` });
    }

    const updated = await prisma.restaurantApplication.update({
      where: { id: application.id },
      data: {
        status: "REJECTED",
        reviewedByUserId: req.user.id,
        reviewedAt: new Date(),
        rejectionReason,
      },
    });

    res.json({ success: true, message: "Application rejected.", data: updated });

    logAudit({ action: "application.rejected", userId: req.user.id, metadata: { applicationId: application.id, restaurantName: application.restaurantName, rejectionReason } });

    const rejectedEmail = applicationRejectedEmail({ ownerName: application.ownerName, restaurantName: application.restaurantName, rejectionReason });
    sendEmail({ to: application.email, subject: rejectedEmail.subject, html: rejectedEmail.html }).catch(() => {});

    // Real-time Platform Admin event
    try {
      const { getIO } = require("../socket");
      const io = getIO();
      io.to("platform:admins").emit("application:rejected", { id: application.id, restaurantName: application.restaurantName });
      io.emit("application:rejected", { id: application.id, restaurantName: application.restaurantName });
    } catch (e) {}
  } catch (error) {
    next(error);
  }
};

/**
 * Request more information — email-only nudge, doesn't change status
 * (the model's status values stay exactly Pending/Approved/Rejected).
 * POST /api/platform/applications/:id/request-info
 */
const requestMoreInfo = async (req, res, next) => {
  try {
    const { message } = req.body;
    const application = await prisma.restaurantApplication.findUnique({ where: { id: req.params.id } });
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found." });
    }

    res.json({ success: true, message: "Request sent." });

    logAudit({ action: "application.info_requested", userId: req.user.id, metadata: { applicationId: application.id, message } });

    const { wrapEmail, escapeHtml } = require("../services/email/emailLayout");
    const html = wrapEmail({
      title: "More Information Needed",
      preheader: `A quick follow-up on your ${application.restaurantName} application.`,
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi ${escapeHtml(application.ownerName)},</p>
        <p style="margin:0 0 16px;">We're reviewing your application for <strong>${escapeHtml(application.restaurantName)}</strong> and need a bit more information:</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:#FFF8E7;border:1px solid #EADFC8;border-radius:10px;">
          <tr><td style="padding:16px 20px;">${escapeHtml(message)}</td></tr>
        </table>
        <p style="margin:0;">Reply to this email with the details and we'll continue the review right away.</p>
      `,
    });
    sendEmail({ to: application.email, subject: `A quick question about your ${application.restaurantName} application`, html }).catch(() => {});
  } catch (error) {
    next(error);
  }
};

/**
 * Platform overview statistics: Pending, Approved, Rejected, Active Restaurants, Revenue
 * GET /api/platform/stats
 */
const getPlatformStats = async (req, res, next) => {
  try {
    const [
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      activeRestaurants,
      totalRestaurants,
    ] = await Promise.all([
      prisma.restaurantApplication.count({ where: { status: "PENDING" } }),
      prisma.restaurantApplication.count({ where: { status: "APPROVED" } }),
      prisma.restaurantApplication.count({ where: { status: "REJECTED" } }),
      prisma.restaurant.count({ where: { isActive: true } }),
      prisma.restaurant.count(),
    ]);

    // Platform revenue placeholder calculated from active count
    const platformRevenue = activeRestaurants * 2499;

    res.json({
      success: true,
      data: {
        pendingApplications,
        approvedApplications,
        rejectedApplications,
        activeRestaurants,
        totalRestaurants,
        platformRevenue,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all restaurants across the platform — Platform Owner only.
 * GET /api/platform/restaurants
 */
const listPlatformRestaurants = async (req, res, next) => {
  try {
    const restaurants = await prisma.restaurant.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        users: {
          where: { role: "ADMIN" },
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { tables: true, orders: true },
        },
      },
    });
    res.json({ success: true, data: restaurants });
  } catch (error) {
    next(error);
  }
};

/**
 * Disable or re-enable a restaurant — Platform Owner only.
 * PATCH /api/platform/restaurants/:id/toggle-status
 */
const togglePlatformRestaurantStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const restaurant = await prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found." });
    }
    const updated = await prisma.restaurant.update({
      where: { id },
      data: { isActive: !restaurant.isActive },
    });
    logAudit({
      action: updated.isActive ? "platform.restaurant.activated" : "platform.restaurant.deactivated",
      restaurantId: id,
      userId: req.user.id,
      metadata: { restaurantName: updated.name, isActive: updated.isActive },
    });
    res.json({
      success: true,
      message: `Restaurant ${updated.name} ${updated.isActive ? "activated" : "disabled"}.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resend QR Kit / welcome instructions to restaurant admin — Platform Owner only.
 * POST /api/platform/restaurants/:id/resend-kit
 */
const resendPlatformRestaurantKit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        users: { where: { role: "ADMIN" } },
      },
    });
    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found." });
    }
    const adminUser = restaurant.users[0];
    if (!adminUser) {
      return res.status(400).json({ success: false, message: "No admin user found for this restaurant." });
    }

    const dashboardUrl = `${getClientBaseUrl()}/admin/login`;
    const approvedEmail = applicationApprovedEmail({
      ownerName: adminUser.name,
      restaurantName: restaurant.name,
      loginEmail: adminUser.email,
      tempPassword: "[Your existing password or reset via forgot password]",
      dashboardUrl,
      qrKitUrl: dashboardUrl,
    });
    await sendEmail({ to: adminUser.email, subject: approvedEmail.subject, html: approvedEmail.html });

    const whatsappMessage = `ServeSync QR Kit & Access Link:\nRestaurant: "${restaurant.name}"\nLogin: ${adminUser.email}\nDashboard: ${dashboardUrl}`;
    if (restaurant.phone) {
      await sendWhatsApp({ to: restaurant.phone, message: whatsappMessage });
    }

    logAudit({
      action: "platform.restaurant.kit_resent",
      restaurantId: id,
      userId: req.user.id,
      metadata: { restaurantName: restaurant.name, email: adminUser.email },
    });

    res.json({ success: true, message: `QR Kit resent to ${adminUser.email}.` });
  } catch (error) {
    next(error);
  }
};

/**
 * List WhatsApp outbox messages — Platform Owner only, powers the "resend"
 * UI for messages stuck QUEUED/FAILED because no provider is configured yet.
 * GET /api/platform/whatsapp-messages
 */
const listWhatsAppMessages = async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = status && ["QUEUED", "SENT", "FAILED"].includes(status) ? { status } : {};
    const messages = await prisma.whatsAppMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { application: { select: { id: true, restaurantName: true } } },
    });
    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
};

/**
 * Manually resend one QUEUED/FAILED WhatsApp message — Platform Owner only.
 * POST /api/platform/whatsapp-messages/:id/resend
 */
const resendWhatsAppMessageHandler = async (req, res, next) => {
  try {
    const result = await resendWhatsAppMessage(req.params.id);
    res.json({ success: true, data: result });
    logAudit({ action: "whatsapp.resend_attempted", userId: req.user.id, metadata: { messageId: req.params.id, status: result.status } });
  } catch (error) {
    if (error.message === "Message not found.") {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

module.exports = {
  submitApplication,
  checkApplicationStatus,
  listApplications,
  getApplication,
  approveApplication,
  rejectApplication,
  requestMoreInfo,
  getPlatformStats,
  listPlatformRestaurants,
  togglePlatformRestaurantStatus,
  resendPlatformRestaurantKit,
  listWhatsAppMessages,
  resendWhatsAppMessageHandler,
};
