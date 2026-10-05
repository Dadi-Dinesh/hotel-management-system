"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Utensils, ClipboardList, ShieldCheck, UtensilsCrossed } from "lucide-react";
import api from "../../lib/api";
import LoadingScreen from "../../components/LoadingScreen";
import ReminderButtons from "../../components/ReminderButtons";
import Input from "../../components/ui/Input";
import { useSocket } from "../../components/SocketProvider";
import { DEMO_RESTAURANT } from "../../lib/branding";
import { emitResilient } from "../../lib/pwa/emitResilient";
import toast from "react-hot-toast";

export default function TableLandingPage() {
  const params = useParams();
  const router = useRouter();
  const tableCode = params.code?.toUpperCase();
  const { socket } = useSocket();

  const [table, setTable] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingFinished, setLoadingFinished] = useState(false);
  const [starting, setStarting] = useState(false);
  const [callingWaiter, setCallingWaiter] = useState(false);
  // Client-side-only personalization — never sent to the server (no seat
  // concept exists in the schema/API today). Only echoed back to this guest
  // on their own screen, e.g. the menu header subtitle.
  const [seatNumber, setSeatNumber] = useState("");

  useEffect(() => {
    fetchTable();
  }, [tableCode]);

  // Join table room when socket connects so session-closed can redirect
  useEffect(() => {
    if (!socket || !tableCode) return;

    const joinRoom = () => {
      console.log(`[Table ${tableCode}] Emitting join-table...`);
      socket.emit("join-table", tableCode);
    };

    if (socket.connected) {
      joinRoom();
    }
    socket.on("connect", joinRoom);

    const handleSessionClosed = () => {
      router.push(`/table/${tableCode}/thank-you`);
    };
    socket.on("session-closed", handleSessionClosed);

    return () => {
      socket.off("connect", joinRoom);
      socket.off("session-closed", handleSessionClosed);
    };
  }, [socket, tableCode, router]);

  const fetchTable = async () => {
    try {
      const res = await api.get(`/tables/${tableCode}`);
      setTable(res.data.data);
      if (res.data.data.activeSession) {
        setSession(res.data.data.activeSession);
        localStorage.setItem(`session-${tableCode}`, res.data.data.activeSession.id);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Table not found");
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async () => {
    setStarting(true);
    try {
      const res = await api.post("/sessions", { tableCode });
      setSession(res.data.data);
      localStorage.setItem(`session-${tableCode}`, res.data.data.id);
      if (seatNumber.trim()) {
        localStorage.setItem(`seat-${tableCode}`, seatNumber.trim());
      }
      toast.success("Welcome! Browse our menu and order.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to start session");
    } finally {
      setStarting(false);
    }
  };

  /**
   * Send a "call-waiter" socket event to the server.
   * The server immediately forwards it to all captains/admins rooms.
   */
  const handleCallWaiter = (message = "🔔 Waiter has been called! They'll be with you shortly.", extraPayload = null) => {
    setCallingWaiter(true);

    const socketPayload = extraPayload
      ? { tableCode, ...extraPayload }
      : { tableCode, message: `Table ${tableCode}: ${message.replace(/^[^\w]+/, "").trim()}` };

    emitResilient(socket, "call-waiter", socketPayload, {
      onlineMessage: message,
      offlineMessage: "You're offline — this will reach the waiter the moment you're back online.",
      icon: "🙋",
    });

    // Prevent rapid spamming — re-enable after 15 seconds
    setTimeout(() => setCallingWaiter(false), 15000);
  };

  return (
    <>
      {!loadingFinished && (
        <LoadingScreen
          isLoading={loading}
          onFinish={() => setLoadingFinished(true)}
        />
      )}

      {table ? (
        <div className="min-h-screen flex flex-col" style={{ background: "var(--ss-bg)" }}>
          <main className="flex-1 flex flex-col items-center justify-center px-5 py-10 sm:py-14">
            <div className="w-full max-w-sm flex flex-col items-center text-center">
              {/* Subtle plate illustration */}
              <div
                className="relative w-20 h-20 rounded-full flex items-center justify-center mb-5"
                style={{ background: "var(--ss-accent-tint)" }}
                aria-hidden="true"
              >
                <div
                  className="absolute inset-2 rounded-full"
                  style={{ border: "2px dashed rgba(232, 144, 23, 0.35)" }}
                />
                <UtensilsCrossed size={30} style={{ color: "var(--ss-accent-dark)" }} />
              </div>

              {/* Restaurant identity */}
              <div
                className="relative w-14 h-14 rounded-full overflow-hidden border-2 mb-4 -mt-2"
                style={{ borderColor: "var(--ss-surface)", boxShadow: "var(--ss-shadow-sm)" }}
              >
                <Image src={DEMO_RESTAURANT.logo} alt={`${DEMO_RESTAURANT.name} logo`} fill sizes="56px" className="object-cover" priority />
              </div>

              <h1 className="ss-h1 mb-2">Welcome to {DEMO_RESTAURANT.name}</h1>

              <p className="ss-body mb-1">
                You&apos;re seated at <span className="font-bold" style={{ color: "var(--ss-accent-dark)" }}>Table {table.number}</span>
              </p>
              <p className="ss-small mb-6">
                {session ? "You have an active session — continue ordering below." : "Enter your seat number to begin, or skip straight to the menu."}
              </p>

              {/* Trust message */}
              <div
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full ss-caption font-semibold mb-8"
                style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)", color: "var(--ss-secondary)" }}
              >
                <ShieldCheck size={13} style={{ color: "var(--ss-success)" }} />
                No app needed — order safely, directly from your phone.
              </div>

              {/* Action buttons */}
              <div className="w-full space-y-3">
                {session ? (
                  <>
                    <button
                      onClick={() => router.push(`/table/${tableCode}/menu`)}
                      className="ss-btn w-full py-4 ss-body font-semibold flex items-center justify-center gap-2"
                      data-variant="primary"
                      style={{ background: "var(--ss-accent)", color: "var(--ss-on-accent)", borderRadius: "var(--ss-radius-button)", boxShadow: "var(--ss-shadow-md)" }}
                    >
                      <Utensils size={18} />
                      Browse Menu
                    </button>
                    <button
                      onClick={() => router.push(`/table/${tableCode}/orders`)}
                      className="ss-btn w-full py-4 ss-body font-semibold flex items-center justify-center gap-2"
                      data-variant="secondary"
                      style={{ background: "var(--ss-surface)", color: "var(--ss-primary)", border: "1px solid var(--ss-border)", borderRadius: "var(--ss-radius-button)" }}
                    >
                      <ClipboardList size={18} />
                      View Orders
                    </button>

                    {/* Reminders — sends the same socket event instantly to captain dashboard */}
                    <div className="pt-2">
                      <ReminderButtons onSend={handleCallWaiter} sending={callingWaiter} tableCode={tableCode} />
                    </div>
                  </>
                ) : (
                  <>
                    <Input
                      id="seat-number"
                      label="Seat number (optional)"
                      inputMode="numeric"
                      placeholder="e.g. 3"
                      value={seatNumber}
                      onChange={(e) => setSeatNumber(e.target.value)}
                    />
                    <button
                      onClick={handleStartSession}
                      disabled={starting}
                      className="ss-btn w-full py-4 ss-body font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                      data-variant="primary"
                      style={{ background: "var(--ss-accent)", color: "var(--ss-on-accent)", borderRadius: "var(--ss-radius-button)", boxShadow: "var(--ss-shadow-md)" }}
                    >
                      <Utensils size={18} />
                      {starting ? "Starting..." : "Continue to Menu"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </main>
        </div>
      ) : !loading ? (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--ss-bg)" }}>
          <div
            className="text-center p-10 max-w-sm w-full rounded-[var(--ss-radius-card)]"
            style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)", boxShadow: "var(--ss-shadow-sm)" }}
          >
            <p className="text-6xl mb-6">😕</p>
            <h2 className="ss-h2 mb-3">Table Not Found</h2>
            <p className="ss-small">
              The table code &quot;{tableCode}&quot; doesn&apos;t exist. Please check and scan again.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
