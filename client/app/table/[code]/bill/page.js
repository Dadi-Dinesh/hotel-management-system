"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Receipt, RefreshCcw, Home, UtensilsCrossed, CheckCircle2 } from "lucide-react";
import api from "../../../lib/api";
import Navbar from "../../../components/Navbar";
import { useSocket } from "../../../components/SocketProvider";
import toast from "react-hot-toast";

export default function BillPage() {
  const params = useParams();
  const router = useRouter();
  const tableCode = params.code?.toUpperCase();
  const { socket } = useSocket();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requestStatus, setRequestStatus] = useState("sending"); // sending, success, error
  const [billStatus, setBillStatus] = useState("requested"); // requested, accepted, printed

  const fetchSession = useCallback(async () => {
    const sessionId = localStorage.getItem(`session-${tableCode}`);
    if (!sessionId) {
      setLoading(false);
      return;
    }

    try {
      const res = await api.get(`/sessions/${sessionId}`);
      const sessionData = res.data.data;
      setSession(sessionData);

      // Determine initial bill status based on database
      const requests = sessionData.billRequests || [];
      if (sessionData.status === "CLOSED") {
        setBillStatus("printed");
        localStorage.removeItem(`session-${tableCode}`);
      } else if (requests.some((r) => r.status === "ACCEPTED")) {
        setBillStatus("accepted");
      } else {
        setBillStatus("requested");
      }
    } catch (error) {
      console.error("Failed to fetch session:", error);
    } finally {
      setLoading(false);
    }
  }, [tableCode]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Request the bill automatically on load
  useEffect(() => {
    const requestBill = async () => {
      if (!session) return;

      // If the session status is ACTIVE, change it to BILL_REQUESTED
      if (session.status === "ACTIVE") {
        try {
          await api.patch(`/sessions/${session.id}/request-bill`);
          setRequestStatus("success");
          setBillStatus("requested");
          fetchSession();
        } catch (error) {
          console.error("Request bill failed:", error);
          setRequestStatus("error");
          toast.error("Failed to request bill. Please contact staff.");
        }
      } else {
        setRequestStatus("success");
      }
    };

    if (session) {
      requestBill();
    }
  }, [session, fetchSession]);

  // Socket updates
  useEffect(() => {
    if (!socket || !tableCode) return;

    socket.emit("join-table", tableCode);

    socket.on("bill-accepted", () => {
      setBillStatus("accepted");
      toast.success("Captain accepted your bill request! 🧾");
      fetchSession();
    });

    socket.on("session-closed", () => {
      setBillStatus("printed");
      localStorage.removeItem(`session-${tableCode}`);
      toast.success("Your bill has been printed and table released! 🙏");
      fetchSession();
    });

    return () => {
      socket.off("bill-accepted");
      socket.off("session-closed");
    };
  }, [socket, tableCode, fetchSession]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--color-cream-50)" }}
      >
        <div className="animate-pulse-soft text-center">
          <p className="text-4xl mb-2">🧾</p>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Loading bill details...
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "var(--color-cream-50)" }}>
        <Navbar title="Bill Summary" subtitle={`Table ${tableCode}`} backHref={`/table/${tableCode}`} />
        <main className="flex-1 flex flex-col items-center justify-center px-6">
          <p className="text-5xl mb-4">🧾</p>
          <h2
            className="text-xl font-bold mb-2"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}
          >
            No Active Bill
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
            Start ordering to view your bill summary here.
          </p>
          <button onClick={() => router.push(`/table/${tableCode}`)} className="btn-primary">
            Go Back
          </button>
        </main>
      </div>
    );
  }

  const orders = session.orders || [];
  const runningTotal = session.runningTotal || 0;

  // Flatten order items
  const billItems = [];
  orders.forEach((order) => {
    if (order.status !== "CANCELLED") {
      order.items.forEach((item) => {
        const existing = billItems.find((bi) => bi.menuItem.id === item.menuItem.id);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          billItems.push({
            menuItem: item.menuItem,
            quantity: item.quantity,
            price: item.price,
          });
        }
      });
    }
  });

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--color-cream-50)" }}
    >
      <Navbar
        title="Final Bill"
        subtitle={`Table ${tableCode}`}
        backHref={`/table/${tableCode}/orders`}
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

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-8 flex flex-col justify-between">
        {billStatus === "printed" ? (
          /* Confirmation Message when Printed */
          <div
            className="bg-white border-2 border-brown-900 p-8 shadow-[4px_4px_0px_0px_rgba(92,61,26,1)] text-center my-auto"
            style={{ background: "var(--color-surface)" }}
          >
            <div className="w-16 h-16 bg-green-100 border border-green-500 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 animate-pulse-soft">
              <CheckCircle2 size={36} />
            </div>
            <h2
              className="text-2xl font-black uppercase tracking-tight mb-4"
              style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}
            >
              Bill Printed!
            </h2>
            <p className="text-sm font-medium leading-relaxed mb-6" style={{ color: "var(--color-text-secondary)" }}>
              Thank you! Your bill has been generated. We hope to serve you again.
            </p>
            <div className="border-t border-dashed border-brown-900/30 pt-4 mb-4">
              <p className="text-xs uppercase font-bold text-gray-400">Total Paid/Due:</p>
              <p className="text-3xl font-black text-orange-600 mt-1">₹{runningTotal}</p>
            </div>
          </div>
        ) : (
          /* Live Receipt bill status dashboard */
          <div
            className="bg-white border-2 border-brown-900 p-6 shadow-[4px_4px_0px_0px_rgba(92,61,26,1)] relative overflow-hidden"
            style={{ background: "var(--color-surface)" }}
          >
            {/* Decorative receipt cuts at top */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-[radial-gradient(circle_at_bottom,_var(--color-brown-900)_2px,_transparent_3px)] bg-[length:8px_8px] bg-repeat-x"></div>

            {/* Header */}
            <div className="text-center mt-2 mb-6">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: "var(--color-orange-500)" }}
              >
                <UtensilsCrossed size={20} color="white" />
              </div>
              <h1
                className="text-xl font-black uppercase tracking-tight"
                style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}
              >
                Nookambika Dhaba
              </h1>
              <p className="text-xs uppercase tracking-widest mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                Table {tableCode} · Bill Summary
              </p>
            </div>

            {/* Stepper Status Indicator */}
            <div className="mb-6 space-y-3 p-3.5 border-2 border-brown-900 bg-cream-50 text-xs">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black border"
                  style={{
                    background: "var(--color-orange-500)",
                    color: "white",
                    borderColor: "var(--color-brown-900)",
                  }}
                >
                  ✓
                </div>
                <span className="font-bold text-brown-900">Bill Requested</span>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black border"
                  style={{
                    background: billStatus === "accepted" || billStatus === "printed" ? "var(--color-orange-500)" : "transparent",
                    color: billStatus === "accepted" || billStatus === "printed" ? "white" : "transparent",
                    borderColor: "var(--color-brown-900)",
                  }}
                >
                  {billStatus === "accepted" || billStatus === "printed" ? "✓" : ""}
                </div>
                <span
                  className="font-bold"
                  style={{
                    color: billStatus === "accepted" || billStatus === "printed" ? "var(--color-brown-900)" : "var(--color-text-muted)",
                  }}
                >
                  Accepted by Captain
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black border"
                  style={{
                    background: billStatus === "accepted" || billStatus === "printed" ? "var(--color-orange-500)" : "transparent",
                    color: billStatus === "accepted" || billStatus === "printed" ? "white" : "transparent",
                    borderColor: "var(--color-brown-900)",
                  }}
                >
                  {billStatus === "accepted" || billStatus === "printed" ? "✓" : ""}
                </div>
                <span
                  className="font-bold"
                  style={{
                    color: billStatus === "accepted" || billStatus === "printed" ? "var(--color-brown-900)" : "var(--color-text-muted)",
                  }}
                >
                  Bill Ready
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black border"
                  style={{
                    background: billStatus === "printed" ? "var(--color-orange-500)" : "transparent",
                    color: billStatus === "printed" ? "white" : "transparent",
                    borderColor: "var(--color-brown-900)",
                  }}
                >
                  {billStatus === "printed" ? "✓" : ""}
                </div>
                <span
                  className="font-bold"
                  style={{
                    color: billStatus === "printed" ? "var(--color-brown-900)" : "var(--color-text-muted)",
                  }}
                >
                  Bill Printed
                </span>
              </div>
            </div>

            {/* Items List */}
            <div className="space-y-4">
              <div
                className="flex justify-between text-xs font-bold uppercase tracking-wider border-b pb-2"
                style={{ borderColor: "var(--color-brown-900)" }}
              >
                <span>Item Description</span>
                <span>Total</span>
              </div>

              <div className="space-y-3 font-medium text-sm">
                {billItems.map((item) => (
                  <div key={item.menuItem.id} className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-4">
                      <span className="font-bold text-xs mr-2 text-orange-600">
                        x{item.quantity}
                      </span>
                      <span className="uppercase text-xs tracking-wide" style={{ color: "var(--color-brown-900)" }}>
                        {item.menuItem.name}
                      </span>
                      <p className="text-[10px] text-gray-400 font-bold">₹{item.price} each</p>
                    </div>
                    <span className="font-bold" style={{ color: "var(--color-brown-900)" }}>
                      ₹{item.price * item.quantity}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total Section */}
              <div
                className="border-t border-dashed pt-4 mt-6 space-y-2"
                style={{ borderColor: "var(--color-brown-900)" }}
              >
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
                  <span>Subtotal</span>
                  <span>₹{runningTotal}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
                  <span>GST (0%)</span>
                  <span>₹0</span>
                </div>
                <div
                  className="flex justify-between items-center pt-3 border-t-2"
                  style={{ borderColor: "var(--color-brown-900)" }}
                >
                  <span
                    className="font-black text-sm uppercase tracking-wider"
                    style={{ color: "var(--color-brown-900)" }}
                  >
                    Grand Total
                  </span>
                  <span
                    className="text-2xl font-black"
                    style={{ fontFamily: "var(--font-heading)", color: "var(--color-orange-600)" }}
                  >
                    ₹{runningTotal}
                  </span>
                </div>
              </div>
            </div>

            <div
              className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-8 pt-4 border-t border-dashed"
              style={{ borderColor: "rgba(92,61,26,0.3)" }}
            >
              Please wait while captain processes your request.
              <br />
              Thank you for dining with us! 🙏
            </div>
          </div>
        )}

        {/* Home Button */}
        <button
          onClick={() => router.push(`/table/${tableCode}`)}
          className="btn-secondary w-full py-4 mt-8 flex items-center justify-center gap-2 border-brown-900"
        >
          <Home size={16} />
          Go to Table Home
        </button>
      </main>
    </div>
  );
}
