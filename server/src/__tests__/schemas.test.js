const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const {
  loginSchema,
  placeOrderSchema,
  submitFeedbackSchema,
  createInviteSchema,
  createStaffUserSchema,
  askAISchema,
} = require("../validation/schemas");

describe("loginSchema", () => {
  test("accepts a valid email/password", () => {
    const result = loginSchema.safeParse({ email: "a@b.com", password: "secret" });
    assert.equal(result.success, true);
  });

  test("rejects an invalid email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "secret" });
    assert.equal(result.success, false);
  });

  test("rejects an empty password", () => {
    const result = loginSchema.safeParse({ email: "a@b.com", password: "" });
    assert.equal(result.success, false);
  });
});

describe("placeOrderSchema", () => {
  test("accepts a valid order with coerced numeric quantity", () => {
    const result = placeOrderSchema.safeParse({
      sessionId: "sess-1",
      items: [{ menuItemId: "item-1", quantity: "2" }],
    });
    assert.equal(result.success, true);
    assert.equal(result.data.items[0].quantity, 2);
  });

  test("rejects an order with zero items", () => {
    const result = placeOrderSchema.safeParse({ sessionId: "sess-1", items: [] });
    assert.equal(result.success, false);
  });

  test("rejects a non-positive quantity", () => {
    const result = placeOrderSchema.safeParse({
      sessionId: "sess-1",
      items: [{ menuItemId: "item-1", quantity: 0 }],
    });
    assert.equal(result.success, false);
  });
});

describe("submitFeedbackSchema", () => {
  test("rejects a rating outside 1-5", () => {
    const result = submitFeedbackSchema.safeParse({
      ratings: [{ menuItemId: "item-1", rating: 6 }],
    });
    assert.equal(result.success, false);
  });

  test("accepts a valid rating with optional comment", () => {
    const result = submitFeedbackSchema.safeParse({
      ratings: [{ menuItemId: "item-1", rating: 5, comment: "Great!" }],
    });
    assert.equal(result.success, true);
  });
});

describe("createInviteSchema", () => {
  test("accepts an unrecognized role string (controller falls back to CAPTAIN)", () => {
    const result = createInviteSchema.safeParse({ name: "Staff Member", role: "BOGUS" });
    assert.equal(result.success, true);
  });

  test("rejects a missing name", () => {
    const result = createInviteSchema.safeParse({ name: "" });
    assert.equal(result.success, false);
  });
});

describe("createStaffUserSchema", () => {
  test("rejects a password shorter than 6 characters", () => {
    const result = createStaffUserSchema.safeParse({
      name: "Staff",
      email: "s@b.com",
      password: "abc12",
    });
    assert.equal(result.success, false);
  });

  test("rejects a role outside the enum", () => {
    const result = createStaffUserSchema.safeParse({
      name: "Staff",
      email: "s@b.com",
      password: "abcdef",
      role: "OWNER",
    });
    assert.equal(result.success, false);
  });

  test("accepts a valid staff user", () => {
    const result = createStaffUserSchema.safeParse({
      name: "Staff",
      email: "s@b.com",
      password: "abcdef",
      role: "KITCHEN",
    });
    assert.equal(result.success, true);
  });
});

describe("askAISchema", () => {
  test("rejects an empty question", () => {
    const result = askAISchema.safeParse({ question: "   " });
    assert.equal(result.success, false);
  });

  test("rejects a question over 300 characters", () => {
    const result = askAISchema.safeParse({ question: "a".repeat(301) });
    assert.equal(result.success, false);
  });

  test("accepts a valid question", () => {
    const result = askAISchema.safeParse({ question: "Which item sold the most this week?" });
    assert.equal(result.success, true);
  });
});
