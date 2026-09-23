/**
 * validate — a small, reusable middleware factory wrapping a Zod schema.
 * Deliberately scoped to JSON-body endpoints only (never applied to a
 * multipart/form-data route) — form fields arrive as strings regardless of
 * their logical type, and those routes already have working, tested inline
 * checks that Phase 12 leaves untouched rather than risk a subtle type
 * mismatch breaking a currently-working upload flow.
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({ field: i.path.join(".") || "body", message: i.message }));
      return res.status(400).json({
        success: false,
        message: issues[0]?.message || "Invalid request data.",
        errors: issues,
      });
    }
    req.body = result.data;
    next();
  };
}

module.exports = { validate };
