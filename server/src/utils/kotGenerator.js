/**
 * KOT (Kitchen Order Ticket) Generator
 * Generates receipt data for thermal/KOT printers
 * Two copies: Kitchen Copy & Waiter Copy
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
 * @param {Object} order - Order with items and session/table info
 * @param {String} copyType - "KITCHEN" or "WAITER"
 * @returns {Object} Structured receipt data
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
 * Generate HTML receipt for browser printing
 * Formatted for 80mm thermal paper (standard KOT printer width)
 */
const generateKOTHTML = (order, copyType) => {
  const data = generateKOTData(order, copyType);

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
      <title>${data.title} - Order #${data.orderNumber}</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 2mm;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Courier New', monospace;
          width: 76mm;
          padding: 2mm;
        }
        .divider {
          border-top: 1px dashed #000;
          margin: 4px 0;
        }
        .center {
          text-align: center;
        }
        .bold {
          font-weight: bold;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
      </style>
    </head>
    <body>
      <div class="divider"></div>
      <p class="center bold" style="font-size:16px;padding:4px 0;">
        ${data.title}
      </p>
      <div class="divider"></div>

      <p style="font-size:14px;padding:6px 0;">
        <strong>Table : ${data.tableCode}</strong>
      </p>

      <div class="divider"></div>

      <table>
        ${itemsHTML}
      </table>

      <div class="divider"></div>

      <p style="font-size:12px;padding:2px 0;">
        Time : ${data.time}
      </p>
      <p style="font-size:12px;padding:2px 0;">
        Date : ${data.date}
      </p>
      <p class="bold" style="font-size:14px;padding:4px 0;">
        Order #${data.orderNumber}
      </p>

      <div class="divider"></div>
      <p class="center" style="font-size:10px;padding:4px 0;">
        Nookambika Dhaba
      </p>
      <div class="divider"></div>
    </body>
    </html>
  `;
};

/**
 * Generate bill receipt HTML
 */
const generateBillHTML = (session) => {
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
      <title>Bill - Table ${session.table.code}</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 2mm;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Courier New', monospace;
          width: 76mm;
          padding: 2mm;
        }
        .divider { border-top: 1px dashed #000; margin: 4px 0; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        table { width: 100%; border-collapse: collapse; }
      </style>
    </head>
    <body>
      <div class="divider"></div>
      <p class="center bold" style="font-size:16px;padding:4px 0;">
        Nookambika Dhaba
      </p>
      <p class="center" style="font-size:11px;padding:2px 0;">
        BILL
      </p>
      <div class="divider"></div>

      <p style="font-size:13px;padding:4px 0;">
        <strong>Table : ${session.table.code}</strong>
      </p>
      <p style="font-size:11px;padding:2px 0;">
        Date : ${formatDate(session.createdAt)}
      </p>
      <p style="font-size:11px;padding:2px 0;">
        Time : ${formatTime(new Date())}
      </p>

      <div class="divider"></div>

      <table>
        <thead>
          <tr>
            <th style="text-align:left;font-size:12px;padding:2px 0;">Item</th>
            <th style="text-align:center;font-size:12px;padding:2px 0;">Qty</th>
            <th style="text-align:right;font-size:12px;padding:2px 0;">Amt</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>

      <div class="divider"></div>

      <table>
        <tr>
          <td style="text-align:left;font-size:14px;padding:4px 0;" class="bold">TOTAL</td>
          <td style="text-align:right;font-size:14px;padding:4px 0;" class="bold">₹${grandTotal.toFixed(0)}</td>
        </tr>
      </table>

      <div class="divider"></div>
      <p class="center" style="font-size:10px;padding:4px 0;">
        Thank you! Visit again!
      </p>
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
