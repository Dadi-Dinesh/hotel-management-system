/**
 * KOT (Kitchen Order Ticket) & Bill Generator
 * Generates receipt data for thermal/POS & document printers:
 * - 80mm Thermal POS (3-inch standard POS printer)
 * - 58mm Thermal POS (2-inch compact/portable Bluetooth printer)
 * - A4 Full Page Document Printer (Standard invoice layout)
 */

/**
 * Format time to 12-hour format
 */
const formatTime = (date) => {
  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

/**
 * Format date
 */
const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

/**
 * Generate KOT receipt data for printing
 */
const generateKOTData = (order, copyType) => {
  const items = order.items.map((item) => ({
    name: item.menuItem.name,
    quantity: item.quantity,
    price: item.price,
  }));

  return {
    copyType,
    title: copyType === "KITCHEN" ? "Kitchen Copy" : "Waiter Copy",
    tableCode: order.session.table.code,
    tableNumber: order.session.table.number,
    orderNumber: order.orderNumber,
    items,
    time: formatTime(order.createdAt),
    date: formatDate(order.createdAt),
    timestamp: order.createdAt,
  };
};

/**
 * Generate KOT HTML for browser printing with format options (80mm, 58mm, A4)
 */
const generateKOTHTML = (order, copyType, format = "80mm") => {
  const data = generateKOTData(order, copyType);

  if (format === "58mm") {
    const itemsHTML = data.items
      .map(
        (item) =>
          `<tr>
            <td style="text-align:left;font-size:11px;padding:2px 0;">${item.name}</td>
            <td style="text-align:center;font-size:11px;padding:2px 0;">x${item.quantity}</td>
          </tr>`
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${data.title} - Order #${data.orderNumber} (58mm)</title>
        <style>
          @page { size: 58mm auto; margin: 1mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; width: 54mm; padding: 1mm; font-size: 11px; }
          .divider { border-top: 1px dashed #000; margin: 3px 0; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; }
        </style>
      </head>
      <body>
        <div class="divider"></div>
        <p class="center bold" style="font-size:13px;padding:2px 0;">${data.title} (58mm)</p>
        <div class="divider"></div>
        <p style="font-size:11px;padding:2px 0;"><strong>Table : ${data.tableCode}</strong></p>
        <div class="divider"></div>
        <table>${itemsHTML}</table>
        <div class="divider"></div>
        <p style="font-size:10px;">Time : ${data.time}</p>
        <p style="font-size:10px;">Date : ${data.date}</p>
        <p class="bold" style="font-size:11px;padding:2px 0;">Order #${data.orderNumber}</p>
        <div class="divider"></div>
        <p class="center" style="font-size:9px;">Nookambika Dhaba</p>
        <div class="divider"></div>
      </body>
      </html>
    `;
  }

  if (format === "A4") {
    const itemsHTML = data.items
      .map(
        (item, index) =>
          `<tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 8px; text-align: center; font-size: 13px;">${index + 1}</td>
            <td style="padding: 8px; font-size: 14px; font-weight: 700;">${item.name}</td>
            <td style="padding: 8px; text-align: center; font-size: 16px; font-weight: 800; color: #b45309;">x${item.quantity}</td>
          </tr>`
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${data.title} - Order #${data.orderNumber} (A4 Sheet)</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: system-ui, -apple-system, sans-serif; color: #111827; padding: 20px; max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #78350f; padding-bottom: 12px; margin-bottom: 20px; }
          .badge { padding: 6px 12px; background: #78350f; color: #fff; font-size: 14px; font-weight: 800; border-radius: 6px; text-transform: uppercase; }
          .info-box { display: flex; justify-content: space-between; background: #fffbeb; border: 1px solid #fde68a; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #78350f; color: white; padding: 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
          .footer { text-align: center; border-top: 1px solid #e5e7eb; padding-top: 15px; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 style="font-size: 22px; font-weight: 900; color: #78350f; text-transform: uppercase;">Sree Nookambika Dhaba</h1>
            <p style="font-size: 13px; color: #6b7280; font-weight: 600;">KITCHEN ORDER TICKET (KOT)</p>
          </div>
          <span class="badge">${data.title}</span>
        </div>

        <div class="info-box">
          <div>
            <p style="font-size: 16px; font-weight: 900; color: #92400e;">TABLE: ${data.tableCode}</p>
            <p style="font-size: 13px; color: #4b5563;">Order #${data.orderNumber}</p>
          </div>
          <div style="text-align: right;">
            <p style="font-size: 12px; color: #4b5563;">Date: ${data.date}</p>
            <p style="font-size: 12px; color: #4b5563;">Time: ${data.time}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 10%;">#</th>
              <th style="text-align: left;">Item Name</th>
              <th style="width: 20%; text-align: center;">Quantity</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <div class="footer">
          <p>KOT Printed for Table ${data.tableCode} · Sree Nookambika Family Dhaba</p>
        </div>
      </body>
      </html>
    `;
  }

  // Default: 80mm Thermal POS Receipt (3-inch KOT printer)
  const itemsHTML = data.items
    .map(
      (item) =>
        `<tr>
          <td style="text-align:left;font-size:14px;padding:2px 0;">${item.name}</td>
          <td style="text-align:center;font-size:14px;padding:2px 0;">x${item.quantity}</td>
        </tr>`
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${data.title} - Order #${data.orderNumber} (80mm)</title>
      <style>
        @page { size: 80mm auto; margin: 2mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; width: 76mm; padding: 2mm; }
        .divider { border-top: 1px dashed #000; margin: 4px 0; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        table { width: 100%; border-collapse: collapse; }
      </style>
    </head>
    <body>
      <div class="divider"></div>
      <p class="center bold" style="font-size:16px;padding:4px 0;">${data.title}</p>
      <div class="divider"></div>
      <p style="font-size:14px;padding:6px 0;"><strong>Table : ${data.tableCode}</strong></p>
      <div class="divider"></div>
      <table>${itemsHTML}</table>
      <div class="divider"></div>
      <p style="font-size:12px;padding:2px 0;">Time : ${data.time}</p>
      <p style="font-size:12px;padding:2px 0;">Date : ${data.date}</p>
      <p class="bold" style="font-size:14px;padding:4px 0;">Order #${data.orderNumber}</p>
      <div class="divider"></div>
      <p class="center" style="font-size:10px;padding:4px 0;">Nookambika Dhaba</p>
      <div class="divider"></div>
    </body>
    </html>
  `;
};

/**
 * Generate bill receipt HTML with format options (80mm, 58mm, A4)
 */
const generateBillHTML = (session, format = "80mm") => {
  const allItems = [];

  session.orders.forEach((order) => {
    if (order.status !== "CANCELLED") {
      order.items.forEach((item) => {
        const existing = allItems.find((i) => i.menuItemId === item.menuItemId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.total += item.price * item.quantity;
        } else {
          allItems.push({
            menuItemId: item.menuItemId,
            name: item.menuItem.name,
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity,
          });
        }
      });
    }
  });

  const grandTotal = allItems.reduce((sum, item) => sum + item.total, 0);

  if (format === "58mm") {
    const itemsHTML = allItems
      .map(
        (item) =>
          `<tr>
            <td style="text-align:left;font-size:11px;padding:2px 0;">${item.name}</td>
            <td style="text-align:center;font-size:11px;padding:2px 0;">x${item.quantity}</td>
            <td style="text-align:right;font-size:11px;padding:2px 0;">₹${item.total.toFixed(0)}</td>
          </tr>`
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Bill - Table ${session.table.code} (58mm)</title>
        <style>
          @page { size: 58mm auto; margin: 1mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; width: 54mm; padding: 1mm; font-size: 11px; }
          .divider { border-top: 1px dashed #000; margin: 3px 0; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; }
        </style>
      </head>
      <body>
        <div class="divider"></div>
        <p class="center bold" style="font-size:13px;padding:2px 0;">Sree Nookambika Dhaba</p>
        <p class="center" style="font-size:10px;">BILL (58mm)</p>
        <div class="divider"></div>
        <p style="font-size:11px;"><strong>Table : ${session.table.code}</strong></p>
        <p style="font-size:10px;">Date : ${formatDate(session.createdAt)}</p>
        <p style="font-size:10px;">Time : ${formatTime(new Date())}</p>
        <div class="divider"></div>
        <table>
          <thead>
            <tr>
              <th style="text-align:left;font-size:10px;">Item</th>
              <th style="text-align:center;font-size:10px;">Qty</th>
              <th style="text-align:right;font-size:10px;">Amt</th>
            </tr>
          </thead>
          <tbody>${itemsHTML}</tbody>
        </table>
        <div class="divider"></div>
        <table>
          <tr>
            <td class="bold" style="font-size:12px;">TOTAL</td>
            <td class="bold" style="text-align:right;font-size:12px;">₹${grandTotal.toFixed(0)}</td>
          </tr>
        </table>
        <div class="divider"></div>
        <p class="center" style="font-size:9px;padding:2px 0;">Thank you! Visit again!</p>
        <div class="divider"></div>
      </body>
      </html>
    `;
  }

  if (format === "A4") {
    const itemsHTML = allItems
      .map(
        (item, index) =>
          `<tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px; text-align: center; font-size: 14px;">${index + 1}</td>
            <td style="padding: 10px; font-size: 14px; font-weight: 600;">${item.name}</td>
            <td style="padding: 10px; text-align: center; font-size: 14px;">₹${item.price.toFixed(0)}</td>
            <td style="padding: 10px; text-align: center; font-size: 14px; font-weight: 700;">${item.quantity}</td>
            <td style="padding: 10px; text-align: right; font-size: 14px; font-weight: 700;">₹${item.total.toFixed(0)}</td>
          </tr>`
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Bill Invoice - Table ${session.table.code} (A4 Document)</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: system-ui, -apple-system, sans-serif; color: #1f2937; padding: 20px; max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #b45309; padding-bottom: 15px; margin-bottom: 20px; }
          .title { font-size: 24px; font-weight: 900; color: #78350f; text-transform: uppercase; letter-spacing: 1px; }
          .subtitle { font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; }
          .info-grid { display: flex; justify-content: space-between; background: #fffbeb; border: 1px solid #fde68a; padding: 15px; border-radius: 8px; margin-bottom: 25px; }
          .info-block p { font-size: 13px; color: #4b5563; margin-bottom: 4px; }
          .info-block strong { color: #111827; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          th { background: #78350f; color: #ffffff; padding: 10px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
          .total-box { display: flex; justify-content: flex-end; margin-bottom: 30px; }
          .total-card { width: 280px; background: #fef3c7; border: 2px solid #f59e0b; padding: 15px; border-radius: 8px; text-align: right; }
          .total-card h3 { font-size: 22px; color: #92400e; font-weight: 900; }
          .footer { text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 12px; color: #9ca3af; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">Sree Nookambika Family Dhaba</h1>
            <p class="subtitle">Official Dining Receipt / Invoice</p>
          </div>
          <div style="text-align: right;">
            <span style="display:inline-block; padding: 6px 14px; background:#f59e0b; color:white; font-size:13px; font-weight:800; border-radius:6px; text-transform:uppercase;">A4 PRINT</span>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-block">
            <p><strong>Table Code:</strong> ${session.table.code}</p>
            <p><strong>Table Number:</strong> Table #${session.table.number}</p>
          </div>
          <div class="info-block" style="text-align: right;">
            <p><strong>Date:</strong> ${formatDate(session.createdAt)}</p>
            <p><strong>Print Time:</strong> ${formatTime(new Date())}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 8%;">S.No</th>
              <th style="text-align: left;">Item Description</th>
              <th style="width: 15%; text-align: center;">Price</th>
              <th style="width: 12%; text-align: center;">Qty</th>
              <th style="width: 20%; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <div class="total-box">
          <div class="total-card">
            <p style="font-size: 12px; color: #78350f; font-weight: 700; text-transform: uppercase;">Grand Total</p>
            <h3>₹${grandTotal.toLocaleString("en-IN")}</h3>
          </div>
        </div>

        <div class="footer">
          <p>Thank you for dining with Sree Nookambika Family Dhaba!</p>
          <p style="margin-top: 4px;">Please visit us again!</p>
        </div>
      </body>
      </html>
    `;
  }

  // Default: 80mm Thermal Receipt (3-inch POS)
  const itemsHTML = allItems
    .map(
      (item) =>
        `<tr>
          <td style="text-align:left;font-size:13px;padding:2px 0;">${item.name}</td>
          <td style="text-align:center;font-size:13px;padding:2px 0;">x${item.quantity}</td>
          <td style="text-align:right;font-size:13px;padding:2px 0;">₹${item.total.toFixed(0)}</td>
        </tr>`
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Bill - Table ${session.table.code} (80mm)</title>
      <style>
        @page { size: 80mm auto; margin: 2mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; width: 76mm; padding: 2mm; }
        .divider { border-top: 1px dashed #000; margin: 4px 0; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        table { width: 100%; border-collapse: collapse; }
      </style>
    </head>
    <body>
      <div class="divider"></div>
      <p class="center bold" style="font-size:16px;padding:4px 0;">Sree Nookambika Dhaba</p>
      <p class="center" style="font-size:11px;padding:2px 0;">BILL (80mm)</p>
      <div class="divider"></div>
      <p style="font-size:13px;padding:4px 0;"><strong>Table : ${session.table.code}</strong></p>
      <p style="font-size:11px;padding:2px 0;">Date : ${formatDate(session.createdAt)}</p>
      <p style="font-size:11px;padding:2px 0;">Time : ${formatTime(new Date())}</p>
      <div class="divider"></div>
      <table>
        <thead>
          <tr>
            <th style="text-align:left;font-size:12px;padding:2px 0;">Item</th>
            <th style="text-align:center;font-size:12px;padding:2px 0;">Qty</th>
            <th style="text-align:right;font-size:12px;padding:2px 0;">Amt</th>
          </tr>
        </thead>
        <tbody>${itemsHTML}</tbody>
      </table>
      <div class="divider"></div>
      <table>
        <tr>
          <td style="text-align:left;font-size:14px;padding:4px 0;" class="bold">TOTAL</td>
          <td style="text-align:right;font-size:14px;padding:4px 0;" class="bold">₹${grandTotal.toFixed(0)}</td>
        </tr>
      </table>
      <div class="divider"></div>
      <p class="center" style="font-size:10px;padding:4px 0;">Thank you! Visit again!</p>
      <div class="divider"></div>
    </body>
    </html>
  `;
};

module.exports = {
  generateKOTData,
  generateKOTHTML,
  generateBillHTML,
  formatTime,
  formatDate,
};
