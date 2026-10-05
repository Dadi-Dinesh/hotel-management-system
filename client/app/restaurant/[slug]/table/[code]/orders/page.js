"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Utensils, Receipt, RefreshCcw, Star, X, ClipboardList } from "lucide-react";
import api from "../../../../../lib/api";
import Navbar from "../../../../../components/Navbar";
import EmptyState from "../../../../../components/EmptyState";
import OrderTimeline from "../../../../../components/OrderTimeline";
import ReminderButtons from "../../../../../components/ReminderButtons";
import { useSocket } from "../../../../../components/SocketProvider";
import { emitResilient } from "../../../../../lib/pwa/emitResilient";
import { requestOrQueue } from "../../../../../lib/pwa/queuedRequest";
import toast from "react-hot-toast";

export default function TenantOrdersPage() {
  const params = useParams();
  const router = useRouter();
  const tableCode = params.code?.toUpperCase();
  const slug = params.slug;
  const { socket } = useSocket();
  const shouldReduceMotion = useReducedMotion();
  const sessionKey = `session-${slug}-${tableCode}`;

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requestingBill, setRequestingBill] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [ratings, setRatings] = useState({});
  const [feedbackComment, setFeedbackComment] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [callingWaiter, setCallingWaiter] = useState(false);

  const fetchSession = useCallback(async () => {
    const sessionId = localStorage.getItem(sessionKey);
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
  }, [sessionKey]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (!socket || !tableCode || !slug) return;
    const joinRoom = () => socket.emit("join-table", { tableCode, restaurantSlug: slug });
    if (socket.connected) joinRoom();
    socket.on("connect", joinRoom);

    socket.on("order-accepted", () => {
      toast.success("Your order has been accepted! 🎉");
      fetchSession();
    });
    socket.on("order-status-update", (data) => {
      const message = data.itemServed ? `'${data.itemServed.name}' has been served to your table! 🍽️` : data.statusLabel || `Order #${data.orderNumber}: ${data.status}`;
      toast.success(message, { duration: 5000 });
      fetchSession();
    });
    socket.on("item-served", (data) => {
      toast.success(`'${data.itemName || "Dish"}' served! 🍽️`, { duration: 4000 });
      fetchSession();
    });
    socket.on("session-closed", () => router.push(`/restaurant/${slug}/table/${tableCode}/thank-you`));

    return () => {
      socket.off("connect", joinRoom);
      socket.off("order-accepted");
      socket.off("order-status-update");
      socket.off("item-served");
      socket.off("session-closed");
    };
  }, [socket, tableCode, slug, fetchSession, router]);

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
      fetchSession();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to request bill");
    } finally {
      setRequestingBill(false);
    }
  };

  const uniqueItemsToRate = session?.orders
    ? Array.from(new Map(session.orders.filter((o) => o.status !== "CANCELLED").flatMap((o) => o.items).map((i) => [i.menuItem.id, i.menuItem])).values())
    : [];

  const handleRequestBillClick = () => {
    if (session?.feedbacks?.length > 0 || uniqueItemsToRate.length === 0) {
      handleRequestBill();
    } else {
      setShowFeedbackModal(true);
    }
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
    setShowFeedbackModal(false);
    handleRequestBill();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-cream-50)" }}>
        <div className="animate-pulse-soft text-center">
          <p className="text-4xl mb-2">📋</p>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Loading orders...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "var(--color-cream-50)" }}>
        <Navbar title="Orders" subtitle={`Table ${tableCode}`} backHref={`/restaurant/${slug}/table/${tableCode}/menu`} />
        <main className="flex-1 flex flex-col items-center justify-center px-6">
          <p className="text-5xl mb-4">📋</p>
          <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>No Active Session</h2>
          <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>Start ordering to see your orders here.</p>
          <button onClick={() => router.push(`/restaurant/${slug}/table/${tableCode}`)} className="btn-primary">Go Back</button>
        </main>
      </div>
    );
  }

  const orders = session.orders || [];
  const runningTotal = session.runningTotal || 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-cream-50)" }}>
      <Navbar
        title="Your Orders"
        subtitle={`Table ${tableCode}`}
        backHref={`/restaurant/${slug}/table/${tableCode}/menu`}
        rightContent={
          <button onClick={fetchSession} className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors" style={{ background: "var(--color-cream-100)", color: "var(--color-brown-800)" }}>
            <RefreshCcw size={16} />
          </button>
        }
      />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-4">
        {orders.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={30} style={{ color: "var(--color-text-muted)" }} />}
            title="No Orders Yet"
            description="Browse the menu and place your first order to see it tracked here."
            action={<button onClick={() => router.push(`/restaurant/${slug}/table/${tableCode}/menu`)} className="btn-primary"><Utensils size={16} />Browse Menu</button>}
          />
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.08 } } }}
            className="space-y-4"
          >
            {orders.map((order) => (
              <motion.div key={order.id} variants={{ hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 12 }, show: { opacity: 1, y: 0 } }} transition={{ duration: 0.35 }} className="card">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>Order #{order.orderNumber}</span>
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {new Date(order.createdAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })}
                  </span>
                </div>
                <div className="mb-4"><OrderTimeline status={order.status} /></div>
                <div className="space-y-2">
                  {order.items.map((item) => {
                    const isServed = item.status === "SERVED";
                    return (
                      <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-cream-200/50 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--color-cream-100)", color: "var(--color-brown-800)" }}>x{item.quantity}</span>
                          <span className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>{item.menuItem?.name || item.name}</span>
                          {isServed && <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">Served 🍽️</span>}
                        </div>
                        <span className="text-sm font-semibold" style={{ color: "var(--color-brown-900)" }}>₹{item.price * item.quantity}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>

      {orders.length > 0 && (
        <div className="sticky bottom-0 border-t p-4" style={{ background: "var(--color-surface-elevated)", borderColor: "var(--color-border)", boxShadow: "0 -4px 20px rgba(92, 61, 26, 0.06)" }}>
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium" style={{ color: "var(--color-text-secondary)" }}>Running Total</span>
              <span className="text-xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-orange-600)" }}>₹{runningTotal}</span>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button onClick={() => router.push(`/restaurant/${slug}/table/${tableCode}/menu`)} className="btn-secondary flex-1 py-3"><Utensils size={16} />Order More</button>
              {session.status !== "BILL_REQUESTED" ? (
                <button onClick={handleRequestBillClick} disabled={requestingBill || submittingFeedback} className="btn-primary flex-1 py-3">
                  <Receipt size={16} />{requestingBill || submittingFeedback ? "Processing..." : "Request Bill"}
                </button>
              ) : (
                <div className="flex-1 py-3 rounded-xl text-center text-sm font-semibold" style={{ background: "var(--color-cream-100)", color: "var(--color-orange-600)", border: "1.5px solid var(--color-orange-400)" }}>🧾 Bill Requested</div>
              )}
            </div>
            <div className="mt-2"><ReminderButtons onSend={handleCallWaiter} sending={callingWaiter} tableCode={tableCode} /></div>
          </div>
        </div>
      )}

      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "rgba(61, 39, 16, 0.4)" }} onClick={() => setShowFeedbackModal(false)} />
          <div className="relative w-full max-w-md max-h-[85vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-scale-in" style={{ background: "var(--color-cream-50)" }}>
            <div className="p-6 border-b" style={{ borderColor: "var(--color-border-light)" }}>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>Rate your food</h3>
                <button onClick={() => setShowFeedbackModal(false)} style={{ color: "var(--color-text-muted)" }}><X size={20} /></button>
              </div>
              <p className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>How did you like the items you ordered?</p>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-6">
                {uniqueItemsToRate.map((item) => (
                  <div key={item.id} className="flex flex-col gap-3">
                    <span className="font-bold text-sm uppercase tracking-widest" style={{ color: "var(--color-brown-900)" }}>{item.name}</span>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} onClick={() => setRatings((prev) => ({ ...prev, [item.id]: star }))} className="transition-transform hover:scale-110 focus:outline-none">
                          <Star size={32} fill={ratings[item.id] >= star ? "var(--color-orange-500)" : "transparent"} color={ratings[item.id] >= star ? "var(--color-orange-500)" : "var(--color-cream-300)"} strokeWidth={ratings[item.id] >= star ? 0 : 2} />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="flex flex-col gap-2">
                  <label className="font-bold text-xs uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
                    Anything you&apos;d like to tell us? (optional)
                  </label>
                  <textarea
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder="e.g. The food was great but service was slow..."
                    className="input resize-none"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex flex-col gap-3" style={{ borderColor: "var(--color-border-light)", background: "var(--color-surface)" }}>
              <button onClick={submitFeedbackAndRequestBill} disabled={submittingFeedback || Object.keys(ratings).length === 0} className="btn-primary w-full py-3">
                {submittingFeedback ? "Submitting..." : "Submit & Request Bill"}
              </button>
              <button onClick={() => { setShowFeedbackModal(false); handleRequestBill(); }} disabled={submittingFeedback} className="w-full py-3 text-sm font-bold uppercase tracking-widest transition-colors rounded-xl border-2" style={{ color: "var(--color-text-secondary)", borderColor: "var(--color-cream-200)", background: "transparent" }}>
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
