import test from "node:test";
import assert from "node:assert/strict";
import { extractTableCode } from "../app/lib/tableCode.js";

test("extractTableCode parses numeric table input into standard T01-T12 code", () => {
  assert.equal(extractTableCode("1"), "T01");
  assert.equal(extractTableCode(" 1 "), "T01");
  assert.equal(extractTableCode("01"), "T01");
  assert.equal(extractTableCode("5"), "T05");
  assert.equal(extractTableCode("12"), "T12");
});

test("extractTableCode parses T-prefixed table codes case-insensitively", () => {
  assert.equal(extractTableCode("t1"), "T01");
  assert.equal(extractTableCode("T1"), "T01");
  assert.equal(extractTableCode("t01"), "T01");
  assert.equal(extractTableCode("T01"), "T01");
  assert.equal(extractTableCode("t12"), "T12");
  assert.equal(extractTableCode("T12"), "T12");
});

test("extractTableCode extracts table code from full or relative QR URLs", () => {
  assert.equal(extractTableCode("https://hotel-management-system-psi-kohl.vercel.app/table/1"), "T01");
  assert.equal(extractTableCode("https://hotel-management-system-psi-kohl.vercel.app/table/T01"), "T01");
  assert.equal(extractTableCode("http://localhost:3000/table/12"), "T12");
  assert.equal(extractTableCode("/table/T05"), "T05");
});

test("extractTableCode supports custom tenant alphanumeric table codes", () => {
  assert.equal(extractTableCode("VIP-01"), "VIP-01");
  assert.equal(extractTableCode("patio_3"), "PATIO_3");
});

test("extractTableCode rejects empty, whitespace, and invalid inputs", () => {
  assert.equal(extractTableCode(""), null);
  assert.equal(extractTableCode("   "), null);
  assert.equal(extractTableCode(null), null);
  assert.equal(extractTableCode(undefined), null);
  assert.equal(extractTableCode("???"), null);
  assert.equal(extractTableCode("<script>"), null);
});
