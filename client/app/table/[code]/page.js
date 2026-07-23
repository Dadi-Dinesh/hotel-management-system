"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { UtensilsCrossed, Utensils, ClipboardList, BellRing } from "lucide-react";
import api from "../../lib/api";
import Navbar from "../../components/Navbar";
import LoadingScreen from "../../components/LoadingScreen";
import { useSocket } from "../../components/SocketProvider";
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

  useEffect(() => {
    fetchTable();
  }, [tableCode]);

  // Join table room when socket connects so session-closed can redirect
  useEffect(() => {
    if (!socket || !tableCode) return;
    socket.emit("join-table", tableCode);

    const handleSessionClosed = () => {
      router.push(`/table/${tableCode}/thank-you`);
    };
    socket.on("session-closed", handleSessionClosed);

    return () => {
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
  const handleCallWaiter = () => {
    if (!socket || !socket.connected) {
      toast.error("Not connected. Please refresh and try again.");
      return;
    }

    setCallingWaiter(true);

    // Emit the event — server will broadcast to captains room
    socket.emit("call-waiter", tableCode);

    toast.success("🔔 Waiter has been called! They'll be with you shortly.", {
      duration: 4000,
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
        <div
          className="min-h-screen flex flex-col"
          style={{ background: "var(--color-surface)" }}
        >
          <Navbar title="Nookambika Dhaba" subtitle={`Table ${tableCode}`} />

          <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
            <div
              className="w-32 h-32 flex items-center justify-center mb-8 border-4"
              style={{
                background: "var(--color-cream-200)",
                borderColor: "var(--color-brown-900)",
              }}
            >
              <span
                className="text-5xl font-black"
                style={{
                  fontFamily: "var(--font-heading)",
                  color: "var(--color-orange-500)",
                }}
              >
                {tableCode}
              </span>
            </div>

            <h2
              className="text-3xl font-black mb-4 uppercase tracking-tighter text-center"
              style={{
                fontFamily: "var(--font-heading)",
                color: "var(--color-brown-900)",
              }}
            >
              Welcome to Table {table.number}
            </h2>
            <p
              className="text-sm font-bold uppercase tracking-widest mb-12 text-center max-w-xs"
              style={{ color: "var(--color-text-muted)" }}
            >
              {session
                ? "You have an active session. Continue ordering!"
                : "Tap below to start ordering"}
            </p>

            {/* Action buttons */}
            <div className="w-full max-w-sm space-y-4">
              {session ? (
                <>
                  <button
                    onClick={() => router.push(`/table/${tableCode}/menu`)}
                    className="btn-primary w-full py-4 text-base"
                  >
                    <Utensils size={18} />
                    BROWSE MENU
                  </button>
                  <button
                    onClick={() => router.push(`/table/${tableCode}/orders`)}
                    className="btn-secondary w-full py-4 text-base"
                  >
                    <ClipboardList size={18} />
                    VIEW ORDERS
                  </button>

                  {/* Call Waiter — sends socket event instantly to captain dashboard */}
                  <button
                    onClick={handleCallWaiter}
                    disabled={callingWaiter}
                    className="w-full py-4 text-base font-black uppercase tracking-widest border-2 flex items-center justify-center gap-2 transition-all"
                    style={{
                      borderColor: callingWaiter ? "var(--color-text-muted)" : "#F59E0B",
                      color: callingWaiter ? "var(--color-text-muted)" : "#92400E",
                      background: callingWaiter ? "var(--color-cream-100)" : "#FEF3C7",
                    }}
                  >
                    <BellRing size={18} />
                    {callingWaiter ? "WAITER CALLED ✓" : "CALL WAITER"}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleStartSession}
                  disabled={starting}
                  className="btn-primary w-full py-5 text-lg"
                >
                  <Utensils size={20} />
                  {starting ? "STARTING..." : "START ORDERING"}
                </button>
              )}
            </div>
          </main>
        </div>
      ) : !loading ? (
        <div
          className="min-h-screen flex items-center justify-center p-6"
          style={{ background: "var(--color-surface)" }}
        >
          <div className="text-center border-2 p-10 max-w-sm w-full" style={{ borderColor: "var(--color-brown-900)" }}>
            <p className="text-6xl mb-6">😕</p>
            <h2
              className="text-2xl font-black uppercase tracking-widest mb-4"
              style={{
                fontFamily: "var(--font-heading)",
                color: "var(--color-brown-900)",
              }}
            >
              Table Not Found
            </h2>
            <p
              className="text-sm font-bold uppercase tracking-wider leading-relaxed"
              style={{ color: "var(--color-text-muted)" }}
            >
              The table code &quot;{tableCode}&quot; doesn&apos;t exist. Please check and scan again.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
