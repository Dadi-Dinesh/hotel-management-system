"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  ChefHat,
  Truck,
  X,
  Printer,
  LogOut,
  RefreshCcw,
  Receipt,
  Clock,
} from "lucide-react";
import api from "../../lib/api";
import { getUser, clearAuth, isAuthenticated } from "../../lib/auth";
import { useSocket } from "../../components/SocketProvider";
import OrderStatusBadge from "../../components/OrderStatusBadge";
import Navbar from "../../components/Navbar";
import toast from "react-hot-toast";

export default function CaptainDashboard() {
  const router = useRouter();
  const { socket } = useSocket();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [billRequests, setBillRequests] = useState([]);

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

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (!socket) return;
    socket.emit("join-captain");

    socket.on("new-order", (data) => {
      const notif = {
        id: Date.now(),
        type: "new-order",
        message: `New order from Table ${data.tableCode}`,
        data,
        timestamp: new Date(),
      };
      setNotifications((prev) => [notif, ...prev]);
      setShowNotifications(true);
      toast.success(`🔔 New order from Table ${data.tableCode}!`, { duration: 6000 });
      fetchOrders();
    });

    socket.on("bill-requested", (data) => {
      setBillRequests((prev) => [...prev, data]);
      toast(`🧾 Bill requested for Table ${data.tableCode}`, { duration: 8000, icon: "💰" });
    });

    return () => {
      socket.off("new-order");
      socket.off("bill-requested");
    };
  }, [socket, fetchOrders]);

  const handleAcceptOrder = async (orderId) => {
    try {
      const res = await api.patch(`/orders/${orderId}/accept`);
      toast.success(`Order #${res.data.data.order.orderNumber} accepted!`);

      const { kitchen, waiter } = res.data.data.kot;
      const printWindow = window.open("", "_blank", "width=350,height=600");
      if (printWindow) {
        printWindow.document.write(`
          ${kitchen.html}
          <div style="page-break-after: always;"></div>
          ${waiter.html}
        `);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 300);
      }
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to accept order");
    }
  };

  const handleUpdateStatus = async (orderId, status) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      toast.success(`Order status updated to ${status}`);
      fetchOrders();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleCloseSession = async (sessionId) => {
    try {
      await api.patch(`/sessions/${sessionId}/close`);
      toast.success("Session closed");
      setBillRequests((prev) => prev.filter((b) => b.sessionId !== sessionId));
      fetchOrders();
    } catch (error) {
      toast.error("Failed to close session");
    }
  };

  const handleLogout = () => {
    clearAuth();
    router.push("/captain/login");
  };

  const pendingOrders = orders.filter((o) => o.status === "PENDING");
  const activeOrders = orders.filter((o) => ["ACCEPTED", "PREPARING"].includes(o.status));
  const completedOrders = orders.filter((o) => ["SERVED", "CANCELLED"].includes(o.status)).slice(0, 10);

  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ background: "var(--color-surface)" }}>
      <Navbar
        title="Captain Dashboard"
        subtitle={`Welcome, ${user.name}`}
        rightContent={
          <div className="flex items-center gap-3">
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
              onClick={fetchOrders}
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
                      const printWindow = window.open("", "_blank", "width=350,height=600");
                      if (printWindow) {
                        printWindow.document.write(bill.billHTML);
                        printWindow.document.close();
                        setTimeout(() => printWindow.print(), 300);
                      }
                    }}
                    className="btn-secondary"
                  >
                    <Printer size={16} /> PRINT
                  </button>
                  <button onClick={() => handleCloseSession(bill.sessionId)} className="btn-primary">
                    <Check size={16} /> CLOSE
                  </button>
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
                      <span className="font-black text-xl uppercase tracking-widest" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
                        Table {order.session.table.code}
                      </span>
                      <span className="text-sm font-bold uppercase tracking-widest ml-3" style={{ color: "var(--color-text-muted)" }}>
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
                    <button onClick={() => handleAcceptOrder(order.id)} className="btn-primary py-2 text-sm">
                      <Check size={16} /> ACCEPT & PRINT KOT
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Active Orders */}
        <section className="mb-10">
          <h2
            className="text-xl font-black mb-6 uppercase tracking-widest flex items-center gap-3"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}
          >
            <ChefHat size={24} style={{ color: "var(--color-brown-900)" }} />
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
                      <span className="font-black text-xl uppercase tracking-widest" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
                        Table {order.session.table.code}
                      </span>
                      <span className="text-sm font-bold uppercase tracking-widest ml-3" style={{ color: "var(--color-text-muted)" }}>
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
                  <div className="flex gap-3">
                    {order.status === "ACCEPTED" && (
                      <button onClick={() => handleUpdateStatus(order.id, "PREPARING")} className="btn-secondary flex-1 py-2 text-sm">
                        <ChefHat size={16} /> PREPARING
                      </button>
                    )}
                    {(order.status === "ACCEPTED" || order.status === "PREPARING") && (
                      <button onClick={() => handleUpdateStatus(order.id, "SERVED")} className="btn-primary flex-1 py-2 text-sm">
                        <Truck size={16} /> MARK SERVED
                      </button>
                    )}
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
                <button onClick={() => setNotifications([])} className="text-xs font-bold uppercase tracking-widest px-3 py-1 border border-brown-900">
                  CLEAR
                </button>
                <button onClick={() => setShowNotifications(false)} className="w-8 h-8 border border-brown-900 flex items-center justify-center hover:bg-brown-900 hover:text-white">
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
                  <div key={notif.id} className="p-4 border" style={{ borderColor: "var(--color-brown-900)" }}>
                    <p className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--color-brown-900)" }}>
                      {notif.message}
                    </p>
                    <p className="text-xs font-bold uppercase tracking-wider mt-2" style={{ color: "var(--color-text-muted)" }}>
                      {new Date(notif.timestamp).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })}
                    </p>
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
