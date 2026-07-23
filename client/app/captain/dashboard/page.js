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
} from "lucide-react";
import api from "../../lib/api";
import { getUser, clearAuth, isAuthenticated } from "../../lib/auth";
import { useSocket } from "../../components/SocketProvider";
import OrderStatusBadge from "../../components/OrderStatusBadge";
import Navbar from "../../components/Navbar";
import toast from "react-hot-toast";

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
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [tableFilter, setTableFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [billRequests, setBillRequests] = useState([]);
  const [printedBills, setPrintedBills] = useState(new Set());
  const [acceptingOrders, setAcceptingOrders] = useState(new Set());
  const [updatingOrders, setUpdatingOrders] = useState(new Set());
  const [closingSessions, setClosingSessions] = useState(new Set());
  const [paperFormat, setPaperFormat] = useState("80mm");
  const notifCountRef = useRef(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("printer_paper_format");
      if (saved) setPaperFormat(saved);
    }
  }, []);

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
    if (u?.role !== "CAPTAIN" && u?.role !== "ADMIN") {
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
  // SOCKET LISTENERS
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // Join the captains room so server can emit directly to this dashboard
    socket.emit("join-captain");

    // ── New Order ──────────────────────────
    const handleNewOrder = (data) => {
      console.log("[Captain] new-order:", data);
      playNotificationSound("order");

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
        id: `order-${data.orderId}`,
      });
      fetchOrders();
      fetchTables();
    };

    // ── Waiter Call ────────────────────────
    const handleWaiterCall = (data) => {
      console.log("[Captain] waiter-call:", data);
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

    socket.on("new-order", handleNewOrder);
    socket.on("waiter-call", handleWaiterCall);
    socket.on("bill-requested", handleBillRequested);
    socket.on("session-closed", handleSessionClosed);
    socket.on("table-updated", handleTableUpdated);
    socket.on("new-session", handleNewSession);

    return () => {
      socket.off("new-order", handleNewOrder);
      socket.off("waiter-call", handleWaiterCall);
      socket.off("bill-requested", handleBillRequested);
      socket.off("session-closed", handleSessionClosed);
      socket.off("table-updated", handleTableUpdated);
      socket.off("new-session", handleNewSession);
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

      const { kitchen, waiter } = res.data.data.kot;
      const kitchenHTML = kitchen.formats?.[paperFormat] || kitchen.html;
      const waiterHTML = waiter.formats?.[paperFormat] || waiter.html;

      const printWindow = window.open("", "_blank", "width=800,height=900");
      if (printWindow) {
        printWindow.document.write(`
          ${kitchenHTML}
          <div style="page-break-after: always;"></div>
          ${waiterHTML}
        `);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 300);
      }
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

  const handleUpdateStatus = async (orderId, status) => {
    setUpdatingOrders((prev) => new Set([...prev, `${orderId}-${status}`]));
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      const label = status === "SERVED" ? "marked as served" : `marked as ${status.toLowerCase()}`;
      toast.success(`Order ${label} ✅`);
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

  const handleCloseSession = async (sessionId) => {
    setClosingSessions((prev) => new Set([...prev, sessionId]));
    try {
      await api.patch(`/sessions/${sessionId}/close`);
      toast.success("Session closed");
      fetchBillRequests();
      fetchOrders();
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
    <div className="min-h-screen" style={{ background: "var(--color-surface)" }}>
      <Navbar
        title="Captain Dashboard"
        subtitle={`Welcome, ${user.name}`}
        rightContent={
          <div className="flex items-center gap-3">
            {/* Socket connection indicator */}
            <div
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2 py-1 border"
              style={{
                borderColor: isConnected ? "var(--color-success)" : "var(--color-danger)",
                color: isConnected ? "var(--color-success)" : "var(--color-danger)",
                background: isConnected ? "#f0fdf4" : "#fef2f2",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: isConnected ? "var(--color-success)" : "var(--color-danger)" }}
              />
              {isConnected ? "LIVE" : "OFFLINE"}
            </div>

            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative w-10 h-10 border flex items-center justify-center transition-colors hover:bg-brown-900 hover:text-white"
              style={{ borderColor: "var(--color-brown-900)", color: "var(--color-brown-900)" }}
            >
              <Bell size={20} />
              {notifications.length > 0 && (
                <span
                  className="absolute -top-2 -right-2 w-6 h-6 border flex items-center justify-center font-bold text-xs"
                  style={{
                    background: "var(--color-danger)",
                    borderColor: "var(--color-brown-900)",
                    color: "white",
                  }}
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
              className="w-10 h-10 border flex items-center justify-center transition-colors hover:bg-brown-900 hover:text-white"
              style={{ borderColor: "var(--color-brown-900)", color: "var(--color-brown-900)" }}
            >
              <RefreshCcw size={18} />
            </button>

            <button
              onClick={handleLogout}
              className="w-10 h-10 border flex items-center justify-center transition-colors hover:bg-brown-900 hover:text-white"
              style={{ borderColor: "var(--color-brown-900)", color: "var(--color-danger)" }}
            >
              <LogOut size={18} />
            </button>
          </div>
        }
      />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Printer Paper Format Setup */}
        <section className="mb-6 p-4 border-2 border-brown-900 bg-cream-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-orange-500 text-white flex items-center justify-center flex-shrink-0">
              <Printer size={18} />
            </div>
            <div>
              <p className="font-bold text-xs uppercase tracking-widest text-brown-900" style={{ fontFamily: "var(--font-heading)" }}>
                Billing & KOT Printer Paper Format
              </p>
              <p className="text-[11px] font-medium text-gray-600">
                Current Active:{" "}
                <span className="font-bold text-orange-600 uppercase">
                  {paperFormat === "A4" ? "A4 Document Sheet" : paperFormat === "58mm" ? "58mm (2-inch Thermal)" : "80mm (3-inch Thermal POS)"}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: "80mm", label: "🖨️ POS 80mm (3\")" },
              { id: "58mm", label: "📱 POS 58mm (2\")" },
              { id: "A4", label: "📄 A4 Document" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => handlePaperFormatChange(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border`}
                style={{
                  background: paperFormat === f.id ? "var(--color-brown-900)" : "var(--color-surface)",
                  color: paperFormat === f.id ? "white" : "var(--color-brown-900)",
                  borderColor: "var(--color-brown-900)",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </section>

        {/* Live Seating Stats Bar */}
        <section className="mb-10 p-5 border-2 border-brown-900 bg-surface">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-4 border-b border-brown-900">
            <div>
              <h2
                className="text-xl font-black uppercase tracking-widest flex items-center gap-3"
                style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}
              >
                <Users size={24} style={{ color: "var(--color-orange-500)" }} />
                Live Seats & Tables Occupation
              </h2>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mt-1">
                Real-time dining room seating tracker
              </p>
            </div>

            <div className="flex gap-2">
              {[
                { id: "all", label: `ALL (${tables.filter((t) => t.isActive).length})` },
                { id: "occupied", label: `OCCUPIED (${occupiedTablesCount})` },
                { id: "available", label: `FREE (${availableTablesCount})` },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTableFilter(t.id)}
                  className={`text-xs font-black uppercase tracking-wider px-3 py-1.5 border transition-all`}
                  style={{
                    background: tableFilter === t.id ? "var(--color-brown-900)" : "var(--color-surface)",
                    color: tableFilter === t.id ? "white" : "var(--color-brown-900)",
                    borderColor: "var(--color-brown-900)",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Counter Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="p-3 border border-brown-900 bg-cream-50">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block">TOTAL SEATS</span>
              <span className="text-2xl font-black text-brown-900" style={{ fontFamily: "var(--font-heading)" }}>
                {totalCapacity}
              </span>
            </div>
            <div className="p-3 border border-orange-500 bg-orange-50/50">
              <span className="text-[10px] font-bold uppercase tracking-widest text-orange-700 block">OCCUPIED SEATS</span>
              <span className="text-2xl font-black text-orange-600" style={{ fontFamily: "var(--font-heading)" }}>
                {occupiedSeats}
              </span>
            </div>
            <div className="p-3 border border-green-600 bg-green-50/50">
              <span className="text-[10px] font-bold uppercase tracking-widest text-green-700 block">FREE SEATS</span>
              <span className="text-2xl font-black text-green-700" style={{ fontFamily: "var(--font-heading)" }}>
                {freeSeats}
              </span>
            </div>
            <div className="p-3 border border-brown-900 bg-cream-100">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 block">OCCUPANCY RATE</span>
              <span className="text-2xl font-black text-brown-900" style={{ fontFamily: "var(--font-heading)" }}>
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

              return (
                <div
                  key={table.id}
                  className={`p-3 border-2 transition-all flex flex-col justify-between ${
                    isBillRequested
                      ? "border-amber-500 bg-amber-50/80"
                      : isOccupied
                      ? "border-orange-500 bg-orange-50/40"
                      : "border-brown-900 bg-surface"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-lg text-brown-900" style={{ fontFamily: "var(--font-heading)" }}>
                        {table.code}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">
                        👥 {table.capacity || 4}
                      </span>
                    </div>

                    <div className="my-1.5">
                      {isBillRequested ? (
                        <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-amber-500 text-white border border-amber-700 block text-center">
                          🧾 BILL REQ.
                        </span>
                      ) : isOccupied ? (
                        <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-orange-500 text-white border border-brown-900 block text-center">
                          OCCUPIED
                        </span>
                      ) : (
                        <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-green-600 text-white border border-green-800 block text-center">
                          FREE
                        </span>
                      )}
                    </div>
                  </div>

                  {isOccupied && (
                    <div className="mt-2 pt-1.5 border-t border-brown-900/30 text-[11px] font-bold flex justify-between">
                      <span className="text-gray-600">Total:</span>
                      <span className="text-orange-600">₹{runningTotal}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Bill Requests */}
        {billRequests.length > 0 && (
          <div className="mb-10 space-y-4">
            {billRequests.map((bill) => (
              <div
                key={bill.sessionId}
                className="flex items-center justify-between p-5 border-2 border-orange-500"
                style={{ background: "var(--color-cream-200)" }}
              >
                <div className="flex items-center gap-4">
                  <Receipt size={24} style={{ color: "var(--color-orange-500)" }} />
                  <div>
                    <p
                      className="font-black text-base uppercase tracking-widest"
                      style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}
                    >
                      Bill Requested — Table {bill.tableCode}
                    </p>
                    <p className="text-sm font-bold uppercase tracking-widest mt-1" style={{ color: "var(--color-text-secondary)" }}>
                      Total: ₹{bill.total}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const printWindow = window.open("", "_blank", "width=800,height=900");
                      if (printWindow) {
                        const htmlToPrint = bill.billFormats?.[paperFormat] || bill.billHTML;
                        printWindow.document.write(htmlToPrint);
                        printWindow.document.close();
                        setTimeout(() => printWindow.print(), 300);
                      }
                      setPrintedBills((prev) => new Set([...prev, bill.sessionId]));
                    }}
                    className="btn-secondary"
                  >
                    <Printer size={16} /> PRINT ({paperFormat.toUpperCase()})
                  </button>
                  {printedBills.has(bill.sessionId) && (
                    <button
                      onClick={() => handleCloseSession(bill.sessionId)}
                      disabled={closingSessions.has(bill.sessionId)}
                      className="btn-primary"
                    >
                      <Check size={16} />
                      {closingSessions.has(bill.sessionId) ? "CLOSING..." : "CLOSE"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pending Orders */}
        <section className="mb-10">
          <h2
            className="text-xl font-black mb-6 uppercase tracking-widest flex items-center gap-3"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}
          >
            <Clock size={24} style={{ color: "var(--color-orange-500)" }} />
            Pending Orders
            {pendingOrders.length > 0 && (
              <span className="text-sm border px-3 py-1 font-black bg-danger text-white border-brown-900">
                {pendingOrders.length}
              </span>
            )}
          </h2>

          {pendingOrders.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-brown-900">
              <p className="font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
                No pending orders.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {pendingOrders.map((order) => (
                <div key={order.id} className="card border-l-4" style={{ borderLeftColor: "var(--color-orange-500)" }}>
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-brown-900">
                    <div>
                      <span
                        className="font-black text-xl uppercase tracking-widest"
                        style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}
                      >
                        Table {order.session.table.code}
                      </span>
                      <span
                        className="text-sm font-bold uppercase tracking-widest ml-3"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        #{order.orderNumber}
                      </span>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <div className="space-y-2 mb-6">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm font-bold uppercase tracking-wider">
                        <span style={{ color: "var(--color-text-secondary)" }}>{item.menuItem.name}</span>
                        <span style={{ color: "var(--color-brown-900)" }}>X {item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
                      {new Date(order.createdAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })}
                    </span>
                    <button
                      onClick={() => handleAcceptOrder(order.id)}
                      disabled={acceptingOrders.has(order.id)}
                      className="btn-primary py-2 text-sm"
                    >
                      <Check size={16} />
                      {acceptingOrders.has(order.id) ? "ACCEPTING..." : "ACCEPT & PRINT KOT"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Active Orders — with status update buttons */}
        <section className="mb-10">
          <h2
            className="text-xl font-black mb-6 uppercase tracking-widest flex items-center gap-3"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}
          >
            <ClipboardList size={24} style={{ color: "var(--color-brown-900)" }} />
            Active Orders
          </h2>

          {activeOrders.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-brown-900">
              <p className="font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
                No active orders.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeOrders.map((order) => (
                <div key={order.id} className="card border-l-4" style={{ borderLeftColor: "var(--color-success)" }}>
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-brown-900">
                    <div>
                      <span
                        className="font-black text-xl uppercase tracking-widest"
                        style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}
                      >
                        Table {order.session.table.code}
                      </span>
                      <span
                        className="text-sm font-bold uppercase tracking-widest ml-3"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        #{order.orderNumber}
                      </span>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>

                  <div className="space-y-2 mb-4">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm font-bold uppercase tracking-wider">
                        <span style={{ color: "var(--color-text-secondary)" }}>{item.menuItem.name}</span>
                        <span style={{ color: "var(--color-brown-900)" }}>X {item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  {/* Status Update Buttons — captain updates order progress */}
                  <div className="flex gap-2 flex-wrap pt-3 border-t border-brown-900/20">
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
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase tracking-wider border transition-all"
                          style={{
                            borderColor: action.color,
                            color: action.color,
                            background: "var(--color-surface)",
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
          <div className="absolute inset-0" style={{ background: "rgba(61, 39, 16, 0.5)" }} />
          <div
            className="relative w-full max-w-md h-full flex flex-col border-l"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-brown-900)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "var(--color-brown-900)" }}>
              <h3 className="text-lg font-black uppercase tracking-widest" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
                Notifications
              </h3>
              <div className="flex gap-3">
                <button
                  onClick={() => setNotifications([])}
                  className="text-xs font-bold uppercase tracking-widest px-3 py-1 border border-brown-900"
                >
                  CLEAR
                </button>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="w-8 h-8 border border-brown-900 flex items-center justify-center hover:bg-brown-900 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {notifications.length === 0 ? (
                <p className="text-center py-8 font-bold uppercase tracking-widest text-sm" style={{ color: "var(--color-text-muted)" }}>
                  No notifications
                </p>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="p-4 border"
                    style={{
                      borderColor: notif.urgent ? "#F59E0B" : "var(--color-brown-900)",
                      background: notif.urgent ? "#FFFBEB" : "var(--color-surface)",
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{notif.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--color-brown-900)" }}>
                          {notif.message}
                        </p>
                        {notif.subtext && (
                          <p className="text-xs font-medium mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                            {notif.subtext}
                          </p>
                        )}
                        <p className="text-xs font-bold uppercase tracking-wider mt-2" style={{ color: "var(--color-text-muted)" }}>
                          {new Date(notif.timestamp).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })}
                        </p>
                      </div>
                      {notif.urgent && (
                        <span className="flex-shrink-0">
                          <PhoneCall size={16} style={{ color: "#F59E0B" }} />
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
