/**
 * schemas — reusable Zod validation schemas (Phase 12).
 *
 * Scoped deliberately to JSON-body endpoints only — every schema here
 * matches (or is a strict superset of) what its controller already
 * accepted before this phase, so no currently-working request becomes
 * rejected. Where a schema is stricter (e.g. requiring rating 1-5, or a
 * positive integer quantity), that gap was never something a legitimate
 * client relied on — it closes a real gap, not a behavior change.
 */
const { z } = require("zod");

const loginSchema = z.object({
  email: z.email("A valid email address is required."),
  password: z.string().min(1, "Password is required."),
});

const orderItemSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.coerce.number().int().positive("Quantity must be a positive number."),
});

const placeOrderSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required."),
  items: z.array(orderItemSchema).min(1, "At least one item is required."),
});

const feedbackRatingSchema = z.object({
  menuItemId: z.string().min(1),
  rating: z.coerce.number().int().min(1, "Rating must be between 1 and 5.").max(5, "Rating must be between 1 and 5."),
  comment: z.string().max(500).optional(),
});

const submitFeedbackSchema = z.object({
  ratings: z.array(feedbackRatingSchema).min(1, "At least one rating is required."),
});

const createInviteSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  phone: z.string().optional().nullable(),
  email: z.email("Invalid email address.").optional().nullable().or(z.literal("")),
  // Intentionally NOT an enum — the controller already falls back an
  // unrecognized role to CAPTAIN rather than rejecting it; validating it
  // strictly here would make that existing leniency a breaking 400.
  role: z.string().optional(),
});

const createStaffUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  email: z.email("A valid email address is required."),
  // The controller had no explicit minimum before — 6 matches the
  // threshold already enforced everywhere else an account password is
  // set in this app (invite-accept, onboarding admin).
  password: z.string().min(6, "Password must be at least 6 characters."),
  role: z.enum(["ADMIN", "MANAGER", "CAPTAIN", "KITCHEN"]).optional(),
});

const askAISchema = z.object({
  question: z.string().trim().min(1, "A question is required.").max(300, "Question is too long."),
});

// NOT applied to POST /api/applications itself — that endpoint is multipart
// (logo upload), so it keeps the same inline-validation convention as
// createRestaurant/menu item creation (form fields arrive as strings
// regardless of logical type). Used by the JSON-body admin/status routes below.
const checkApplicationStatusSchema = z.object({
  email: z.email("A valid email address is required."),
  phone: z.string().trim().min(1, "Phone number is required."),
});

const rejectApplicationSchema = z.object({
  rejectionReason: z.string().trim().min(1, "A rejection reason is required.").max(1000, "Reason is too long."),
});

const requestMoreInfoSchema = z.object({
  message: z.string().trim().min(1, "A message is required.").max(1000, "Message is too long."),
});

module.exports = {
  loginSchema,
  placeOrderSchema,
  submitFeedbackSchema,
  createInviteSchema,
  createStaffUserSchema,
  askAISchema,
  checkApplicationStatusSchema,
  rejectApplicationSchema,
  requestMoreInfoSchema,
};
