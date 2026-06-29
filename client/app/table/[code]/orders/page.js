"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Utensils, Receipt, RefreshCcw } from "lucide-react";
import api from "../../../lib/api";
import Navbar from "../../../components/Navbar";
import OrderStatusBadge from "../../../components/OrderStatusBadge";
import { useSocket } from "../../../components/SocketProvider";
import toast from "react-hot-toast";

export default function OrdersPage() {
  const params = useParams();
  const router = useRouter();
  const tableCode = params.code?.toUpperCase();
  const { socket } = useSocket();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requestingBill, setRequestingBill] = useState(false);

  const fetchSession = useCallback(async () => {
    const sessionId = localStorage.getItem(`session-${tableCode}`);
    if (!sessionId) {
      setLoading(false);
      return;
    }

    try {
      const res = await api.get(`/sessions/${sessionId}`);
      setSession(res.data.data);
    } catch (error) {
      console.error("Failed to fetch session:", error);
    } finally {
      setLoading(false);
    }
  }, [tableCode]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Listen for real-time order updates
  useEffect(() => {
    if (!socket || !tableCode) return;

    socket.emit("join-table", tableCode);

    socket.on("order-accepted", () => {
      toast.success("Your order has been accepted! 🎉");
      fetchSession();
    });

    socket.on("order-status-update", (data) => {
      toast.success(`Order #${data.orderNumber}: ${data.status}`);
      fetchSession();
    });

    socket.on("session-closed", () => {
      toast("Session closed. Thank you for dining with us! 🙏");
      localStorage.removeItem(`session-${tableCode}`);
      router.push(`/table/${tableCode}`);
    });

    return () => {
      socket.off("order-accepted");
      socket.off("order-status-update");
      socket.off("session-closed");
    };
  }, [socket, tableCode, fetchSession, router]);

  const handleRequestBill = async () => {
    setRequestingBill(true);
    try {
      await api.patch(`/sessions/${session.id}/request-bill`);
      toast.success("Bill requested! The waiter will bring it shortly. 🧾");
      fetchSession();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to request bill");
    } finally {
      setRequestingBill(false);
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--color-cream-50)" }}
      >
        <div className="animate-pulse-soft text-center">
          <p className="text-4xl mb-2">📋</p>
          <p
            className="text-sm"
            style={{ color: "var(--color-text-muted)" }}
          >
            Loading orders...
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "var(--color-cream-50)" }}>
        <Navbar title="Orders" subtitle={`Table ${tableCode}`} backHref={`/table/${tableCode}`} />
        <main className="flex-1 flex flex-col items-center justify-center px-6">
          <p className="text-5xl mb-4">📋</p>
          <h2
            className="text-xl font-bold mb-2"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}
          >
            No Active Session
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
            Start ordering to see your orders here.
          </p>
          <button
            onClick={() => router.push(`/table/${tableCode}`)}
            className="btn-primary"
          >
            Go Back
          </button>
        </main>
      </div>
    );
  }

  const orders = session.orders || [];
  const runningTotal = session.runningTotal || 0;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--color-cream-50)" }}
    >
      <Navbar
        title="Your Orders"
        subtitle={`Table ${tableCode}`}
        backHref={`/table/${tableCode}`}
        rightContent={
          <button
            onClick={fetchSession}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
            style={{
              background: "var(--color-cream-100)",
              color: "var(--color-brown-800)",
            }}
          >
            <RefreshCcw size={16} />
          </button>
        }
      />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-4">
        {orders.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">🍽️</p>
            <p
              className="font-medium mb-4"
              style={{ color: "var(--color-text-muted)" }}
            >
              No orders yet
            </p>
            <button
              onClick={() => router.push(`/table/${tableCode}/menu`)}
              className="btn-primary"
            >
              <Utensils size={16} />
              Browse Menu
            </button>
          </div>
        ) : (
          <div className="space-y-4 stagger-children">
            {orders.map((order) => (
              <div
                key={order.id}
                className="card animate-fade-in"
                style={{ opacity: 0 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-bold"
                      style={{
                        fontFamily: "var(--font-heading)",
                        color: "var(--color-brown-900)",
                      }}
                    >
                      Order #{order.orderNumber}
                    </span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <span
                    className="text-xs"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {new Date(order.createdAt).toLocaleTimeString("en-IN", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </span>
                </div>

                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-1"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-semibold px-1.5 py-0.5 rounded"
                          style={{
                            background: "var(--color-cream-100)",
                            color: "var(--color-brown-800)",
                          }}
                        >
                          x{item.quantity}
                        </span>
                        <span
                          className="text-sm"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          {item.menuItem.name}
                        </span>
                      </div>
                      <span
                        className="text-sm font-medium"
                        style={{ color: "var(--color-brown-900)" }}
                      >
                        ₹{item.price * item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Bottom bar */}
      {orders.length > 0 && (
        <div
          className="sticky bottom-0 border-t p-4"
          style={{
            background: "var(--color-surface-elevated)",
            borderColor: "var(--color-border)",
            boxShadow: "0 -4px 20px rgba(92, 61, 26, 0.06)",
          }}
        >
          <div className="max-w-5xl mx-auto">
            {/* Total */}
            <div className="flex items-center justify-between mb-3">
              <span
                className="font-medium"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Running Total
              </span>
              <span
                className="text-xl font-bold"
                style={{
                  fontFamily: "var(--font-heading)",
                  color: "var(--color-orange-600)",
                }}
              >
                ₹{runningTotal}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => router.push(`/table/${tableCode}/menu`)}
                className="btn-secondary flex-1 py-3"
              >
                <Utensils size={16} />
                Order More
              </button>
              {session.status !== "BILL_REQUESTED" ? (
                <button
                  onClick={handleRequestBill}
                  disabled={requestingBill}
                  className="btn-primary flex-1 py-3"
                >
                  <Receipt size={16} />
                  {requestingBill ? "Requesting..." : "Request Bill"}
                </button>
              ) : (
                <div
                  className="flex-1 py-3 rounded-xl text-center text-sm font-semibold"
                  style={{
                    background: "var(--color-cream-100)",
                    color: "var(--color-orange-600)",
                    border: "1.5px solid var(--color-orange-400)",
                  }}
                >
                  🧾 Bill Requested
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
