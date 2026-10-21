import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cartTotal,
  changeQuantity,
  reconcileCart,
} from "../app/lib/customerCart.mjs";
import { isDietFilterApplicable } from "../app/lib/menuCategoryType.js";
const menu = [
  { id: "food", name: "Rice", price: 100.1, isAvailable: true },
  { id: "sold", name: "Sold out", price: 99, isAvailable: false },
];
test("restored drafts use current menu prices and remove unavailable, foreign and invalid items", () => {
  assert.deepEqual(
    reconcileCart(
      [
        { menuItemId: "food", price: 1, quantity: 2 },
        { menuItemId: "sold", quantity: 1 },
        { menuItemId: "foreign", quantity: 1 },
        { menuItemId: "food", quantity: 4 },
      ],
      menu,
    ),
    [{ menuItemId: "food", name: "Rice", price: 100.1, quantity: 2 }],
  );
  assert.deepEqual(
    reconcileCart([{ menuItemId: "food", quantity: 1.5 }], menu),
    [],
  );
});
test("quantity updates preserve other lines and zero removes one item", () => {
  const items = [
    { menuItemId: "a", quantity: 1 },
    { menuItemId: "b", quantity: 2 },
  ];
  assert.equal(changeQuantity(items, "a", 3)[0].quantity, 3);
  assert.equal(changeQuantity(items, "a", 0).length, 1);
  assert.deepEqual(changeQuantity(items, "a", NaN), items);
  assert.deepEqual(changeQuantity(items, "a", -1), items);
});
test("cart totals use paise precision", () => {
  assert.equal(
    cartTotal([
      { price: 0.1, quantity: 3 },
      { price: 0.2, quantity: 1 },
    ]),
    0.5,
  );
  assert.equal(cartTotal([]), 0);
});
test("existing category classification excludes supplies and drinks, not paneer", () => {
  for (const category of ["Beverages", "Water", "Paan", "Cutlery", "Tableware"])
    assert.equal(isDietFilterApplicable(category), false, category);
  assert.equal(isDietFilterApplicable("Paneer Specials"), true);
});
