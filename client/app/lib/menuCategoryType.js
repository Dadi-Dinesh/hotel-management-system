/**
 * Veg/Non-Veg is a food classification — it has no meaning for drinks, paan,
 * or table-service requests (extra plates/spoons/etc). The schema has no
 * category "type" field, so this infers it from the category name, mirroring
 * the server's EXCLUDED_CATEGORIES list in kds.service.js (which excludes the
 * same non-prep categories from the kitchen display).
 *
 * Matched as whole words (not substrings) against the category name — a
 * plain `.includes("pan")` would misfire on "Paneer Specials" or "Pani Puri",
 * both common, very much vegetarian-or-not food categories.
 */
const NON_DIET_CATEGORY_WORDS = [
  "beverage",
  "drink",
  "juice",
  "soda",
  "water",
  "lassi",
  "shake",
  "milkshake",
  "pan",
  "paan",
  "cutlery",
  "tableware",
  "extra",
  "dessert",
];

// Multi-word phrases, checked as plain substrings — specific enough that
// false positives aren't a realistic concern.
const NON_DIET_CATEGORY_PHRASES = ["ice cream"];

export function isDietFilterApplicable(categoryName = "") {
  const name = categoryName.trim().toLowerCase();
  if (!name) return true;
  if (NON_DIET_CATEGORY_PHRASES.some((phrase) => name.includes(phrase))) return false;

  const words = name.split(/[^a-z]+/).filter(Boolean).map((w) => (w.endsWith("s") ? w.slice(0, -1) : w));
  return !words.some((w) => NON_DIET_CATEGORY_WORDS.includes(w));
}
