export const money = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    Number(value) || 0,
  );
export const cartTotal = (items) =>
  items.reduce(
    (sum, item) => sum + Math.round(Number(item.price) * 100) * item.quantity,
    0,
  ) / 100;
export function reconcileCart(saved, menu) {
  if (!Array.isArray(saved)) return [];
  const seen = new Set();
  return saved.flatMap((row) => {
    const item = menu.find((candidate) => candidate.id === row.menuItemId);
    if (
      !item ||
      item.isAvailable === false ||
      seen.has(item.id) ||
      !Number.isSafeInteger(row.quantity) ||
      row.quantity < 1 ||
      !Number.isFinite(Number(item.price)) ||
      Number(item.price) < 0
    )
      return [];
    seen.add(item.id);
    return [
      {
        menuItemId: item.id,
        name: item.name,
        price: Number(item.price),
        quantity: row.quantity,
      },
    ];
  });
}
export function changeQuantity(items, id, quantity) {
  if (!Number.isSafeInteger(quantity) || quantity < 0) return items;
  if (quantity === 0) return items.filter((item) => item.menuItemId !== id);
  return items.map((item) =>
    item.menuItemId === id ? { ...item, quantity } : item,
  );
}
