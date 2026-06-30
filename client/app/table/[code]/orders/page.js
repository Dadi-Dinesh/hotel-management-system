"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Utensils, Receipt, RefreshCcw, Star, X } from "lucide-react";
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

  // Ratings & Feedback states
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratings, setRatings] = useState({}); // menuItemId -> rating (1-5)
  const [feedbacks, setFeedbacks] = useState({}); // menuItemId -> feedback text
  const [overallFeedback, setOverallFeedback] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

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

  const handleViewBillClick = () => {
    const sessionId = session.id;
    const alreadyReviewed = localStorage.getItem(`rated-session-${sessionId}`) || localStorage.getItem(`skipped-session-${sessionId}`);
    
    if (alreadyReviewed) {
      router.push(`/table/${tableCode}/bill`);
    } else {
      setShowRatingModal(true);
    }
  };

  const handleSkipRating = () => {
    localStorage.setItem(`skipped-session-${session.id}`, "true");
    setShowRatingModal(false);
    router.push(`/table/${tableCode}/bill`);
  };

  const handleSubmitRating = async (e) => {
    e.preventDefault();
    setSubmittingRating(true);

    try {
      const ratingsArray = Object.keys(ratings)
        .filter((itemId) => ratings[itemId] > 0)
        .map((itemId) => ({
          menuItemId: itemId,
          rating: ratings[itemId],
          feedback: feedbacks[itemId] || "",
        }));

      await api.post("/ratings", {
        sessionId: session.id,
        ratings: ratingsArray,
        overallFeedback: overallFeedback.trim(),
      });

      localStorage.setItem(`rated-session-${session.id}`, "true");
      toast.success("Feedback submitted! Thank you. ❤️");
      setShowRatingModal(false);
      router.push(`/table/${tableCode}/bill`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit feedback");
    } finally {
      setSubmittingRating(false);
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

  // Extract all unique menu items ordered in active orders
  const orderedItemsMap = {};
  orders.forEach((order) => {
    if (order.status !== "CANCELLED") {
      order.items.forEach((item) => {
        if (!orderedItemsMap[item.menuItem.id]) {
          orderedItemsMap[item.menuItem.id] = {
            id: item.menuItem.id,
            name: item.menuItem.name,
            image: item.menuItem.image,
          };
        }
      });
    }
  });
  const orderedItems = Object.values(orderedItemsMap);

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
              <button
                onClick={handleViewBillClick}
                className="btn-primary flex-1 py-3"
              >
                <Receipt size={16} />
                View Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating & Feedback Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
          <div
            className="w-full max-w-lg border-2 border-brown-900 rounded-none flex flex-col relative max-h-[90vh] shadow-[8px_8px_0px_0px_rgba(92,61,26,1)] overflow-hidden"
            style={{ background: "var(--color-surface)" }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-5 border-b"
              style={{ borderColor: "var(--color-brown-900)" }}
            >
              <div>
                <h3
                  className="text-lg font-black uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}
                >
                  Rate Your Meal
                </h3>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  Help us improve our service
                </p>
              </div>
              <button
                onClick={handleSkipRating}
                className="absolute top-4 right-4 flex items-center gap-1 text-xs font-bold uppercase border px-2.5 py-1 transition-colors"
                style={{
                  borderColor: "var(--color-brown-900)",
                  background: "var(--color-cream-100)",
                  color: "var(--color-brown-900)",
                }}
              >
                <span>Skip</span>
                <X size={14} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {orderedItems.map((item) => (
                <div
                  key={item.id}
                  className="border-b border-dashed pb-5 last:border-b-0 last:pb-0"
                  style={{ borderColor: "rgba(92, 61, 26, 0.2)" }}
                >
                  <div className="flex gap-4 items-start">
                    {/* Item Image or Placeholder */}
                    <div
                      className="w-16 h-16 flex-shrink-0 flex items-center justify-center text-2xl border"
                      style={{
                        borderColor: "var(--color-brown-900)",
                        background: "var(--color-cream-200)",
                      }}
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        "🍽️"
                      )}
                    </div>

                    {/* Rating logic */}
                    <div className="flex-1 min-w-0">
                      <h4
                        className="font-bold text-sm uppercase tracking-wide truncate"
                        style={{ color: "var(--color-brown-900)" }}
                      >
                        {item.name}
                      </h4>

                      {/* Star Rating Selector */}
                      <div className="flex items-center gap-1.5 mt-2">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const isSelected = (ratings[item.id] || 0) >= star;
                          return (
                            <button
                              key={star}
                              type="button"
                              onClick={() =>
                                setRatings((prev) => ({ ...prev, [item.id]: star }))
                              }
                              className="focus:outline-none transition-transform active:scale-90"
                              style={{
                                color: isSelected
                                  ? "var(--color-orange-500)"
                                  : "var(--color-cream-200)",
                              }}
                            >
                              <Star
                                size={26}
                                fill={isSelected ? "var(--color-orange-500)" : "transparent"}
                              />
                            </button>
                          );
                        })}
                      </div>

                      {/* Subjective Item Feedback */}
                      <textarea
                        value={feedbacks[item.id] || ""}
                        onChange={(e) =>
                          setFeedbacks((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        placeholder="Feedback on this item (optional)..."
                        className="w-full mt-3 p-2 text-sm border focus:outline-none placeholder-gray-400 font-medium"
                        style={{
                          borderColor: "var(--color-brown-900)",
                          background: "var(--color-cream-50)",
                          color: "var(--color-brown-900)",
                        }}
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* General Feedback */}
              <div className="pt-4 border-t-2" style={{ borderColor: "var(--color-brown-900)" }}>
                <label
                  className="block text-sm font-bold uppercase tracking-wider mb-2"
                  style={{ color: "var(--color-brown-900)" }}
                >
                  Overall Experience (optional)
                </label>
                <textarea
                  value={overallFeedback}
                  onChange={(e) => setOverallFeedback(e.target.value)}
                  placeholder="How was your experience overall?"
                  className="w-full p-3 text-sm border focus:outline-none placeholder-gray-400 font-medium"
                  style={{
                    borderColor: "var(--color-brown-900)",
                    background: "var(--color-cream-50)",
                    color: "var(--color-brown-900)",
                  }}
                  rows={3}
                />
              </div>
            </div>

            {/* Footer */}
            <div
              className="p-4 border-t bg-cream-100 flex gap-3"
              style={{
                borderColor: "var(--color-brown-900)",
                background: "var(--color-cream-100)",
              }}
            >
              <button
                type="button"
                onClick={handleSkipRating}
                className="btn-secondary flex-1 py-3 text-sm"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={handleSubmitRating}
                disabled={submittingRating}
                className="btn-primary flex-1 py-3 text-sm"
              >
                {submittingRating ? "Submitting..." : "Submit & View Bill"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
