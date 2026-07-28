const EscPosBuilder = require("./escposBuilder");

/**
 * Generate 80mm Kitchen Order Ticket (KOT) ESC/POS Buffer
 * Supports Kitchen Copy vs Captain Copy label headers
 */
function buildKOTReceipt(order = {}, copyLabel = "Kitchen Copy") {
  const labelText = String(copyLabel || "Kitchen Copy").toUpperCase();

  const builder = new EscPosBuilder();

  // 1. KOT Title & Copy Label Header
  builder
    .align("center")
    .bold(true)
    .size(2, 2)
    .textLine("KITCHEN TICKET")
    .size(1, 1)
    .textLine(`*** ${labelText} ***`)
    .bold(false)
    .divider("=");

  // 2. KOT Metadata (Table #, Token #, Date, Time)
  const tokenNo = String(order.orderNumber || order.id || "1");
  const tableCode =
    order.tableCode ||
    order.session?.table?.code ||
    (order.tableNumber ? `T${String(order.tableNumber).padStart(2, "0")}` : "T01");

  const now = order.createdAt ? new Date(order.createdAt) : new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const dateStr = `${day}/${month}/${year}`;

  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  builder
    .align("center")
    .bold(true)
    .size(2, 2)
    .textLine(`TABLE: ${tableCode}`)
    .size(1, 1)
    .bold(false)
    .row2(`TOKEN #: ${tokenNo}`, `TIME: ${timeStr}`)
    .row2(`DATE: ${dateStr}`, `TYPE: Dine-In`)
    .divider("=");

  // 3. KOT Items List Header
  builder
    .align("left")
    .bold(true)
    .row2("DISH ITEM NAME", "QTY")
    .bold(false)
    .divider("-");

  // 4. KOT Dish Items
  const items = Array.isArray(order.items) ? order.items : [];
  items.forEach((item, index) => {
    const itemName = (
      item?.menuItem?.name ||
      item?.name ||
      item?.title ||
      item?.itemName ||
      `Item #${index + 1}`
    ).toUpperCase();
    const qty = Number(item?.quantity || item?.qty || 1);

    builder
      .bold(true)
      .size(1, 2) // Double height for kitchen visibility
      .row2(itemName, `x${qty}`)
      .size(1, 1)
      .bold(false)
      .feed(1);
  });

  builder.divider("-");

  // 5. Special Instructions / Kitchen Notes
  const notes = order.notes || order.specialInstructions;
  if (notes) {
    builder
      .bold(true)
      .textLine("SPECIAL INSTRUCTIONS:")
      .textLine(`>>> ${String(notes).toUpperCase()} <<<`)
      .bold(false)
      .divider("-");
  }

  // 6. Paper Cut
  builder.feed(2).cut();

  return builder.build();
}

module.exports = { buildKOTReceipt };
