const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const prisma = require("../config/db");
const { generateInviteCode } = require("../utils/tokenUtils");
const { logAudit } = require("../utils/auditLog");
const { sendEmail } = require("../services/email/emailService");
const { inviteWaiterEmail } = require("../services/email/templates");

const INVITE_EXPIRY_DAYS = 7;
const INVITABLE_ROLES = ["MANAGER", "CAPTAIN", "KITCHEN"];

/**
 * List invites for the current restaurant.
 * GET /api/invites
 */
const getInvites = async (req, res, next) => {
  try {
    const invites = await prisma.invite.findMany({
      where: req.restaurantId ? { restaurantId: req.restaurantId } : {},
      orderBy: { createdAt: "desc" },
    });
    const now = new Date();
    const withComputedStatus = invites.map((inv) => ({
      ...inv,
      computedStatus: inv.status === "PENDING" && inv.expiresAt < now ? "EXPIRED" : inv.status,
    }));
    res.json({ success: true, data: withComputedStatus });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a staff invite — restaurant-scoped.
 * POST /api/invites
 */
const createInvite = async (req, res, next) => {
  try {
    const { name, phone, email, role } = req.body;

    if (!req.restaurantId) {
      return res.status(400).json({ success: false, message: "Select a restaurant before inviting staff." });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Name is required." });
    }

    const finalRole = INVITABLE_ROLES.includes(role) ? role : "CAPTAIN";

    let code;
    // Vanishingly unlikely to collide, but guard against it anyway.
    for (let attempt = 0; attempt < 5; attempt++) {
      code = generateInviteCode();
      const existing = await prisma.invite.findUnique({ where: { code } });
      if (!existing) break;
    }

    const invite = await prisma.invite.create({
      data: {
        name: name.trim(),
        phone: phone || null,
        email: email || null,
        role: finalRole,
        code,
        expiresAt: new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
        restaurantId: req.restaurantId,
      },
    });

    logAudit({ action: "invite.created", restaurantId: req.restaurantId, userId: req.user?.id, metadata: { inviteId: invite.id, role: finalRole } });

    // Fire-and-forget — no email provider is wired up yet (Phase 11 scope),
    // so sendEmail() only logs today. Never blocks or fails the response.
    if (invite.email) {
      prisma.restaurant
        .findUnique({ where: { id: req.restaurantId }, select: { name: true } })
        .then((restaurant) => {
          const tpl = inviteWaiterEmail({ inviteeName: invite.name, restaurantName: restaurant?.name || "your restaurant", role: finalRole, inviteCode: code });
          return sendEmail({ to: invite.email, subject: tpl.subject, html: tpl.html });
        })
        .catch(() => {});
    }

    res.status(201).json({ success: true, message: `Invite created for ${invite.name}.`, data: invite });
  } catch (error) {
    next(error);
  }
};

/**
 * Revoke a pending invite — restaurant-scoped. Marks REVOKED rather than
 * deleting, so there's still a record of it having existed.
 * DELETE /api/invites/:id
 */
const revokeInvite = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invite = await prisma.invite.findUnique({ where: { id } });
    if (!invite || (req.restaurantId && invite.restaurantId !== req.restaurantId)) {
      return res.status(404).json({ success: false, message: "Invite not found." });
    }
    const updated = await prisma.invite.update({ where: { id }, data: { status: "REVOKED" } });
    logAudit({ action: "invite.revoked", restaurantId: invite.restaurantId, userId: req.user?.id, metadata: { inviteId: id } });
    res.json({ success: true, message: "Invite revoked.", data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * Public lookup — powers the claim page (/invite/:code) before the waiter
 * has an account. Only exposes what's needed to render that page.
 * GET /api/invites/:code
 */
const getInviteByCode = async (req, res, next) => {
  try {
    const invite = await prisma.invite.findUnique({
      where: { code: req.params.code.toUpperCase() },
      include: { restaurant: { select: { name: true, logo: true, primaryColor: true } } },
    });
    if (!invite) {
      return res.status(404).json({ success: false, message: "Invite not found." });
    }
    if (invite.status !== "PENDING" || invite.expiresAt < new Date()) {
      return res.status(410).json({ success: false, message: "This invite has expired or was already used." });
    }
    res.json({
      success: true,
      data: { name: invite.name, role: invite.role, restaurant: invite.restaurant, expiresAt: invite.expiresAt },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Accept an invite — creates the staff account and logs them straight in.
 * Public (no auth yet — this IS how they get an account).
 * POST /api/invites/:code/accept
 */
const acceptInvite = async (req, res, next) => {
  try {
    const { password } = req.body;
    const invite = await prisma.invite.findUnique({ where: { code: req.params.code.toUpperCase() } });

    if (!invite) {
      return res.status(404).json({ success: false, message: "Invite not found." });
    }
    if (invite.status !== "PENDING" || invite.expiresAt < new Date()) {
      return res.status(410).json({ success: false, message: "This invite has expired or was already used." });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
    }
    if (!invite.email) {
      return res.status(400).json({ success: false, message: "This invite has no email on file — ask your admin to add one, or create your account manually." });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: invite.email.toLowerCase() } });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "An account with this email already exists — please log in instead." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: invite.name,
          email: invite.email.toLowerCase(),
          password: hashedPassword,
          role: invite.role,
          restaurantId: invite.restaurantId,
        },
      });
      await tx.invite.update({
        where: { id: invite.id },
        data: { status: "ACCEPTED", acceptedByUserId: user.id, acceptedAt: new Date() },
      });
      return user;
    });

    logAudit({ action: "invite.accepted", restaurantId: invite.restaurantId, userId: result.id, metadata: { inviteId: invite.id } });

    const token = jwt.sign(
      { userId: result.id, role: result.role, restaurantId: result.restaurantId },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      success: true,
      message: `Welcome, ${result.name}!`,
      data: {
        token,
        user: { id: result.id, name: result.name, email: result.email, role: result.role, restaurantId: result.restaurantId, isPlatformOwner: false },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getInvites, createInvite, revokeInvite, getInviteByCode, acceptInvite };
