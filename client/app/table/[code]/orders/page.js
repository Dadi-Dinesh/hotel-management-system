"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Utensils, Receipt, RefreshCcw, Star, X, BellRing } from "lucide-react";
import api from "../../../lib/api";
import Navbar from "../../../components/Navbar";
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
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [ratings, setRatings] = useState({});
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [callingWaiter, setCallingWaiter] = useState(false);

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

    // Join the table room so server can push updates directly to this customer
    // Room format must match server: table:<CODE>
    socket.emit("join-table", tableCode);

    socket.on("order-accepted", () => {
      toast.success("Your order has been accepted! 🎉");
      fetchSession();
    });

    socket.on("order-status-update", (data) => {
      // Use human-readable statusLabel from server if available
      const message = data.statusLabel || `Order #${data.orderNumber}: ${data.status}`;
      toast.success(message, { duration: 5000 });
      fetchSession();
    });

    socket.on("session-closed", () => {
      router.push(`/table/${tableCode}/thank-you`);
    });

    return () => {
      socket.off("order-accepted");
      socket.off("order-status-update");
      socket.off("session-closed");
    };
  }, [socket, tableCode, fetchSession, router]);

  /**
   * Call the waiter — sends socket event to captains room instantly.
   * Only enabled during an active session.
   */
  const handleCallWaiter = () => {
    if (!socket || !socket.connected) {
      toast.error("Not connected. Please refresh.");
      return;
    }
    setCallingWaiter(true);
    socket.emit("call-waiter", tableCode);
    toast.success("🔔 Waiter called! They'll be with you shortly.", { duration: 4000 });
    setTimeout(() => setCallingWaiter(false), 15000);
  };

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

  const uniqueItemsToRate = session?.orders
    ? Array.from(
        new Map(
          session.orders
            .filter((o) => o.status !== "CANCELLED")
            .flatMap((o) => o.items)
            .map((i) => [i.menuItem.id, i.menuItem])
        ).values()
      )
    : [];

  const handleRequestBillClick = () => {
    if (session?.feedbacks?.length > 0 || uniqueItemsToRate.length === 0) {
      handleRequestBill();
    } else {
      setShowFeedbackModal(true);
    }
  };

  const submitFeedbackAndRequestBill = async () => {
    const feedbackData = Object.entries(ratings).map(([menuItemId, rating]) => ({
      menuItemId,
      rating,
    }));

    if (feedbackData.length > 0) {
      setSubmittingFeedback(true);
      try {
        await api.post(`/sessions/${session.id}/feedback`, { ratings: feedbackData });
        toast.success("Thanks for your feedback! 🌟");
      } catch (error) {
        console.error("Failed to submit feedback:", error);
      } finally {
        setSubmittingFeedback(false);
      }
    }
    
    setShowFeedbackModal(false);
    handleRequestBill();
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
        <Navbar title="Orders" subtitle={`Table ${tableCode}`} backHref={`/table/${tableCode}/menu`} />
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
        backHref={`/table/${tableCode}/menu`}
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
                className="card"
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-sm font-bold"
                    style={{
                      fontFamily: "var(--font-heading)",
                      color: "var(--color-brown-900)",
                    }}
                  >
                    Order #{order.orderNumber}
                  </span>
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
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => router.push(`/table/${tableCode}/menu`)}
                className="btn-secondary flex-1 py-3"
              >
                <Utensils size={16} />
                Order More
              </button>
              {session.status !== "BILL_REQUESTED" ? (
                <button
                  onClick={handleRequestBillClick}
                  disabled={requestingBill || submittingFeedback}
                  className="btn-primary flex-1 py-3"
                >
                  <Receipt size={16} />
                  {requestingBill || submittingFeedback ? "Processing..." : "Request Bill"}
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
            {/* Call Waiter — also available from orders page */}
            <button
              onClick={handleCallWaiter}
              disabled={callingWaiter}
              className="w-full py-3 text-sm font-black uppercase tracking-widest border-2 flex items-center justify-center gap-2 transition-all mt-2"
              style={{
                borderColor: callingWaiter ? "var(--color-text-muted)" : "#F59E0B",
                color: callingWaiter ? "var(--color-text-muted)" : "#92400E",
                background: callingWaiter ? "var(--color-cream-100)" : "#FEF3C7",
              }}
            >
              <BellRing size={16} />
              {callingWaiter ? "WAITER CALLED ✓" : "CALL WAITER"}
            </button>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "rgba(61, 39, 16, 0.4)" }} onClick={() => setShowFeedbackModal(false)} />
          <div className="relative w-full max-w-md max-h-[85vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-scale-in" style={{ background: "var(--color-cream-50)" }}>
            <div className="p-6 border-b" style={{ borderColor: "var(--color-border-light)" }}>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>Rate your food</h3>
                <button onClick={() => setShowFeedbackModal(false)} style={{ color: "var(--color-text-muted)" }}>
                  <X size={20} />
                </button>
              </div>
              <p className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>How did you like the items you ordered?</p>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-6">
                {uniqueItemsToRate.map(item => (
                  <div key={item.id} className="flex flex-col gap-3">
                    <span className="font-bold text-sm uppercase tracking-widest" style={{ color: "var(--color-brown-900)" }}>{item.name}</span>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          onClick={() => setRatings(prev => ({ ...prev, [item.id]: star }))}
                          className="transition-transform hover:scale-110 focus:outline-none"
                        >
                          <Star 
                            size={32} 
                            fill={ratings[item.id] >= star ? "var(--color-orange-500)" : "transparent"} 
                            color={ratings[item.id] >= star ? "var(--color-orange-500)" : "var(--color-cream-300)"} 
                            strokeWidth={ratings[item.id] >= star ? 0 : 2}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t flex flex-col gap-3" style={{ borderColor: "var(--color-border-light)", background: "var(--color-surface)" }}>
              <button 
                onClick={submitFeedbackAndRequestBill}
                disabled={submittingFeedback || Object.keys(ratings).length === 0}
                className="btn-primary w-full py-3"
              >
                {submittingFeedback ? "Submitting..." : "Submit & Request Bill"}
              </button>
              <button 
                onClick={() => {
                  setShowFeedbackModal(false);
                  handleRequestBill();
                }}
                disabled={submittingFeedback}
                className="w-full py-3 text-sm font-bold uppercase tracking-widest transition-colors rounded-xl border-2"
                style={{ 
                  color: "var(--color-text-secondary)",
                  borderColor: "var(--color-cream-200)",
                  background: "transparent"
                }}
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
