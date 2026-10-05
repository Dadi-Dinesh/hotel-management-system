"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Utensils, Receipt, RefreshCcw, Star, X, ClipboardList, CheckCircle2, Clock } from "lucide-react";
import api from "../../../lib/api";
import StickyHeader from "../../../components/customer/StickyHeader";
import EmptyState from "../../../components/EmptyState";
import OrderStatusCard from "../../../components/customer/OrderStatusCard";
import ReminderButtons from "../../../components/ReminderButtons";
import { useSocket } from "../../../components/SocketProvider";
import { emitResilient } from "../../../lib/pwa/emitResilient";
import { requestOrQueue } from "../../../lib/pwa/queuedRequest";
import { DEMO_RESTAURANT } from "../../../lib/branding";
import toast from "react-hot-toast";

export default function OrdersPage() {
  const params = useParams();
  const router = useRouter();
  const tableCode = params.code?.toUpperCase();
  const { socket } = useSocket();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requestingBill, setRequestingBill] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [billRequestedJustNow, setBillRequestedJustNow] = useState(false);
  const [ratings, setRatings] = useState({});
  const [feedbackComment, setFeedbackComment] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [callingWaiter, setCallingWaiter] = useState(false);
  const shouldReduceMotion = useReducedMotion();

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

  // ESC closes the bill request modal, matching the shared Modal component's behavior.
  useEffect(() => {
    if (!showBillModal) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") closeBillModal();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showBillModal]);

  // Listen for real-time order updates
  useEffect(() => {
    if (!socket || !tableCode) return;

    const joinRoom = () => {
      console.log(`[Orders Table ${tableCode}] Emitting join-table...`);
      socket.emit("join-table", tableCode);
    };

    if (socket.connected) {
      joinRoom();
    }
    socket.on("connect", joinRoom);

    socket.on("order-accepted", () => {
      toast.success("Your order has been accepted! 🎉");
      fetchSession();
    });

    socket.on("order-status-update", (data) => {
      // Use human-readable statusLabel from server if available
      const message = data.itemServed
        ? `'${data.itemServed.name}' has been served to your table! 🍽️`
        : data.statusLabel || `Order #${data.orderNumber}: ${data.status}`;
      toast.success(message, { duration: 5000 });
      fetchSession();
    });

    socket.on("item-served", (data) => {
      toast.success(`'${data.itemName || "Dish"}' served! 🍽️`, { duration: 4000 });
      fetchSession();
    });

    socket.on("session-closed", () => {
      router.push(`/table/${tableCode}/thank-you`);
    });

    return () => {
      socket.off("connect", joinRoom);
      socket.off("order-accepted");
      socket.off("order-status-update");
      socket.off("item-served");
      socket.off("session-closed");
    };
  }, [socket, tableCode, fetchSession, router]);

  /**
   * Call the waiter — sends socket event to captains room instantly.
   * Only enabled during an active session.
   */
  const handleCallWaiter = (message = "🔔 Waiter called! They'll be with you shortly.", extraPayload = null) => {
    setCallingWaiter(true);

    const socketPayload = extraPayload
      ? { tableCode, ...extraPayload }
      : { tableCode, message: `Table ${tableCode}: ${message.replace(/^[^\w]+/, "").trim()}` };

    emitResilient(socket, "call-waiter", socketPayload, {
      onlineMessage: message,
      offlineMessage: "You're offline — this will reach the waiter the moment you're back online.",
    });
    setTimeout(() => setCallingWaiter(false), 15000);
  };

  const handleRequestBill = async () => {
    setRequestingBill(true);
    try {
      const result = await requestOrQueue({
        type: "BILL_REQUEST",
        method: "patch",
        url: `/sessions/${session.id}/request-bill`,
        label: `Bill request — Table ${tableCode}`,
        offlineMessage: "You're offline — your bill request will be sent automatically once you're back online.",
      });
      if (result.queued) return;
      toast.success("Bill requested! The waiter will bring it shortly. 🧾");
      setBillRequestedJustNow(true);
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

  const hasRatableItems = session?.feedbacks?.length > 0 ? false : uniqueItemsToRate.length > 0;

  // Always confirm through one modal now — previously this skipped straight
  // to the request when there was nothing to rate, which meant no
  // confirmation at all in that case. Same underlying handlers either way.
  const handleRequestBillClick = () => {
    setShowBillModal(true);
  };

  const submitFeedbackAndRequestBill = async () => {
    const feedbackData = Object.entries(ratings).map(([menuItemId, rating], i) => ({
      menuItemId,
      rating,
      // The optional overall comment rides along on just the first entry —
      // one Feedback row per rated item, so duplicating it across all of
      // them would inflate word counts in the AI Copilot's keyword analysis.
      comment: i === 0 && feedbackComment.trim() ? feedbackComment.trim() : undefined,
    }));

    if (feedbackData.length > 0) {
      setSubmittingFeedback(true);
      try {
        const result = await requestOrQueue({
          type: "FEEDBACK",
          method: "post",
          url: `/sessions/${session.id}/feedback`,
          body: { ratings: feedbackData },
          label: `Feedback — Table ${tableCode}`,
          offlineMessage: "You're offline — your feedback will be sent automatically once you're back online.",
        });
        if (!result.queued) toast.success("Thanks for your feedback! 🌟");
      } catch (error) {
        console.error("Failed to submit feedback:", error);
      } finally {
        setSubmittingFeedback(false);
      }
    }

    await handleRequestBill();
    setShowBillModal(false);
  };

  const closeBillModal = () => {
    setShowBillModal(false);
    setRatings({});
    setFeedbackComment("");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ss-bg)" }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full ss-shimmer mx-auto mb-3" />
          <p className="ss-small">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "var(--ss-bg)" }}>
        <StickyHeader title="Orders" tableCode={tableCode} logoSrc={DEMO_RESTAURANT.logo} backHref={`/table/${tableCode}/menu`} />
        <main className="flex-1">
          <EmptyState
            icon={<ClipboardList size={28} style={{ color: "var(--ss-secondary)" }} />}
            title="No Active Session"
            description="Start ordering to see your orders here."
            action={
              <button
                onClick={() => router.push(`/table/${tableCode}`)}
                className="ss-btn px-5 py-2.5 ss-small font-semibold"
                data-variant="primary"
                style={{ background: "var(--ss-accent)", color: "var(--ss-on-accent)", borderRadius: "var(--ss-radius-button)" }}
              >
                Go Back
              </button>
            }
          />
        </main>
      </div>
    );
  }

  const orders = session.orders || [];
  const runningTotal = session.runningTotal || 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--ss-bg)" }}>
      <StickyHeader
        title="Your Orders"
        tableCode={tableCode}
        logoSrc={DEMO_RESTAURANT.logo}
        backHref={`/table/${tableCode}/menu`}
      />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-4">
        <div className="flex items-center justify-end mb-2">
          <button
            onClick={fetchSession}
            aria-label="Refresh orders"
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)", color: "var(--ss-primary)" }}
          >
            <RefreshCcw size={15} />
          </button>
        </div>

        {orders.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={28} style={{ color: "var(--ss-secondary)" }} />}
            title="No orders yet"
            description="Browse the menu and place your first order to see it tracked here."
            action={
              <button
                onClick={() => router.push(`/table/${tableCode}/menu`)}
                className="ss-btn inline-flex items-center gap-2 px-5 py-2.5 ss-small font-semibold"
                data-variant="primary"
                style={{ background: "var(--ss-accent)", color: "var(--ss-on-accent)", borderRadius: "var(--ss-radius-button)" }}
              >
                <Utensils size={16} />
                Browse Menu
              </button>
            }
          />
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.08 } } }}
            className="space-y-4"
          >
            {orders.map((order) => (
              <motion.div
                key={order.id}
                variants={{ hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 12 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <OrderStatusCard order={order} tableCode={tableCode}>
                  <div className="space-y-1.5 pt-3 border-t" style={{ borderColor: "var(--ss-border)" }}>
                    {order.items.map((item) => {
                      const isServed = item.status === "SERVED";
                      return (
                        <div key={item.id} className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="ss-caption font-bold px-1.5 py-0.5 rounded"
                              style={{ background: "var(--ss-bg)", color: "var(--ss-secondary)" }}
                            >
                              x{item.quantity}
                            </span>
                            <span className="ss-small font-medium" style={{ color: "var(--ss-primary)" }}>
                              {item.menuItem?.name || item.name}
                            </span>
                            {isServed && (
                              <span
                                className="ss-caption font-bold px-1.5 py-0.5 rounded-full"
                                style={{ background: "rgba(27,138,90,0.12)", color: "var(--ss-success)" }}
                              >
                                Served
                              </span>
                            )}
                          </div>
                          <span className="ss-small font-semibold" style={{ color: "var(--ss-primary)" }}>
                            ₹{item.price * item.quantity}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </OrderStatusCard>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>

      {/* Bottom bar */}
      {orders.length > 0 && (
        <div
          className="sticky bottom-0 border-t p-4"
          style={{ background: "var(--ss-surface)", borderColor: "var(--ss-border)", boxShadow: "0 -8px 24px -12px rgba(59,34,10,0.12)" }}
        >
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="ss-small font-semibold" style={{ color: "var(--ss-secondary)" }}>Running Total</span>
              <span className="text-xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--ss-accent-dark)" }}>
                ₹{runningTotal}
              </span>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => router.push(`/table/${tableCode}/menu`)}
                className="ss-btn flex-1 py-3 flex items-center justify-center gap-2 ss-small font-semibold"
                data-variant="secondary"
                style={{ background: "var(--ss-surface)", color: "var(--ss-primary)", border: "1px solid var(--ss-border)", borderRadius: "var(--ss-radius-button)" }}
              >
                <Utensils size={16} />
                Order More
              </button>
              {session.status !== "BILL_REQUESTED" ? (
                <button
                  onClick={handleRequestBillClick}
                  disabled={requestingBill || submittingFeedback}
                  className="ss-btn flex-1 py-3 flex items-center justify-center gap-2 ss-small font-semibold disabled:opacity-60"
                  data-variant="primary"
                  style={{ background: "var(--ss-accent)", color: "var(--ss-on-accent)", borderRadius: "var(--ss-radius-button)" }}
                >
                  <Receipt size={16} />
                  Request Bill
                </button>
              ) : (
                <motion.div
                  initial={billRequestedJustNow && !shouldReduceMotion ? { opacity: 0, scale: 0.95 } : false}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex-1 py-3 rounded-[var(--ss-radius-button)] text-center flex items-center justify-center gap-2 ss-small font-semibold"
                  style={{ background: "var(--ss-accent-tint)", color: "var(--ss-accent-dark)", border: "1px solid var(--ss-border)" }}
                >
                  <Clock size={15} className={shouldReduceMotion ? "" : "animate-pulse-soft"} />
                  Bill Requested — waiter on the way
                </motion.div>
              )}
            </div>

            <div className="mt-3">
              <ReminderButtons onSend={handleCallWaiter} sending={callingWaiter} tableCode={tableCode} />
            </div>
          </div>
        </div>
      )}

      {/* Bill Request / Feedback Modal — one consistent confirmation step */}
      <AnimatePresence>
        {showBillModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <div
              className="absolute inset-0"
              style={{ background: "rgba(59, 34, 10, 0.5)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
              onClick={closeBillModal}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="bill-modal-title"
              initial={shouldReduceMotion ? { opacity: 0 } : { y: "100%" }}
              animate={{ y: 0, opacity: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { y: "100%" }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              className="relative w-full sm:max-w-md max-h-[88vh] flex flex-col overflow-hidden rounded-t-[var(--ss-radius-modal)] sm:rounded-[var(--ss-radius-modal)]"
              style={{ background: "var(--ss-surface)", boxShadow: "var(--ss-shadow-lg)" }}
            >
              <div className="p-5 sm:p-6 border-b flex-shrink-0" style={{ borderColor: "var(--ss-border)" }}>
                <div className="flex justify-between items-center mb-1.5">
                  <h3 id="bill-modal-title" className="ss-h3" style={{ marginBottom: 0 }}>
                    {hasRatableItems ? "Rate your food" : "Request Bill"}
                  </h3>
                  <button onClick={closeBillModal} aria-label="Close" style={{ color: "var(--ss-secondary)" }}>
                    <X size={20} />
                  </button>
                </div>
                <p className="ss-small">
                  {hasRatableItems ? "How did you like the items you ordered? (optional)" : "The waiter will bring your bill shortly."}
                </p>
              </div>

              <div className="p-5 sm:p-6 overflow-y-auto flex-1">
                {hasRatableItems ? (
                  <div className="space-y-5">
                    {uniqueItemsToRate.map((item) => (
                      <div key={item.id} className="flex flex-col gap-2.5">
                        <span className="ss-small font-bold" style={{ color: "var(--ss-primary)" }}>{item.name}</span>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setRatings((prev) => ({ ...prev, [item.id]: star }))}
                              className="transition-transform hover:scale-110 focus:outline-none"
                              aria-label={`Rate ${item.name} ${star} star${star > 1 ? "s" : ""}`}
                            >
                              <Star
                                size={28}
                                fill={ratings[item.id] >= star ? "var(--ss-accent)" : "transparent"}
                                color={ratings[item.id] >= star ? "var(--ss-accent)" : "var(--ss-border)"}
                                strokeWidth={ratings[item.id] >= star ? 0 : 2}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="flex flex-col gap-2">
                      <label htmlFor="feedback-comment" className="ss-caption font-bold" style={{ color: "var(--ss-secondary)" }}>
                        Anything you&apos;d like to tell us? (optional)
                      </label>
                      <textarea
                        id="feedback-comment"
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        rows={2}
                        maxLength={500}
                        placeholder="e.g. The food was great but service was slow..."
                        className="ss-input ss-small resize-none w-full p-3"
                        style={{ background: "var(--ss-bg)", border: "1px solid var(--ss-border)", borderRadius: "var(--ss-radius-input)", color: "var(--ss-primary)" }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center py-4 gap-3">
                    <span className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "var(--ss-accent-tint)" }}>
                      <Receipt size={24} style={{ color: "var(--ss-accent-dark)" }} />
                    </span>
                    <p className="ss-small">
                      Total so far: <strong style={{ color: "var(--ss-primary)" }}>₹{runningTotal}</strong>
                    </p>
                  </div>
                )}
              </div>

              <div className="p-5 sm:p-6 border-t flex flex-col gap-2.5 flex-shrink-0" style={{ borderColor: "var(--ss-border)" }}>
                <button
                  onClick={submitFeedbackAndRequestBill}
                  disabled={submittingFeedback || requestingBill}
                  className="ss-btn w-full py-3.5 ss-small font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                  data-variant="primary"
                  style={{ background: "var(--ss-accent)", color: "var(--ss-on-accent)", borderRadius: "var(--ss-radius-button)" }}
                >
                  {submittingFeedback || requestingBill ? (
                    "Processing..."
                  ) : (
                    <>
                      <CheckCircle2 size={16} /> Confirm — Request Bill
                    </>
                  )}
                </button>
                {hasRatableItems && (
                  <button
                    onClick={async () => {
                      await handleRequestBill();
                      setShowBillModal(false);
                    }}
                    disabled={submittingFeedback || requestingBill}
                    className="w-full py-3 ss-caption font-bold"
                    style={{ color: "var(--ss-secondary)" }}
                  >
                    Skip Rating &amp; Request Bill
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
