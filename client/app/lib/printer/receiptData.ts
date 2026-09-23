import type { ReceiptData, ReceiptItem } from "./types";

interface RestaurantBranding {
  name?: string;
  shortName?: string;
  logo?: string | null;
  accentColor?: string | null;
  primaryColor?: string | null;
  receiptFooter?: string | null;
  welcomeMessage?: string | null;
  taxPercent?: number;
  serviceChargePercent?: number;
}

function resolveItemName(item: any, index: number): string {
  return item?.menuItem?.name || item?.name || item?.food?.name || item?.title || item?.itemName || `Item #${index + 1}`;
}

function resolveIsVeg(item: any): boolean | null {
  if (typeof item?.menuItem?.isVeg === "boolean") return item.menuItem.isVeg;
  if (typeof item?.isVeg === "boolean") return item.isVeg;
  return null;
}

function normalizeItems(rawItems: any[]): ReceiptItem[] {
  return (rawItems || []).map((item, index) => {
    const quantity = Number(item?.quantity ?? item?.qty ?? 1);
    const price = Number(item?.price ?? item?.menuItem?.price ?? item?.unitPrice ?? item?.amount ?? 0);
    return {
      name: resolveItemName(item, index),
      quantity,
      price,
      isVeg: resolveIsVeg(item),
      total: quantity * price,
    };
  });
}

function computeTotals(items: ReceiptItem[], restaurant: RestaurantBranding) {
  const subtotal = items.reduce((sum, i) => sum + i.total, 0);
  const taxPercent = Number(restaurant?.taxPercent) || 0;
  const serviceChargePercent = Number(restaurant?.serviceChargePercent) || 0;
  const taxAmount = Math.round(subtotal * (taxPercent / 100) * 100) / 100;
  const serviceChargeAmount = Math.round(subtotal * (serviceChargePercent / 100) * 100) / 100;
  const grandTotal = Math.round((subtotal + taxAmount + serviceChargeAmount) * 100) / 100;
  return { subtotal, taxPercent, taxAmount, serviceChargePercent, serviceChargeAmount, grandTotal };
}

/** Builds a normalized bill receipt from a session (or a flattened bill-request row). */
export function buildBillReceiptData(session: any, restaurant: RestaurantBranding, opts: { qrUrl?: string | null } = {}): ReceiptData {
  let rawItems: any[] = [];
  if (Array.isArray(session?.items) && session.items.length > 0) {
    rawItems = session.items;
  } else if (Array.isArray(session?.orders)) {
    session.orders.forEach((o: any) => {
      if (o.status !== "CANCELLED" && Array.isArray(o.items)) rawItems.push(...o.items);
    });
  }

  const items = normalizeItems(rawItems);
  const totals = computeTotals(items, restaurant);
  const tableCode = session?.tableCode || session?.table?.code;
  const tableNumber = session?.tableNumber ?? session?.table?.number;

  return {
    documentType: "BILL",
    restaurantName: restaurant?.name || restaurant?.shortName || "Restaurant",
    logo: restaurant?.logo,
    accentColor: restaurant?.accentColor || restaurant?.primaryColor || "#E8891C",
    title: "Bill Receipt",
    tableCode,
    tableNumber,
    orderNumber: session?.sessionNumber || tableCode || session?.sessionId || session?.id,
    sessionId: session?.sessionId || session?.id,
    timestamp: session?.createdAt || new Date().toISOString(),
    items,
    ...totals,
    footerMessage: restaurant?.receiptFooter || "Thank you for dining with us!",
    welcomeMessage: restaurant?.welcomeMessage,
    qrUrl: opts.qrUrl || null,
  };
}

/** Builds a normalized KOT from an order. */
export function buildKotReceiptData(order: any, restaurant: RestaurantBranding, copyLabel = "Kitchen Copy"): ReceiptData {
  const items = normalizeItems(order?.items || []);
  const tableCode = order?.tableCode || order?.session?.table?.code;
  const tableNumber = order?.tableNumber ?? order?.session?.table?.number;

  return {
    documentType: "KOT",
    restaurantName: restaurant?.name || restaurant?.shortName || "Restaurant",
    logo: restaurant?.logo,
    accentColor: restaurant?.accentColor || restaurant?.primaryColor || "#E8891C",
    title: "Kitchen Order Ticket",
    copyLabel,
    tableCode,
    tableNumber,
    orderNumber: order?.orderNumber || order?.id,
    sessionId: order?.sessionId || order?.session?.id,
    timestamp: order?.createdAt || new Date().toISOString(),
    items,
    subtotal: 0,
    taxPercent: 0,
    taxAmount: 0,
    serviceChargePercent: 0,
    serviceChargeAmount: 0,
    grandTotal: 0,
    notes: order?.notes || order?.specialInstructions || null,
  };
}

/** A small deterministic sample used by the Test Print page — no live order needed. */
export function buildSampleReceiptData(documentType: "BILL" | "KOT", restaurant: RestaurantBranding): ReceiptData {
  const items: ReceiptItem[] = [
    { name: "Paneer Butter Masala", quantity: 1, price: 260, isVeg: true, total: 260 },
    { name: "Chicken 65 (Starter)", quantity: 2, price: 280, isVeg: false, total: 560 },
    { name: "Butter Naan", quantity: 4, price: 45, isVeg: true, total: 180 },
  ];
  const totals = computeTotals(items, restaurant);

  return {
    documentType,
    restaurantName: restaurant?.name || restaurant?.shortName || "Restaurant",
    logo: restaurant?.logo,
    accentColor: restaurant?.accentColor || restaurant?.primaryColor || "#E8891C",
    title: documentType === "BILL" ? "Sample Bill" : "Sample Kitchen Order Ticket",
    copyLabel: documentType === "KOT" ? "Kitchen Copy" : undefined,
    tableCode: "T05",
    tableNumber: 5,
    orderNumber: "SAMPLE-99",
    timestamp: new Date().toISOString(),
    items,
    ...(documentType === "BILL" ? totals : { subtotal: 0, taxPercent: 0, taxAmount: 0, serviceChargePercent: 0, serviceChargeAmount: 0, grandTotal: 0 }),
    notes: documentType === "KOT" ? "Test print — no real order" : null,
    footerMessage: restaurant?.receiptFooter || "Thank you for dining with us!",
  };
}
