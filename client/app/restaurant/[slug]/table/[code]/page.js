"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Utensils, ClipboardList } from "lucide-react";
import api from "../../../../lib/api";
import Navbar from "../../../../components/Navbar";
import LoadingScreen from "../../../../components/LoadingScreen";
import ReminderButtons from "../../../../components/ReminderButtons";
import { useSocket } from "../../../../components/SocketProvider";
import { emitResilient } from "../../../../lib/pwa/emitResilient";
import toast from "react-hot-toast";

/**
 * Slug-aware twin of /table/[code] — same UX, but resolves everything
 * through the restaurant's own tenant (via /api/restaurants/:slug/...)
 * instead of the demo-restaurant fallback the legacy route uses.
 */
export default function TenantTableLandingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tableCode = params.code?.toUpperCase();
  const slug = params.slug;
  const { socket } = useSocket();

  // The secure per-table QR token (Phase 7) — present in the URL when the
  // table is in "secure mode". Cached to localStorage so a page reload
  // (which drops the query param) doesn't lock the customer out mid-visit;
  // legacy/open-mode tables never have one and this is simply undefined.
  const [qrToken, setQrToken] = useState(null);

  const [restaurant, setRestaurant] = useState(null);
  const [table, setTable] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingFinished, setLoadingFinished] = useState(false);
  const [starting, setStarting] = useState(false);
  const [callingWaiter, setCallingWaiter] = useState(false);

  useEffect(() => {
    if (!slug || !tableCode) return;
    const urlToken = searchParams.get("token");
    const storageKey = `qr-token-${slug}-${tableCode}`;
    const resolvedToken = urlToken || localStorage.getItem(storageKey) || null;
    if (urlToken) localStorage.setItem(storageKey, urlToken);
    setQrToken(resolvedToken);
    fetchAll(resolvedToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, tableCode]);

  useEffect(() => {
    if (!socket || !tableCode || !slug) return;

    const joinRoom = () => {
      socket.emit("join-table", { tableCode, restaurantSlug: slug });
    };
    if (socket.connected) joinRoom();
    socket.on("connect", joinRoom);

    const handleSessionClosed = () => {
      router.push(`/restaurant/${slug}/table/${tableCode}/thank-you`);
    };
    socket.on("session-closed", handleSessionClosed);

    return () => {
      socket.off("connect", joinRoom);
      socket.off("session-closed", handleSessionClosed);
    };
  }, [socket, tableCode, slug, router]);

  const fetchAll = async (token) => {
    try {
      const tableUrl = `/restaurants/${slug}/tables/${tableCode}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
      const [restaurantRes, tableRes] = await Promise.all([
        api.get(`/restaurants/${slug}`),
        api.get(tableUrl),
      ]);
      setRestaurant(restaurantRes.data.data);
      setTable(tableRes.data.data);
      if (tableRes.data.data.activeSession) {
        setSession(tableRes.data.data.activeSession);
        localStorage.setItem(`session-${slug}-${tableCode}`, tableRes.data.data.activeSession.id);
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
      const res = await api.post(`/restaurants/${slug}/sessions`, { tableCode, token: qrToken || undefined });
      setSession(res.data.data);
      localStorage.setItem(`session-${slug}-${tableCode}`, res.data.data.id);
      toast.success("Welcome! Browse the menu and order.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to start session");
    } finally {
      setStarting(false);
    }
  };

  const handleCallWaiter = (message = "🔔 Waiter has been called! They'll be with you shortly.") => {
    setCallingWaiter(true);
    emitResilient(socket, "call-waiter", tableCode, {
      onlineMessage: message,
      offlineMessage: "You're offline — this will reach the waiter the moment you're back online.",
      icon: "🙋",
    });
    setTimeout(() => setCallingWaiter(false), 15000);
  };

  return (
    <>
      {!loadingFinished && <LoadingScreen isLoading={loading} onFinish={() => setLoadingFinished(true)} />}

      {table ? (
        <div className="min-h-screen flex flex-col" style={{ background: "var(--color-surface)" }}>
          <Navbar
            title={restaurant?.shortName || restaurant?.name}
            subtitle={`Table ${tableCode}`}
            logoSrc={restaurant?.logo}
          />

          <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
            <div
              className="w-32 h-32 flex items-center justify-center mb-8 border-4"
              style={{ background: "var(--color-cream-200)", borderColor: "var(--color-brown-900)" }}
            >
              <span className="text-5xl font-black" style={{ fontFamily: "var(--font-heading)", color: "var(--color-orange-500)" }}>
                {tableCode}
              </span>
            </div>

            <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter text-center" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
              Welcome to Table {table.number}
            </h2>
            {restaurant?.welcomeMessage && !session && (
              <p className="text-sm text-center max-w-xs mb-4 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                {restaurant.welcomeMessage}
              </p>
            )}
            <p className="text-sm font-bold uppercase tracking-widest mb-12 text-center max-w-xs" style={{ color: "var(--color-text-muted)" }}>
              {session ? "You have an active session. Continue ordering!" : "Tap below to start ordering"}
            </p>

            <div className="w-full max-w-sm space-y-4">
              {session ? (
                <>
                  <button
                    onClick={() => router.push(`/restaurant/${slug}/table/${tableCode}/menu`)}
                    className="btn-primary w-full py-4 text-base"
                  >
                    <Utensils size={18} /> BROWSE MENU
                  </button>
                  <button
                    onClick={() => router.push(`/restaurant/${slug}/table/${tableCode}/orders`)}
                    className="btn-secondary w-full py-4 text-base"
                  >
                    <ClipboardList size={18} /> VIEW ORDERS
                  </button>
                  <ReminderButtons onSend={handleCallWaiter} sending={callingWaiter} />
                </>
              ) : (
                <button onClick={handleStartSession} disabled={starting} className="btn-primary w-full py-5 text-lg">
                  <Utensils size={20} /> {starting ? "STARTING..." : "START ORDERING"}
                </button>
              )}
            </div>
          </main>
        </div>
      ) : !loading ? (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--color-surface)" }}>
          <div className="text-center border-2 p-10 max-w-sm w-full" style={{ borderColor: "var(--color-brown-900)" }}>
            <p className="text-6xl mb-6">😕</p>
            <h2 className="text-2xl font-black uppercase tracking-widest mb-4" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
              Table Not Found
            </h2>
            <p className="text-sm font-bold uppercase tracking-wider leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
              The table code &quot;{tableCode}&quot; doesn&apos;t exist for this restaurant. Please check and scan again.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
