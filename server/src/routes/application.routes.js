const express = require("express");
const router = express.Router();
const { submitApplication, checkApplicationStatus } = require("../controllers/application.controller");
const { upload } = require("../middleware/upload");
const { rateLimit } = require("../middleware/rateLimit");
const { validate } = require("../middleware/validate");
const { checkApplicationStatusSchema } = require("../validation/schemas");

// Public — the new front door in place of instant signup. Multipart (logo
// upload), so it keeps the same inline-validation convention as every other
// file-upload endpoint. Rate-limited generously (a real applicant fills a
// 12-step wizard once) but still a real backstop against automated spam.
router.post(
  "/",
  rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: "Too many applications submitted from this network recently. Please try again later." }),
  upload.single("logo"),
  submitApplication
);

// Public — /application-status page. Requires an exact email+phone match,
// so it can never be used to enumerate other applicants.
router.post(
  "/status",
  rateLimit({ windowMs: 5 * 60 * 1000, max: 20, message: "Too many status checks — please wait a moment and try again." }),
  validate(checkApplicationStatusSchema),
  checkApplicationStatus
);

module.exports = router;
