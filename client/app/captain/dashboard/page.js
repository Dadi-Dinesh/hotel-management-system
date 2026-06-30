"use client";

import { useEffect, useState, useCallback } from "react";
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

  // Bill preview states
  const [previewRequest, setPreviewRequest] = useState(null);
  const [previewSession, setPreviewSession] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

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

  const fetchBillRequests = useCallback(async () => {
    try {
      const res = await api.get("/sessions/bill-requests");
      setBillRequests(res.data.data);
    } catch (error) {
      console.error("Failed to fetch bill requests:", error);
    }
  }, []);

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
    fetchBillRequests();
  }, [fetchOrders, fetchBillRequests]);

  // Listen for real-time socket events
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
      fetchBillRequests();
      toast(`🧾 Bill requested for Table ${data.tableCode}`, { duration: 8000, icon: "💰" });
    });

    socket.on("bill-request-accepted", () => {
      fetchBillRequests();
    });

    socket.on("bill-request-printed", () => {
      fetchBillRequests();
      fetchOrders();
    });

    return () => {
      socket.off("new-order");
      socket.off("bill-requested");
      socket.off("bill-request-accepted");
      socket.off("bill-request-printed");
    };
  }, [socket, fetchOrders, fetchBillRequests]);

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

  const handleAcceptBill = async (requestId) => {
    try {
      await api.patch(`/sessions/bill-requests/${requestId}/accept`);
      toast.success("Bill request accepted! Customer notified.");
      fetchBillRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to accept bill request");
    }
  };

  const handlePrintBill = async (requestId) => {
    try {
      const res = await api.post(`/sessions/bill-requests/${requestId}/print`);
      const { billHTML } = res.data.data;

      // Close preview modal
      setPreviewRequest(null);
      setPreviewSession(null);

      // Open print window
      const printWindow = window.open("", "_blank", "width=350,height=600");
      if (printWindow) {
        printWindow.document.write(billHTML);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 300);
      }

      toast.success("Bill printed! Table released.");
      fetchBillRequests();
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to print bill");
    }
  };

  const handleViewBill = async (req) => {
    setPreviewRequest(req);
    setLoadingPreview(true);
    try {
      const res = await api.get(`/sessions/${req.sessionId}`);
      setPreviewSession(res.data.data);
    } catch (error) {
      toast.error("Failed to load bill preview.");
      console.error(error);
    } finally {
      setLoadingPreview(false);
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
              onClick={() => {
                fetchOrders();
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
        {/* Bill Requests */}
        {billRequests.length > 0 && (
          <div className="mb-10 space-y-4">
            <h2
              className="text-xl font-black uppercase tracking-widest flex items-center gap-3"
              style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}
            >
              <Receipt size={24} style={{ color: "var(--color-orange-500)" }} />
              Pending Bill Requests ({billRequests.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {billRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-5 border-2 border-brown-900 bg-white flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(92,61,26,1)]"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3 border-b border-dashed border-brown-900/25 pb-2">
                      <span className="font-black text-sm uppercase tracking-wider text-brown-900">
                        Table {req.tableCode}
                      </span>
                      <span
                        className="text-[10px] font-black uppercase border px-2 py-0.5"
                        style={{
                          background: req.status === "PENDING" ? "var(--color-cream-100)" : "rgba(232, 137, 28, 0.1)",
                          borderColor: "var(--color-brown-900)",
                          color: req.status === "PENDING" ? "var(--color-brown-900)" : "var(--color-orange-600)",
                        }}
                      >
                        {req.status}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide">
                      <p>Order Number: <span className="text-brown-900">#{req.orderNumber}</span></p>
                      {req.customerName && (
                        <p>Customer Name: <span className="text-brown-900">{req.customerName}</span></p>
                      )}
                      <p>
                        Request Time:{" "}
                        <span className="text-brown-900">
                          {new Date(req.requestTime).toLocaleTimeString("en-IN", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </span>
                      </p>
                      <p>
                        Current Order Total:{" "}
                        <span className="text-orange-600 text-sm font-black">
                          ₹{req.total}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2.5 mt-4 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleViewBill(req)}
                      className="btn-secondary flex-1 py-2 text-xs flex items-center justify-center gap-1"
                    >
                      <Receipt size={14} /> VIEW BILL
                    </button>

                    {req.status === "PENDING" ? (
                      <button
                        onClick={() => handleAcceptBill(req.id)}
                        className="btn-primary flex-1 py-2 text-xs flex items-center justify-center gap-1 bg-orange-500 text-white border-brown-900"
                        style={{ background: "var(--color-orange-500)" }}
                      >
                        <Check size={14} /> ACCEPT
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePrintBill(req.id)}
                        className="btn-primary flex-1 py-2 text-xs flex items-center justify-center gap-1"
                      >
                        <Printer size={14} /> PRINT BILL
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
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

      {/* Bill Preview Modal */}
      {previewRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div
            className="w-full max-w-md border-2 border-brown-900 rounded-none flex flex-col relative max-h-[90vh] shadow-[8px_8px_0px_0px_rgba(92,61,26,1)] overflow-hidden"
            style={{ background: "var(--color-surface)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "var(--color-brown-900)" }}>
              <div>
                <h3
                  className="text-lg font-black uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}
                >
                  Bill Preview
                </h3>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  Table {previewRequest.tableCode} · Order #{previewRequest.orderNumber}
                </p>
              </div>
              <button
                onClick={() => {
                  setPreviewRequest(null);
                  setPreviewSession(null);
                }}
                className="w-8 h-8 border border-brown-900 flex items-center justify-center hover:bg-brown-900 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Receipt Content */}
            <div className="flex-1 overflow-y-auto p-6 font-mono text-sm bg-white text-black">
              {loadingPreview ? (
                <div className="text-center py-12">
                  <p className="animate-pulse">Loading bill details...</p>
                </div>
              ) : previewSession ? (
                <div className="space-y-4">
                  <div className="text-center border-b border-dashed border-black pb-4">
                    <p className="text-lg font-black uppercase">Nookambika Dhaba</p>
                    <p className="text-xs uppercase mt-1">Table {previewRequest.tableCode}</p>
                    <p className="text-xs uppercase mt-0.5">Order #{previewRequest.orderNumber}</p>
                    <p className="text-xs mt-1">
                      Date: {new Date(previewSession.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs">
                      Time: {new Date().toLocaleTimeString()}
                    </p>
                  </div>

                  {/* Items list */}
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-black font-bold text-[10px] uppercase">
                        <th className="text-left py-1">Item</th>
                        <th className="text-center py-1">Qty</th>
                        <th className="text-right py-1">Amt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Gather flattened items */}
                      {(() => {
                        const items = [];
                        previewSession.orders.forEach((o) => {
                          if (o.status !== "CANCELLED") {
                            o.items.forEach((item) => {
                              const existing = items.find((bi) => bi.menuItemId === item.menuItem.id);
                              if (existing) {
                                existing.quantity += item.quantity;
                              } else {
                                items.push({
                                  menuItemId: item.menuItem.id,
                                  name: item.menuItem.name,
                                  quantity: item.quantity,
                                  price: item.price,
                                });
                              }
                            });
                          }
                        });
                        return items.map((item) => (
                          <tr key={item.menuItemId} className="border-b border-dashed border-gray-100">
                            <td className="py-2 text-left">{item.name}</td>
                            <td className="py-2 text-center">x{item.quantity}</td>
                            <td className="py-2 text-right">₹{item.price * item.quantity}</td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>

                  {/* Taxes, discounts, grand total */}
                  <div className="border-t border-dashed border-black pt-4 space-y-1.5 text-xs font-bold uppercase text-right">
                    <p>Subtotal: ₹{previewSession.runningTotal}</p>
                    <p>GST (0%): ₹0</p>
                    <p>Discount (0%): ₹0</p>
                    <div className="border-t border-black pt-3 flex justify-between items-center text-sm font-black mt-2">
                      <span>Grand Total:</span>
                      <span className="text-lg text-orange-600">₹{previewSession.runningTotal}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-red-500 font-bold">Failed to load preview details.</p>
              )}
            </div>

            {/* Footer buttons */}
            <div className="p-4 border-t bg-cream-100 flex gap-3" style={{ borderColor: "var(--color-brown-900)" }}>
              <button
                type="button"
                onClick={() => {
                  setPreviewRequest(null);
                  setPreviewSession(null);
                }}
                className="btn-secondary flex-1 py-3 text-xs border-brown-900"
              >
                Close Preview
              </button>
              {previewRequest.status === "PENDING" ? (
                <button
                  type="button"
                  onClick={() => handleAcceptBill(previewRequest.id)}
                  disabled={loadingPreview}
                  className="btn-primary flex-1 py-3 text-xs flex items-center justify-center gap-1 bg-orange-500 text-white border-brown-900"
                >
                  <Check size={14} /> Accept Request
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handlePrintBill(previewRequest.id)}
                  disabled={loadingPreview}
                  className="btn-primary flex-1 py-3 text-xs flex items-center justify-center gap-1 bg-brown-900 text-white border-brown-900"
                >
                  <Printer size={14} /> Print Bill
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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
