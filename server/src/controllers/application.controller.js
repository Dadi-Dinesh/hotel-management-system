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
const { buildStaffAccountSpecs } = require("../services/platformClients");
const { generateTempPassword } = require("../utils/tokenUtils");
const { logAudit } = require("../utils/auditLog");
const { sendEmail } = require("../services/email/emailService");
const { applicationReceivedEmail, applicationRejectedEmail } = require("../services/email/templates");
const { resendWhatsAppMessage } = require("../services/whatsapp/whatsappService");

/** Platform-admin-only realtime event. Never broadcast globally — the
 * payload carries applicant details that customer/staff sockets must not see. */
function emitPlatformEvent(event, payload) {
  try {
    const { getIO } = require("../socket");
    getIO().to("platform:admins").emit(event, payload);
  } catch (e) {
    // Socket not initialised (tests/scripts) — the persisted AuditLog entry is the source of truth.
  }
}

/**
 * Adds explicit approvedAt/approvedBy/rejectedAt/rejectedBy fields derived
 * from the single reviewedAt/reviewedBy pair the schema already stores —
 * an application is only ever reviewed once (PENDING → APPROVED|REJECTED).
 */
function withReviewFields(application) {
  const reviewer = application.reviewedBy
    ? { id: application.reviewedBy.id, name: application.reviewedBy.name, email: application.reviewedBy.email }
    : null;
  const approved = application.status === "APPROVED";
  const rejected = application.status === "REJECTED";
  return {
    ...application,
    submittedAt: application.createdAt,
    approvedAt: approved ? application.reviewedAt : null,
    approvedBy: approved ? reviewer : null,
    rejectedAt: rejected ? application.reviewedAt : null,
    rejectedBy: rejected ? reviewer : null,
  };
}

const REVIEWER_SELECT = { select: { id: true, name: true, email: true } };

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

    // Real-time Platform Admin notification (platform room only).
    emitPlatformEvent("application:new", {
      id: application.id,
      restaurantName: application.restaurantName,
      ownerName: application.ownerName,
      city: application.city,
      tableCount: application.tableCount,
      createdAt: application.createdAt,
      status: application.status,
    });

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
 * List applications — Platform Owner only. Status filter + text search
 * across restaurant/owner name, email, phone and city. `counts` are the
 * real per-status totals (independent of the current filter/search) for
 * the All / Pending / Approved / Rejected tabs.
 * GET /api/platform/applications
 */
