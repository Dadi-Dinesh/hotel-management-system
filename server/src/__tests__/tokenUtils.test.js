const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { generateRawToken, hashToken, tokenMatches, generateInviteCode } = require("../utils/tokenUtils");

describe("tokenUtils", () => {
  test("generateRawToken produces unique, URL-safe tokens", () => {
    const a = generateRawToken();
    const b = generateRawToken();
    assert.notEqual(a, b);
    assert.match(a, /^[A-Za-z0-9_-]+$/);
  });

  test("hashToken is deterministic", () => {
    const raw = "fixed-value-for-hashing";
    assert.equal(hashToken(raw), hashToken(raw));
  });

  test("hashToken produces different hashes for different inputs", () => {
    assert.notEqual(hashToken("a"), hashToken("b"));
  });

  test("tokenMatches returns true for a matching raw/hash pair", () => {
    const raw = generateRawToken();
    const hash = hashToken(raw);
    assert.equal(tokenMatches(raw, hash), true);
  });

  test("tokenMatches returns false for a non-matching pair", () => {
    const hash = hashToken(generateRawToken());
    assert.equal(tokenMatches("wrong-token", hash), false);
  });

  test("tokenMatches returns false (not throws) on missing inputs", () => {
    assert.equal(tokenMatches(null, "abc"), false);
    assert.equal(tokenMatches("abc", null), false);
    assert.equal(tokenMatches(undefined, undefined), false);
  });

  test("generateInviteCode produces a 10-char uppercase hex code", () => {
    const code = generateInviteCode();
    assert.equal(code.length, 10);
    assert.match(code, /^[0-9A-F]{10}$/);
  });
});
