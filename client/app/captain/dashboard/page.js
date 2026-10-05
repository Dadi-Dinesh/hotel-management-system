"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  ClipboardList,
  X,
  Printer,
  LogOut,
  RefreshCcw,
  Receipt,
  Clock,
  Users,
  PhoneCall,
  ChefHat,
  Utensils,
  Flame,
  Power,
} from "lucide-react";
import api from "../../lib/api";
import { getUser, clearAuth, isAuthenticated, getEffectiveRestaurantId } from "../../lib/auth";
import { useSocket } from "../../components/SocketProvider";
import { useRestaurant } from "../../components/RestaurantContext";
import { DEMO_RESTAURANT } from "../../lib/branding";
import OrderStatusBadge from "../../components/OrderStatusBadge";
import toast from "react-hot-toast";
import { PrintService } from "../../lib/printer/PrintService";
import { usePrinterSettings } from "../../lib/printer/usePrinterSettings";
import { buildBillReceiptData, buildKotReceiptData } from "../../lib/printer/receiptData";
import { requestOrQueue } from "../../lib/pwa/queuedRequest";

// ─────────────────────────────────────────
// Notification Sound — Web Audio API beep
// No external file needed, works in all browsers
// ─────────────────────────────────────────
function playNotificationSound(type = "order") {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (type === "waiter") {
      // Double beep for waiter call (urgent)
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
      oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } else {
      // Single pleasant ding for new order
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.4);
    }
  } catch (e) {
    // AudioContext not supported — silently ignore
  }
}

// Valid order status transitions captain can manually trigger
const STATUS_ACTIONS = [
  { status: "PREPARING", label: "Mark Preparing", icon: <ChefHat size={14} />, color: "var(--color-orange-500)" },
  { status: "SERVED", label: "Mark Served", icon: <Utensils size={14} />, color: "var(--color-success)" },
];