const listApplications = async (req, res, next) => {
  try {
    const { status, q } = req.query;
    const where = {};
    if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      where.status = status;
    }
    const term = typeof q === "string" ? q.trim() : "";
    if (term) {
      where.OR = [
        { restaurantName: { contains: term, mode: "insensitive" } },
        { ownerName: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
        { phone: { contains: term } },
        { whatsapp: { contains: term } },
        { city: { contains: term, mode: "insensitive" } },
      ];
    }

    const [applications, grouped] = await Promise.all([
      prisma.restaurantApplication.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { reviewedBy: REVIEWER_SELECT },
      }),
      prisma.restaurantApplication.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);

    const counts = { ALL: 0, PENDING: 0, APPROVED: 0, REJECTED: 0 };
    grouped.forEach((g) => {
      counts[g.status] = g._count._all;
      counts.ALL += g._count._all;
    });

    res.json({ success: true, data: applications.map(withReviewFields), counts });
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
      include: {
        reviewedBy: REVIEWER_SELECT,
        restaurant: { select: { id: true, name: true, slug: true, isActive: true } },
        whatsappMessages: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found." });
    }
    res.json({ success: true, data: withReviewFields(application) });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve — PENDING → APPROVED, and provisions the real tenant in one
 * transaction (restaurant + Restaurant Admin + Captain + Kitchen logins +
 * one table per requested table, each with a secure hashed QR token).
 *
 * Passwords are random and hashed; none are returned here. Delivery is a
 * separate, explicit step (POST /platform/restaurants/:id/credentials) so
 * nothing is ever claimed as "sent" when no provider is configured. The raw
 * QR tokens ARE returned once so the QR package can be downloaded right away
 * — they're printed on public posters anyway and can be rotated at any time.
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
      adminPassword: generateTempPassword(),
      staffAccounts: (slug) => buildStaffAccountSpecs(slug, application.restaurantName),
    });

    // Persist the applicant's contact email on the tenant too (provisioning
    // only takes a phone), so the client profile is complete.
    await prisma.restaurant.update({ where: { id: result.restaurant.id }, data: { email: application.email } });

    const updated = await prisma.restaurantApplication.update({
      where: { id: application.id },
      data: {
        status: "APPROVED",
        reviewedByUserId: req.user.id,
        reviewedAt: new Date(),
        restaurantId: result.restaurant.id,
      },
      include: { reviewedBy: REVIEWER_SELECT },
    });

    res.json({
      success: true,
      message: "Restaurant approved successfully. Credentials and QR package are ready to be sent.",
      data: {
        application: withReviewFields(updated),
        restaurant: { id: result.restaurant.id, name: result.restaurant.name, slug: result.restaurant.slug, primaryColor: result.restaurant.primaryColor },
        accounts: [result.admin, ...result.staff].map((u) => ({ role: u.role, email: u.email })),
        // Strip the hash before it ever leaves the server.
        tables: result.tables.map(({ qrTokenHash, ...t }) => t),
      },
    });

    logAudit({
      action: "application.approved",
      restaurantId: result.restaurant.id,
      userId: req.user.id,
      metadata: { applicationId: application.id, restaurantName: result.restaurant.name, tableCount: result.tables.length },
    });
    logAudit({
      action: "platform.credentials.provisioned",
      restaurantId: result.restaurant.id,
      userId: req.user.id,
      metadata: { restaurantName: result.restaurant.name, roles: ["ADMIN", "CAPTAIN", "KITCHEN"] },
    });
    logAudit({
      action: "platform.qr_package.generated",
      restaurantId: result.restaurant.id,
      userId: req.user.id,
      metadata: { restaurantName: result.restaurant.name, tableCount: result.tables.length },
    });

    emitPlatformEvent("application:approved", { id: application.id, restaurantName: result.restaurant.name });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject — PENDING → REJECTED with an optional reason. Never deletes the
 * record; rejectedAt/rejectedBy are the stored reviewedAt/reviewedBy.
 * POST /api/platform/applications/:id/reject
 */
const rejectApplication = async (req, res, next) => {
  try {
    const rejectionReason = req.body?.rejectionReason?.trim() || null;
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
      include: { reviewedBy: REVIEWER_SELECT },
    });

    res.json({ success: true, message: "Application rejected.", data: withReviewFields(updated) });

    logAudit({ action: "application.rejected", userId: req.user.id, metadata: { applicationId: application.id, restaurantName: application.restaurantName, rejectionReason } });

    const rejectedEmail = applicationRejectedEmail({
      ownerName: application.ownerName,
      restaurantName: application.restaurantName,
      rejectionReason: rejectionReason || "No specific reason was provided.",
    });
    sendEmail({ to: application.email, subject: rejectedEmail.subject, html: rejectedEmail.html }).catch(() => {});

    emitPlatformEvent("application:rejected", { id: application.id, restaurantName: application.restaurantName });
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

    logAudit({ action: "application.info_requested", userId: req.user.id, metadata: { applicationId: application.id, restaurantName: application.restaurantName, message } });

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
 * Platform overview — real counts only.
 * GET /api/platform/stats
 */
const getPlatformStats = async (req, res, next) => {
  try {
    const [pendingApplications, approvedApplications, rejectedApplications, activeRestaurants, totalRestaurants] =
      await Promise.all([
        prisma.restaurantApplication.count({ where: { status: "PENDING" } }),
        prisma.restaurantApplication.count({ where: { status: "APPROVED" } }),
        prisma.restaurantApplication.count({ where: { status: "REJECTED" } }),
        prisma.restaurant.count({ where: { isActive: true } }),
        prisma.restaurant.count(),
      ]);

    res.json({
      success: true,
      data: {
        totalRestaurants,
        activeRestaurants,
        suspendedRestaurants: totalRestaurants - activeRestaurants,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
        totalApplications: pendingApplications + approvedApplications + rejectedApplications,
      },
    });
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
  listWhatsAppMessages,
  resendWhatsAppMessageHandler,
};
