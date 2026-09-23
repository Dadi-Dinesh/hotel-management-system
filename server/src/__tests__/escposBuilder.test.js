const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const EscPosBuilder = require("../services/printer/escposBuilder");

describe("EscPosBuilder", () => {
  test("init() emits the ESC @ reset sequence", () => {
    const builder = new EscPosBuilder();
    const buf = builder.build();
    assert.equal(buf[0], 0x1b);
    assert.equal(buf[1], 0x40);
  });

  test("row2 produces a line exactly maxChars (48) wide", () => {
    const builder = new EscPosBuilder();
    builder.row2("Subtotal", "Rs.250");
    // buffer = [ESC,@ (init preamble), ...row text bytes, CR,LF (from feed)]
    const line = builder.build().subarray(2, -2).toString("latin1");
    assert.equal(line.length, 48);
    assert.ok(line.startsWith("Subtotal"));
    assert.ok(line.endsWith("Rs.250"));
  });

  test("row2 truncates an overlong left label instead of overflowing 48 chars", () => {
    const builder = new EscPosBuilder();
    builder.row2("A".repeat(60), "Rs.1");
    const line = builder.build().subarray(2, -2).toString("latin1");
    assert.equal(line.length, 48);
  });

  test("stringToBytes replaces the rupee symbol with 'Rs.'", () => {
    const builder = new EscPosBuilder();
    const bytes = builder.stringToBytes("₹100");
    const text = Buffer.from(bytes).toString("latin1");
    assert.equal(text, "Rs.100");
  });

  test("stringToBytes falls back chars outside Latin-1 range to '?' (63)", () => {
    const builder = new EscPosBuilder();
    const bytes = builder.stringToBytes("café 中"); // 中 = 中, code point > 255
    assert.equal(bytes[bytes.length - 1], 63);
    // é (U+00E9 = 233) is within 0-255 and passes through unchanged
    assert.equal(bytes[3], 233);
  });

  test("wrapText splits long text at word boundaries within maxLen", () => {
    const builder = new EscPosBuilder();
    const lines = builder.wrapText("Chicken Biryani Extra Spicy Large Portion", 15);
    lines.forEach((line) => assert.ok(line.length <= 15));
    assert.ok(lines.length > 1);
  });

  test("wrapText hard-splits a single word longer than maxLen", () => {
    const builder = new EscPosBuilder();
    const lines = builder.wrapText("Supercalifragilisticexpialidocious", 10);
    lines.forEach((line) => assert.ok(line.length <= 10));
  });

  test("divider repeats the given character maxChars times", () => {
    const builder = new EscPosBuilder();
    builder.divider("=");
    const line = builder.build().subarray(2, -2).toString("latin1");
    assert.equal(line, "=".repeat(48));
  });
});
