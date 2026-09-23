/**
 * feedbackKeywords — a small curated lexicon for classifying free-text
 * feedback comments without any external sentiment API, per the brief's
 * explicit "simple keyword grouping" instruction. Deliberately restaurant-
 * domain-specific rather than a generic sentiment dictionary.
 */
const POSITIVE_WORDS = [
  "delicious", "tasty", "amazing", "excellent", "great", "good", "perfect",
  "fresh", "hot", "friendly", "fast", "quick", "clean", "flavorful",
  "flavourful", "wonderful", "awesome", "love", "loved", "best", "yummy",
  "generous", "polite", "attentive", "crispy", "juicy", "authentic",
  "recommend", "favorite", "favourite", "outstanding", "superb",
];

const NEGATIVE_WORDS = [
  "bad", "terrible", "worst", "poor", "awful", "disappointing", "cold",
  "late", "slow", "rude", "dirty", "bland", "stale", "overpriced",
  "small", "burnt", "undercooked", "overcooked", "salty", "oily",
  "soggy", "tasteless", "rotten", "raw", "wrong", "missing", "waited",
  "waiting", "delay", "delayed", "unhygienic", "expensive", "noisy",
];

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "was", "were", "is", "are", "it",
  "this", "that", "with", "for", "of", "to", "in", "on", "very", "too",
  "not", "had", "have", "has", "i", "we", "my", "our", "food", "service",
  "order", "table", "place", "restaurant",
]);

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Classifies one comment as POSITIVE / NEGATIVE / NEUTRAL by lexicon hit count. */
function classifyComment(comment) {
  const words = tokenize(comment);
  let pos = 0;
  let neg = 0;
  const matchedPositive = [];
  const matchedNegative = [];
  words.forEach((w) => {
    if (POSITIVE_WORDS.includes(w)) {
      pos++;
      matchedPositive.push(w);
    }
    if (NEGATIVE_WORDS.includes(w)) {
      neg++;
      matchedNegative.push(w);
    }
  });
  const label = pos > neg ? "POSITIVE" : neg > pos ? "NEGATIVE" : "NEUTRAL";
  return { label, matchedPositive, matchedNegative };
}

/** Ranks the most frequent non-stopword tokens across a set of comments. */
function topKeywords(comments, limit = 6) {
  const freq = new Map();
  comments.forEach((c) => {
    tokenize(c).forEach((w) => {
      if (w.length < 3 || STOPWORDS.has(w)) return;
      freq.set(w, (freq.get(w) || 0) + 1);
    });
  });
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

module.exports = { classifyComment, topKeywords, tokenize, POSITIVE_WORDS, NEGATIVE_WORDS };
