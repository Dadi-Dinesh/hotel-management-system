const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { classifyComment, topKeywords, tokenize } = require("../services/insights/feedbackKeywords");

describe("tokenize", () => {
  test("lowercases and strips punctuation", () => {
    assert.deepEqual(tokenize("Great Food! Loved it."), ["great", "food", "loved", "it"]);
  });

  test("returns an empty array for empty input", () => {
    assert.deepEqual(tokenize(""), []);
    assert.deepEqual(tokenize(null), []);
  });
});

describe("classifyComment", () => {
  test("classifies a clearly positive comment", () => {
    const { label } = classifyComment("The food was delicious and the service was fast");
    assert.equal(label, "POSITIVE");
  });

  test("classifies a clearly negative comment", () => {
    const { label } = classifyComment("The food was cold and the service was slow and rude");
    assert.equal(label, "NEGATIVE");
  });

  test("classifies a comment with no lexicon hits as neutral", () => {
    const { label } = classifyComment("The table was near the window");
    assert.equal(label, "NEUTRAL");
  });

  test("classifies a tied comment as neutral", () => {
    const { label } = classifyComment("good but bad");
    assert.equal(label, "NEUTRAL");
  });
});

describe("topKeywords", () => {
  test("ranks by frequency and excludes domain stopwords like 'food'/'service'", () => {
    const comments = ["the food was great", "great food again", "great service"];
    const result = topKeywords(comments, 3);
    // "food" and "service" are curated stopwords (expected in nearly every
    // comment) and must never surface as a "top keyword" despite frequency.
    assert.ok(!result.some((r) => r.word === "food" || r.word === "service"));
    assert.equal(result[0].word, "great");
    assert.equal(result[0].count, 3);
  });

  test("respects the limit", () => {
    const comments = ["alpha beta gamma delta epsilon zeta"];
    const result = topKeywords(comments, 2);
    assert.equal(result.length, 2);
  });
});
