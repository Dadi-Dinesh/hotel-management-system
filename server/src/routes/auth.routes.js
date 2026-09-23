const express = require("express");
const router = express.Router();
const { login, getMe } = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth");
const { rateLimit } = require("../middleware/rateLimit");
const { validate } = require("../middleware/validate");
const { loginSchema } = require("../validation/schemas");

// Public — rate-limited against credential-stuffing/brute-force attempts.
// Generous enough that a real user mistyping their password a few times
// never notices; this is a placeholder appropriate for a single instance.
router.post(
  "/login",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: "Too many login attempts. Please try again in a few minutes." }),
  validate(loginSchema),
  login
);

// Protected
router.get("/me", authenticate, getMe);

module.exports = router;