export default function CaptainDashboard() {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const { restaurant: activeRestaurant } = useRestaurant();
  const { settings: printerSettings } = usePrinterSettings();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [tableFilter, setTableFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [billRequests, setBillRequests] = useState([]);
  const [printedBills, setPrintedBills] = useState(new Set());
  const [printingBills, setPrintingBills] = useState(new Set());
  const [acceptingOrders, setAcceptingOrders] = useState(new Set());
  const [updatingOrders, setUpdatingOrders] = useState(new Set());
  const [updatingItems, setUpdatingItems] = useState(new Set());
  const [closingSessions, setClosingSessions] = useState(new Set());
  const [paperFormat, setPaperFormat] = useState("80mm");
  const [isKitchenLive, setIsKitchenLive] = useState(true);
  const notifCountRef = useRef(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("printer_paper_format");
      if (saved) setPaperFormat(saved);

      const savedLive = localStorage.getItem("kitchen_live_mode");
      if (savedLive !== null) {
        setIsKitchenLive(savedLive === "true");
      }
    }
  }, []);

  const handleToggleKitchenLive = () => {
    const nextState = !isKitchenLive;
    setIsKitchenLive(nextState);
    if (typeof window !== "undefined") {
      localStorage.setItem("kitchen_live_mode", String(nextState));
    }
    if (socket) {
      socket.emit("kitchen-live-mode", { enabled: nextState, restaurantId: getEffectiveRestaurantId() });
    }
    if (nextState) {
      toast.success("🔥 Kitchen Live Mode Turned ON", { id: "kitchen-live-toggle" });
    } else {
      toast("⏸️ Kitchen Live Mode Turned OFF", {
        icon: "⚠️",
        id: "kitchen-live-toggle",
        style: { background: "#FEF2F2", color: "#991B1B", border: "1px solid #FCA5A5" },
      });
    }
  };

  const handlePaperFormatChange = (fmt) => {
    setPaperFormat(fmt);
    if (typeof window !== "undefined") {
      localStorage.setItem("printer_paper_format", fmt);
    }
    const label =
      fmt === "A4"
        ? "A4 Document Sheet"
        : fmt === "58mm"
        ? "58mm (2-inch Thermal)"
        : "80mm (3-inch Thermal POS)";
    toast.success(`Printer format set to ${label}`);
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/captain/login");
      return;
    }
    const u = getUser();
    // ADMIN deliberately excluded — an admin account has its own portal and
    // must not be able to reach the Captain dashboard directly (see the
    // login architecture audit in captain/login/page.js).
    if (!["CAPTAIN", "MANAGER"].includes(u?.role)) {
      router.push("/captain/login");
      return;
    }
    setUser(u);
  }, [router]);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.get("/orders");
      setOrders(res.data.data);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTables = useCallback(async () => {
    try {
      const res = await api.get("/tables");
      setTables(res.data.data);
    } catch (error) {
      console.error("Failed to fetch tables:", error);
    }
  }, []);

  const fetchBillRequests = useCallback(async () => {
    try {
      const res = await api.get("/sessions/bill-requests");
      setBillRequests(res.data.data);
    } catch (error) {
      console.error("Failed to fetch bill requests:", error);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchBillRequests();
    fetchTables();
  }, [fetchOrders, fetchBillRequests, fetchTables]);

  // ─────────────────────────────────────────
  // SOCKET LISTENERS & REAL-TIME SYNCHRONIZATION
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    console.log("Listening for new-order events");

    // Join room function — safe to call on mount and on reconnect
    const joinRoom = () => {
      console.log("[Captain Dashboard] Emitting join-waiter & join-captain to join room...");
      const joinPayload = { restaurantId: getEffectiveRestaurantId() };
      socket.emit("join-waiter", joinPayload);
      socket.emit("join-captain", joinPayload);
    };

    // If socket is already connected, join rooms immediately
    if (socket.connected) {
      joinRoom();
    }

    // Listen for connect event for automatic room join on reconnect
    socket.on("connect", joinRoom);

    // ── New Order ──────────────────────────
    const handleNewOrder = (data) => {
      console.log("New order received", data);
      console.log("Received order:", data);
      playNotificationSound("order");

      // Format incoming real-time order for immediate state merge
      const newOrderCard = {
        id: data.id || data.orderId,
        orderNumber: data.orderNumber,
        status: data.status || "PENDING",
        createdAt: data.createdAt || new Date().toISOString(),
        session: data.session || {
          status: "ACTIVE",
          table: {
            code: data.tableCode,
            number: data.tableNumber,
          },
        },
        items: (data.items || []).map((i) => ({
          id: i.id || `${data.orderId}-${i.name}`,
          menuItem: i.menuItem || { name: i.name },
          quantity: i.quantity,
          price: i.price,
        })),
        ...data,
      };

      // 1. Immediately prepend to local orders state for instant UI update
      setOrders((prev) => {
        const exists = prev.some((o) => o.id === newOrderCard.id);
        if (exists) return prev;
        return [newOrderCard, ...prev];
      });

      // 2. Add notification badge
      const notif = {
        id: Date.now(),
        type: "new-order",
        icon: "🍛",
        message: `New order from Table ${data.tableCode}`,
        subtext: `${data.items?.length || 0} item(s) — #${data.orderNumber}`,
        data,
        timestamp: new Date(),
      };
      setNotifications((prev) => [notif, ...prev.slice(0, 49)]);
      setShowNotifications(true);

      toast.success(`🔔 New order from Table ${data.tableCode}!`, {
        duration: 6000,
        id: `order-${data.orderId || data.id}`,
      });

      // 3. Asynchronously fetch fresh DB state to guarantee consistency
      fetchOrders();
      fetchTables();
    };

    // ── Waiter Call ────────────────────────
    const handleWaiterCall = (data) => {
      console.log("Waiter call", data);
      playNotificationSound("waiter");

      const notif = {
        id: Date.now(),
        type: "waiter-call",
        icon: "🔔",
        message: `Table ${data.tableCode} needs assistance`,
        subtext: new Date(data.timestamp).toLocaleTimeString("en-IN", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
        data,
        timestamp: new Date(data.timestamp),
        urgent: true,
      };
      setNotifications((prev) => [notif, ...prev.slice(0, 49)]);
      setShowNotifications(true);

      toast(`📣 Table ${data.tableCode} is calling for assistance!`, {
        duration: 8000,
        icon: "🔔",
        id: `waiter-${data.tableCode}-${Date.now()}`,
        style: { background: "#FEF3C7", border: "1px solid #F59E0B" },
      });
    };

    // ── Bill Requested ─────────────────────
    const handleBillRequested = (data) => {
      console.log("[Captain] bill-requested:", data);
      playNotificationSound("order");
      fetchBillRequests();
      fetchTables();
      toast(`🧾 Bill requested for Table ${data.tableCode}`, {
        duration: 8000,
        icon: "💰",
        id: `bill-${data.sessionId}`,
      });
    };

    // ── Session / Table Updates ────────────
    const handleSessionClosed = () => {
      fetchTables();
      fetchBillRequests();
      fetchOrders();
    };

    const handleTableUpdated = () => {
      fetchTables();
    };

    const handleNewSession = () => {
      fetchTables();
    };

    const handleKitchenLiveModeChanged = (data) => {
      const enabled = typeof data === "boolean" ? data : !!data?.enabled;
      setIsKitchenLive(enabled);
      if (typeof window !== "undefined") {
        localStorage.setItem("kitchen_live_mode", String(enabled));
      }
    };

    socket.on("new-order", handleNewOrder);
    socket.on("waiter-call", handleWaiterCall);
    socket.on("bill-requested", handleBillRequested);
    socket.on("session-closed", handleSessionClosed);
    socket.on("table-updated", handleTableUpdated);
    socket.on("new-session", handleNewSession);
    socket.on("kitchen-live-mode-changed", handleKitchenLiveModeChanged);

    return () => {
      socket.off("connect", joinRoom);
      socket.off("new-order", handleNewOrder);
      socket.off("waiter-call", handleWaiterCall);
      socket.off("bill-requested", handleBillRequested);
      socket.off("session-closed", handleSessionClosed);
      socket.off("table-updated", handleTableUpdated);
      socket.off("new-session", handleNewSession);
      socket.off("kitchen-live-mode-changed", handleKitchenLiveModeChanged);
    };
  }, [socket, fetchOrders, fetchBillRequests, fetchTables]);

  // ─────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────

  const handleAcceptOrder = async (orderId) => {
    setAcceptingOrders((prev) => new Set([...prev, orderId]));
    try {
      const res = await api.patch(`/orders/${orderId}/accept`);
      toast.success(`Order #${res.data.data.order.orderNumber} accepted!`);

      const orderData = res.data.data.order;

      // Universal Print Engine (Phase 8): tries the restaurant's configured
      // kitchen printer first, always falls back to browser print — never
      // blocks order acceptance, which already succeeded above.
      const branding = activeRestaurant || DEMO_RESTAURANT;
      const kotData = buildKotReceiptData(orderData, branding, "Kitchen Copy");
      PrintService.print({ documentType: "KOT", data: kotData, settings: printerSettings, silent: true }).catch(() => {});
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to accept order");
    } finally {
      setAcceptingOrders((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  const handleMarkItemServed = async (itemId) => {
    setUpdatingItems((prev) => new Set([...prev, itemId]));
    try {
      const result = await requestOrQueue({
        type: "ITEM_STATUS",
        method: "patch",
        url: `/orders/items/${itemId}/status`,
        body: { status: "SERVED" },
        label: "Item marked served",
        offlineMessage: "You're offline — this will sync the moment you're back online.",
      });
      if (!result.queued) toast.success(`Item marked as served! 🍽️`);
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to mark item served");
    } finally {
      setUpdatingItems((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const handleUpdateStatus = async (orderId, status) => {
    setUpdatingOrders((prev) => new Set([...prev, `${orderId}-${status}`]));
    try {
      const result = await requestOrQueue({
        type: "ORDER_STATUS",
        method: "patch",
        url: `/orders/${orderId}/status`,
        body: { status },
        label: `Order ${status.toLowerCase()}`,
        offlineMessage: "You're offline — this will sync the moment you're back online.",
      });
      if (!result.queued) {
        const label = status === "SERVED" ? "marked as served" : `marked as ${status.toLowerCase()}`;
        toast.success(`Order ${label} ✅`);
      }
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update status");
    } finally {
      setUpdatingOrders((prev) => {
        const next = new Set(prev);
        next.delete(`${orderId}-${status}`);
        return next;
      });
    }
  };

  const handlePrintAndCloseBill = async (bill) => {
    const sessionId = bill.sessionId;
    setPrintingBills((prev) => new Set([...prev, sessionId]));

    try {
      // 1. Universal Print Engine (Phase 8): try the restaurant's configured
      // bill printer, then the thermal agent, then — guaranteed — the
      // browser print dialog. Unlike before, an offline/unconfigured
      // printer no longer blocks closing the table: browser print always
      // succeeds from the service's perspective (it just opens the dialog),
      // so this only ever fails if literally nothing could run at all.
      const branding = activeRestaurant || DEMO_RESTAURANT;
      const billData = buildBillReceiptData(bill, branding);
      const outcome = await PrintService.print({ documentType: "BILL", data: billData, settings: printerSettings });

      if (!outcome.success) {
        toast.error("Could not print the bill on any available method. Session & orders remain active.");
        return;
      }
      if (outcome.fellBack) {
        toast(`Printed via ${outcome.adapterUsed === "BROWSER" ? "browser print dialog" : outcome.adapterUsed.toLowerCase()} (configured printer unavailable).`, { icon: "🖨️" });
      }

      // 2. ONLY AFTER SUCCESSFUL PRINTING: Close session & cleanup active table orders
      await api.patch(`/sessions/${sessionId}/close`);
      toast.success(`Bill Printed & Table ${bill.tableCode} Closed Successfully! 🧾`);

      // Emit socket notification to update Captain and Kitchen dashboards in real-time
      if (socket) {
        socket.emit("session-closed", { sessionId, tableCode: bill.tableCode });
      }

      // Refresh state: session closes, active orders and table card disappear automatically
      fetchBillRequests();
      fetchOrders();
      fetchTables();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to complete billing & close session");
    } finally {
      setPrintingBills((prev) => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });
    }
  };

  const handleCloseSession = async (sessionId) => {
    setClosingSessions((prev) => new Set([...prev, sessionId]));
    try {
      await api.patch(`/sessions/${sessionId}/close`);
      toast.success("Session closed");
      fetchBillRequests();
      fetchOrders();
      fetchTables();
    } catch (error) {
      toast.error("Failed to close session");
    } finally {
      setClosingSessions((prev) => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });
    }
  };

  const handleLogout = () => {
    clearAuth();
    router.push("/captain/login");
  };

  const unreadCount = notifications.filter((n) => n.urgent).length;
  const pendingOrders = orders.filter((o) => o.status === "PENDING");
  const activeOrders = orders.filter(
    (o) => ["ACCEPTED", "PREPARING"].includes(o.status) && o.session?.status === "ACTIVE"
  );
  const completedOrders = orders.filter((o) => ["SERVED", "CANCELLED"].includes(o.status)).slice(0, 10);

  // Live Seating calculations
  let totalCapacity = 0;
  let occupiedSeats = 0;
  let freeSeats = 0;
  let occupiedTablesCount = 0;
  let availableTablesCount = 0;

  tables.forEach((t) => {
    const cap = t.capacity || 4;
    if (t.isActive) {
      if (t.activeSession) {
        occupiedTablesCount++;
        occupiedSeats += cap;
        totalCapacity += cap;
      } else {
        availableTablesCount++;
        freeSeats += cap;
        totalCapacity += cap;
      }
    }
  });

  const filteredTables = tables.filter((t) => {
    if (!t.isActive) return false;
    if (tableFilter === "occupied") return !!t.activeSession;
    if (tableFilter === "available") return !t.activeSession;
    return true;
  });

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--ss-bg)" }}>
      <header
        className="sticky top-0 z-40 backdrop-blur-md border-b"
        style={{ background: "rgba(255, 253, 248, 0.9)", borderColor: "var(--ss-border)" }}
      >
        <div className="h-16 px-4 sm:px-5 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg font-bold truncate" style={{ fontFamily: "var(--font-heading)", color: "var(--ss-primary)" }}>
              Captain Dashboard
            </h1>
            <p className="ss-caption font-semibold truncate">Welcome, {user.name}</p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className="hidden sm:inline-flex items-center gap-1.5 ss-caption font-bold px-2.5 py-1.5 rounded-full"
              style={{
                background: isConnected ? "rgba(27,138,90,0.1)" : "rgba(214,69,69,0.1)",
                color: isConnected ? "var(--ss-success)" : "var(--ss-danger)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: isConnected ? "var(--ss-success)" : "var(--ss-danger)" }} />
              {isConnected ? "Live" : "Offline"}
            </span>

            <button
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label="Notifications"
              className="relative w-10 h-10 rounded-full flex items-center justify-center transition-colors"
              style={{ background: "var(--ss-bg)", color: "var(--ss-primary)" }}
            >
              <Bell size={18} />
              {notifications.length > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px]"
                  style={{ background: "var(--ss-danger)", color: "#fff" }}
                >
                  {notifications.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                fetchOrders();
                fetchTables();
                fetchBillRequests();
              }}
              aria-label="Refresh"
              className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
              style={{ background: "var(--ss-bg)", color: "var(--ss-primary)" }}
            >
              <RefreshCcw size={16} />
            </button>

            <button
              onClick={handleLogout}
              aria-label="Logout"
              className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
              style={{ background: "var(--ss-bg)", color: "var(--ss-danger)" }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        {/* Kitchen Live Mode Control & Printer Paper Format Setup Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Kitchen Live Mode Control Card */}
          <div
            className="rounded-[var(--ss-radius-card)] p-4 flex items-center justify-between gap-3"
            style={{
              border: `1px solid ${isKitchenLive ? "rgba(27,138,90,0.35)" : "rgba(217,140,0,0.35)"}`,
              background: isKitchenLive ? "rgba(27,138,90,0.06)" : "rgba(217,140,0,0.08)",
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: isKitchenLive ? "var(--ss-success)" : "var(--ss-warning)", color: "#fff" }}
              >
                <Flame size={20} className={isKitchenLive ? "animate-pulse" : ""} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold ss-small" style={{ color: "var(--ss-primary)" }}>Kitchen Live Mode</p>
                  <span
                    className="ss-caption font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: isKitchenLive ? "rgba(27,138,90,0.14)" : "rgba(217,140,0,0.16)",
                      color: isKitchenLive ? "var(--ss-success)" : "var(--ss-warning)",
                    }}
                  >
                    {isKitchenLive ? "Active" : "Paused"}
                  </span>
                </div>
                <p className="ss-caption mt-0.5">
                  {isKitchenLive ? "Real-time kitchen order dispatch is active" : "Kitchen display live updates are turned off"}
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleKitchenLive}
              className="ss-btn flex-shrink-0 px-4 py-2.5 rounded-xl ss-caption font-bold flex items-center gap-1.5"
              style={{ background: isKitchenLive ? "var(--ss-success)" : "var(--ss-warning)", color: "#fff" }}
            >
              <Power size={13} />
              {isKitchenLive ? "Turn Off" : "Turn On"}
            </button>
          </div>

          {/* Printer Paper Format Setup */}
          <div
            className="rounded-[var(--ss-radius-card)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            style={{ border: "1px solid var(--ss-border)", background: "var(--ss-surface)" }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--ss-accent-tint)", color: "var(--ss-accent-dark)" }}>
                <Printer size={16} />
              </div>
              <div className="min-w-0">
                <p className="font-bold ss-small" style={{ color: "var(--ss-primary)" }}>Billing &amp; KOT Printer Format</p>
                <p className="ss-caption">
                  Active: <strong style={{ color: "var(--ss-accent-dark)" }}>{paperFormat === "A4" ? "A4 Sheet" : paperFormat === "58mm" ? "58mm (2\")" : "80mm (3\")"}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: "80mm", label: "80mm" },
                { id: "58mm", label: "58mm" },
                { id: "A4", label: "A4" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => handlePaperFormatChange(f.id)}
                  className="px-3 py-1.5 rounded-full ss-caption font-bold transition-all"
                  style={{
                    background: paperFormat === f.id ? "var(--ss-primary)" : "var(--ss-bg)",
                    color: paperFormat === f.id ? "var(--ss-on-accent)" : "var(--ss-secondary)",
                    border: "1px solid var(--ss-border)",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Seating Stats Bar */}
        <section className="mb-8 rounded-[var(--ss-radius-card)] p-4 sm:p-5" style={{ border: "1px solid var(--ss-border)", background: "var(--ss-surface)" }}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-4 border-b" style={{ borderColor: "var(--ss-border)" }}>
            <div>
              <h2 className="ss-h3 flex items-center gap-2.5" style={{ marginBottom: 0 }}>
                <Users size={20} style={{ color: "var(--ss-accent-dark)" }} />
                Live Seats &amp; Tables
              </h2>
              <p className="ss-caption mt-1">Real-time dining room seating tracker</p>
            </div>

            <div className="flex gap-1.5 flex-wrap">
              {[
                { id: "all", label: `All (${tables.filter((t) => t.isActive).length})` },
                { id: "occupied", label: `Occupied (${occupiedTablesCount})` },
                { id: "available", label: `Free (${availableTablesCount})` },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTableFilter(t.id)}
                  className="ss-caption font-bold px-3 py-1.5 rounded-full transition-all"
                  style={{
                    background: tableFilter === t.id ? "var(--ss-primary)" : "var(--ss-bg)",
                    color: tableFilter === t.id ? "var(--ss-on-accent)" : "var(--ss-secondary)",
                    border: "1px solid var(--ss-border)",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Counter Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="p-3 rounded-2xl" style={{ background: "var(--ss-bg)", border: "1px solid var(--ss-border)" }}>
              <span className="ss-caption font-bold block">Total Seats</span>
              <span className="text-xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--ss-primary)" }}>{totalCapacity}</span>
            </div>
            <div className="p-3 rounded-2xl" style={{ background: "var(--ss-accent-tint)", border: "1px solid var(--ss-border)" }}>
              <span className="ss-caption font-bold block" style={{ color: "var(--ss-accent-dark)" }}>Occupied</span>
              <span className="text-xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--ss-accent-dark)" }}>{occupiedSeats}</span>
            </div>
            <div className="p-3 rounded-2xl" style={{ background: "rgba(27,138,90,0.08)", border: "1px solid var(--ss-border)" }}>
              <span className="ss-caption font-bold block" style={{ color: "var(--ss-success)" }}>Free</span>
              <span className="text-xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--ss-success)" }}>{freeSeats}</span>
            </div>
            <div className="p-3 rounded-2xl" style={{ background: "var(--ss-bg)", border: "1px solid var(--ss-border)" }}>
              <span className="ss-caption font-bold block">Occupancy</span>
              <span className="text-xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--ss-primary)" }}>
                {totalCapacity > 0 ? Math.round((occupiedSeats / totalCapacity) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Table Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredTables.map((table) => {
              const isOccupied = !!table.activeSession;
              const isBillRequested = isOccupied && table.activeSession.status === "BILL_REQUESTED";

              let runningTotal = 0;
              if (isOccupied && table.activeSession.orders) {
                table.activeSession.orders.forEach((o) => {
                  if (o.status !== "CANCELLED") {
                    o.items.forEach((i) => {
                      runningTotal += i.price * i.quantity;
                    });
                  }
                });
              }

              const tone = isBillRequested
                ? { border: "rgba(217,140,0,0.4)", bg: "rgba(217,140,0,0.08)" }
                : isOccupied
                ? { border: "rgba(232,144,23,0.4)", bg: "var(--ss-accent-tint)" }
                : { border: "var(--ss-border)", bg: "var(--ss-surface)" };

              return (
                <div
                  key={table.id}
                  className="p-3 rounded-2xl transition-all flex flex-col justify-between"
                  style={{ border: `1px solid ${tone.border}`, background: tone.bg }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-base" style={{ fontFamily: "var(--font-heading)", color: "var(--ss-primary)" }}>
                        {table.code}
                      </span>
                      <span className="ss-caption font-semibold">👥 {table.capacity || 4}</span>
                    </div>

                    {isBillRequested ? (
                      <span className="ss-caption font-bold px-1.5 py-0.5 rounded-full block text-center" style={{ background: "var(--ss-warning)", color: "var(--ss-primary)" }}>
                        🧾 Bill Req.
                      </span>
                    ) : isOccupied ? (
                      <span className="ss-caption font-bold px-1.5 py-0.5 rounded-full block text-center" style={{ background: "var(--ss-accent)", color: "var(--ss-on-accent)" }}>
                        Occupied
                      </span>
                    ) : (
                      <span className="ss-caption font-bold px-1.5 py-0.5 rounded-full block text-center" style={{ background: "var(--ss-success)", color: "#fff" }}>
                        Free
                      </span>
                    )}
                  </div>

                  {isOccupied && (
                    <div className="mt-2 pt-1.5 border-t ss-caption font-bold flex justify-between" style={{ borderColor: "var(--ss-border)" }}>
                      <span style={{ color: "var(--ss-secondary)" }}>Total:</span>
                      <span style={{ color: "var(--ss-accent-dark)" }}>₹{runningTotal}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Bill Requests */}
        {billRequests.length > 0 && (
          <div className="mb-8 space-y-3">
            {billRequests.map((bill) => (
              <div
                key={bill.sessionId}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-[var(--ss-radius-card)]"
                style={{ border: "1px solid rgba(217,140,0,0.4)", background: "rgba(217,140,0,0.08)" }}
              >
                <div className="flex items-center gap-3.5">
                  <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--ss-warning)", color: "var(--ss-primary)" }}>
                    <Receipt size={22} />
                  </span>
                  <div>
                    <p className="font-bold ss-body" style={{ color: "var(--ss-primary)" }}>
                      Bill Requested — Table {bill.tableCode}
                    </p>
                    <p className="ss-small font-semibold mt-0.5">Total Amount: ₹{bill.total}</p>
                  </div>
                </div>

                <button
                  onClick={() => handlePrintAndCloseBill(bill)}
                  disabled={printingBills.has(bill.sessionId)}
                  className="ss-btn px-5 py-3 ss-caption font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: "var(--ss-success)", color: "#fff", borderRadius: "var(--ss-radius-button)" }}
                >
                  <Printer size={16} />
                  {printingBills.has(bill.sessionId) ? "Printing & Closing..." : "Print & Close Bill"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Pending Orders */}
        <section className="mb-8">
          <h2 className="ss-h3 mb-4 flex items-center gap-2.5">
            <Clock size={18} style={{ color: "var(--ss-accent-dark)" }} />
            Pending Orders
            {pendingOrders.length > 0 && (
              <span className="ss-caption font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--ss-danger)", color: "#fff" }}>
                {pendingOrders.length}
              </span>
            )}
          </h2>

          {pendingOrders.length === 0 ? (
            <div className="text-center py-10 rounded-[var(--ss-radius-card)]" style={{ border: "1px dashed var(--ss-border)" }}>
              <p className="ss-small font-semibold">No pending orders.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {pendingOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-[var(--ss-radius-card)] p-4 sm:p-5 border-l-4"
                  style={{ border: "1px solid var(--ss-border)", borderLeftWidth: 4, borderLeftColor: "var(--ss-accent)", background: "var(--ss-surface)", boxShadow: "var(--ss-shadow-sm)" }}
                >
                  <div className="flex items-center justify-between mb-3 pb-3 border-b" style={{ borderColor: "var(--ss-border)" }}>
                    <div>
                      <span className="font-bold ss-body" style={{ fontFamily: "var(--font-heading)", color: "var(--ss-primary)" }}>
                        Table {order.session.table.code}
                      </span>
                      <span className="ss-caption font-semibold ml-2">#{order.orderNumber}</span>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <div className="space-y-1.5 mb-4">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between ss-small font-semibold">
                        <span style={{ color: "var(--ss-secondary)" }}>{item.menuItem.name}</span>
                        <span style={{ color: "var(--ss-primary)" }}>× {item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="ss-caption font-semibold whitespace-nowrap">
                      {new Date(order.createdAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })}
                    </span>
                    <button
                      onClick={() => handleAcceptOrder(order.id)}
                      disabled={acceptingOrders.has(order.id)}
                      className="ss-btn px-4 py-2.5 ss-caption font-bold flex items-center gap-1.5 disabled:opacity-60"
                      style={{ background: "var(--ss-accent)", color: "var(--ss-on-accent)", borderRadius: "var(--ss-radius-button)" }}
                    >
                      <Check size={14} />
                      {acceptingOrders.has(order.id) ? "Accepting..." : "Accept & Print KOT"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Active Orders — with status update buttons */}
        <section className="mb-8">
          <h2 className="ss-h3 mb-4 flex items-center gap-2.5">
            <ClipboardList size={18} style={{ color: "var(--ss-primary)" }} />
            Active Orders
          </h2>

          {activeOrders.length === 0 ? (
            <div className="text-center py-10 rounded-[var(--ss-radius-card)]" style={{ border: "1px dashed var(--ss-border)" }}>
              <p className="ss-small font-semibold">No active orders.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-[var(--ss-radius-card)] p-4 sm:p-5 border-l-4"
                  style={{ border: "1px solid var(--ss-border)", borderLeftWidth: 4, borderLeftColor: "var(--ss-success)", background: "var(--ss-surface)", boxShadow: "var(--ss-shadow-sm)" }}
                >
                  <div className="flex items-center justify-between mb-3 pb-3 border-b" style={{ borderColor: "var(--ss-border)" }}>
                    <div>
                      <span className="font-bold ss-body" style={{ fontFamily: "var(--font-heading)", color: "var(--ss-primary)" }}>
                        Table {order.session.table.code}
                      </span>
                      <span className="ss-caption font-semibold ml-2">#{order.orderNumber}</span>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>

                  <div className="space-y-2 mb-4">
                    {order.items.map((item) => {
                      const isItemServed = item.status === "SERVED";
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 ss-small font-semibold p-2.5 rounded-xl"
                          style={{ background: "var(--ss-bg)" }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="truncate" style={{ color: "var(--ss-primary)" }}>{item.menuItem?.name || item.name}</span>
                            <span className="flex-shrink-0 font-bold" style={{ color: "var(--ss-accent-dark)" }}>× {item.quantity}</span>
                          </div>

                          {isItemServed ? (
                            <span className="ss-caption font-bold px-2 py-1 rounded-full flex-shrink-0" style={{ background: "rgba(27,138,90,0.12)", color: "var(--ss-success)" }}>
                              ✓ Served
                            </span>
                          ) : (
                            <button
                              onClick={() => handleMarkItemServed(item.id)}
                              disabled={updatingItems.has(item.id)}
                              className="ss-btn flex-shrink-0 px-3 py-2 ss-caption font-bold flex items-center gap-1 disabled:opacity-50"
                              style={{ background: "var(--ss-success)", color: "#fff", borderRadius: "var(--ss-radius-button)" }}
                            >
                              <Utensils size={12} />
                              {updatingItems.has(item.id) ? "Serving..." : "Served"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Status Update Buttons — captain updates order progress */}
                  <div className="flex gap-2 flex-wrap pt-3 border-t" style={{ borderColor: "var(--ss-border)" }}>
                    {STATUS_ACTIONS.map((action) => {
                      // Don't show button for current status or for already-past statuses
                      if (order.status === action.status) return null;
                      if (order.status === "PREPARING" && action.status === "ACCEPTED") return null;
                      const key = `${order.id}-${action.status}`;
                      return (
                        <button
                          key={action.status}
                          onClick={() => handleUpdateStatus(order.id, action.status)}
                          disabled={updatingOrders.has(key)}
                          className="flex items-center gap-1.5 px-3 py-2 ss-caption font-bold rounded-full transition-all"
                          style={{
                            border: `1px solid ${action.color}`,
                            color: action.color,
                            background: "var(--ss-surface)",
                            opacity: updatingOrders.has(key) ? 0.6 : 1,
                          }}
                        >
                          {action.icon}
                          {updatingOrders.has(key) ? "..." : action.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Notification Sidebar */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowNotifications(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(59, 34, 10, 0.5)" }} />
          <div
            className="relative w-full max-w-md h-full flex flex-col"
            style={{ background: "var(--ss-surface)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "var(--ss-border)" }}>
              <h3 className="ss-h3" style={{ marginBottom: 0 }}>Notifications</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setNotifications([])}
                  className="ss-caption font-bold px-3 py-1.5 rounded-full"
                  style={{ background: "var(--ss-bg)", color: "var(--ss-secondary)" }}
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowNotifications(false)}
                  aria-label="Close notifications"
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: "var(--ss-bg)", color: "var(--ss-primary)" }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {notifications.length === 0 ? (
                <p className="text-center py-8 ss-small font-semibold">No notifications</p>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="p-4 rounded-2xl"
                    style={{
                      border: `1px solid ${notif.urgent ? "rgba(217,140,0,0.4)" : "var(--ss-border)"}`,
                      background: notif.urgent ? "rgba(217,140,0,0.08)" : "var(--ss-bg)",
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">{notif.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="ss-small font-bold" style={{ color: "var(--ss-primary)" }}>{notif.message}</p>
                        {notif.subtext && <p className="ss-caption mt-0.5">{notif.subtext}</p>}
                        <p className="ss-caption font-semibold mt-1.5">
                          {new Date(notif.timestamp).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })}
                        </p>
                      </div>
                      {notif.urgent && (
                        <span className="flex-shrink-0">
                          <PhoneCall size={15} style={{ color: "var(--ss-warning)" }} />
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
