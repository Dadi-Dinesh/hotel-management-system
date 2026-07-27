const EscPosBuilder = require("./escposBuilder");

/**
 * Generate 80mm Customer Billing Receipt ESC/POS Buffer
 * Exact 48-character formatting matching user commercial specifications
 */
function buildCustomerBillReceipt(order = {}) {
  console.log("===== BILL OBJECT =====");
  console.dir(order, { depth: null });

  // 1. Multi-level Item Resolution (Extract items from order.items, order.orders, or order.session.orders)
  let rawItems = [];
  if (Array.isArray(order?.items) && order.items.length > 0) {
    rawItems = order.items;
  } else if (Array.isArray(order?.orders)) {
    order.orders.forEach((o) => {
      if (o.status !== "CANCELLED" && Array.isArray(o.items)) {
        rawItems.push(...o.items);
      }
    });
  } else if (Array.isArray(order?.session?.orders)) {
    order.session.orders.forEach((o) => {
      if (o.status !== "CANCELLED" && Array.isArray(o.items)) {
        rawItems.push(...o.items);
      }
    });
  }

  console.log("===== ITEMS =====");
  console.dir(rawItems, { depth: null });

  const builder = new EscPosBuilder();

  // 2. Restaurant Header
  builder
    .divider("=")
    .feed(1)
    .align("center")
    .bold(true)
    .size(2, 2)
    .textLine("SREE NOOKAMBIKA")
    .size(1, 1)
    .bold(false)
    .textLine("FAMILY DHABA")
    .feed(1)
    .divider("-")
    .feed(1);

  // 3. Metadata Section (Table/Type left, Date/Time right)
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
    .row2(`Table : ${tableCode}`, `Type : Dine-In`)
    .feed(1)
    .row2(`Date  : ${dateStr}`, `Time : ${timeStr}`)
    .feed(1)
    .divider("-")
    .feed(1);

  // 4. Itemized Header (Item Name: 24, Qty: 10, Price: 14)
  builder
    .bold(true)
    .item3Row("Item Name", "Qty", "Price")
    .bold(false)
    .divider("-")
    .feed(1);

  // 5. Item List & Totals Calculations
  let subtotal = 0;

  rawItems.forEach((item, index) => {
    // Universal Property Resolution: menuItem.name -> item.name -> item.food.name -> item.title -> item.menuItemName
    const detectedName =
      item?.menuItem?.name ||
      item?.name ||
      item?.food?.name ||
      item?.title ||
      item?.menuItemName ||
      item?.itemName ||
      `Item #${index + 1}`;

    const detectedQty = Number(
      item?.quantity !== undefined
        ? item.quantity
        : item?.qty !== undefined
        ? item.qty
        : 1
    );

    const detectedUnitPrice = Number(
      item?.price !== undefined
        ? item.price
        : item?.menuItem?.price !== undefined
        ? item.menuItem.price
        : item?.unitPrice !== undefined
        ? item.unitPrice
        : item?.amount !== undefined
        ? item.amount
        : 0
    );

    const detectedLineTotal = detectedQty * detectedUnitPrice;
    subtotal += detectedLineTotal;

    console.log(`📌 Item [${index + 1}]:`);
    console.log(`   Detected Name      : "${detectedName}"`);
    console.log(`   Detected Qty       : ${detectedQty}`);
    console.log(`   Detected Unit Price: ${detectedUnitPrice}`);
    console.log(`   Detected Line Total: ${detectedLineTotal}`);

    const priceFormatted = `Rs.${detectedLineTotal.toFixed(0)}`;
    builder.item3Row(detectedName, detectedQty, priceFormatted).feed(1);
  });

  builder
    .divider("-")
    .feed(1);

  // 6. Taxes & Total Section
  const grandTotal = Math.round(subtotal);

  builder
    .row2("CGST (0%)", "Rs.0.00")
    .row2("SGST (0%)", "Rs.0.00")
    .feed(1)
    .divider("-")
    .feed(1)
    .bold(true)
    .row2("TOTAL", `Rs.${grandTotal.toFixed(2)}`)
    .bold(false)
    .feed(1)
    .divider("=")
    .feed(1);

  // 7. Footer Section & Paper Cut
  builder
    .align("center")
    .textLine("Thank You!")
    .feed(1)
    .textLine("Visit Again")
    .feed(1)
    .textLine("Please Rate Your Dining Experience")
    .feed(1)
    .divider("=")
    .feed(4)
    .cut();

  console.log(`✅ [receiptPrinter] Generated receipt ESC/POS buffer (${builder.build().length} bytes) - Subtotal: Rs.${subtotal}`);
  return builder.build();
}

module.exports = { buildCustomerBillReceipt };
