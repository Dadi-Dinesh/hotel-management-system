"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Users,
  IndianRupee,
  Star,
  ShoppingBag,
  CheckCircle2,
  Clock,
  ChefHat,
  TrendingUp,
} from "lucide-react";
import api from "../../lib/api";
import { getUser, isAuthenticated, getEffectiveRestaurantId } from "../../lib/auth";
import { useSocket } from "../../components/SocketProvider";
import DashboardHeader from "../../components/admin/DashboardHeader";
import { useRestaurant } from "../../components/RestaurantContext";
import StatCard from "../../components/admin/StatCard";
import { StatCardSkeleton, ChartSkeleton } from "../../components/admin/AdminSkeletons";
import RevenueChart from "../../components/admin/RevenueChart";
import Heatmap from "../../components/admin/Heatmap";
import ItemPerformanceCard from "../../components/admin/ItemPerformanceCard";
import InsightCard from "../../components/admin/InsightCard";
import QuickActionPanel from "../../components/admin/QuickActionPanel";
import toast from "react-hot-toast";

// Lazy-loaded — the AI Copilot panel does its own independent data fetch
// (GET /admin/insights/overview) and isn't needed for first paint, so it's
// kept out of the dashboard's main bundle.
const AICopilotPanel = dynamic(() => import("../../components/admin/copilot/AICopilotPanel"), {
  ssr: false,
  loading: () => (
    <section className="mb-8">
      <div className="h-5 w-48 rounded-full ss-shimmer mb-4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 rounded-[var(--ss-radius-card)] ss-shimmer" />
        ))}
      </div>
    </section>
  ),
});

export default function AdminDashboard() {
  const router = useRouter();
  const { socket } = useSocket();
  const { restaurant: activeRestaurant, isPlatformOwner } = useRestaurant();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [liveOrders, setLiveOrders] = useState([]);
  const [todaySessions, setTodaySessions] = useState([]);
  const [avgRating, setAvgRating] = useState(null);
  const [loading, setLoading] = useState(true);

  const [revenuePeriod, setRevenuePeriod] = useState("week");
  const [revenueSeries, setRevenueSeries] = useState([]);
  const [revenueLoading, setRevenueLoading] = useState(true);

  const [heatmapData, setHeatmapData] = useState({ days: [], cells: [], maxCount: 0 });
  const [heatmapLoading, setHeatmapLoading] = useState(true);

  const [sellers, setSellers] = useState({ bestSellers: [], worstSellers: [] });
  const [sellersLoading, setSellersLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/admin/login");
      return;
    }
    const u = getUser();
    if (u?.role !== "ADMIN") {
      router.push("/admin/login");
      return;
    }
    setUser(u);
  }, [router]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("/admin/stats");
      setStats(res.data.data);
    } catch (error) {
      toast.error("Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLiveOrders = useCallback(async () => {
    try {
      const res = await api.get("/orders");
      setLiveOrders(res.data.data || []);
    } catch (error) {
      console.error("Failed to load live orders:", error?.message);
    }
  }, []);

  const fetchTodaySessions = useCallback(async () => {
    try {
      const res = await api.get("/admin/orders?period=today");
      setTodaySessions(res.data.data?.orders || []);
    } catch (error) {
      console.error("Failed to load today's orders:", error?.message);
    }
  }, []);

  const fetchAvgRating = useCallback(async () => {
    try {
      const res = await api.get("/feedbacks");
      const list = res.data.data || [];
      if (list.length > 0) {
        setAvgRating(list.reduce((sum, f) => sum + f.rating, 0) / list.length);
      } else {
        setAvgRating(null);
      }
    } catch (error) {
      console.error("Failed to load feedback:", error?.message);
    }
  }, []);

  const fetchRevenueTrend = useCallback(async (period) => {
    setRevenueLoading(true);
    try {
      const res = await api.get(`/admin/analytics/revenue-trend?period=${period}`);
      setRevenueSeries(res.data.data?.series || []);
    } catch (error) {
      console.error("Failed to load revenue trend:", error?.message);
    } finally {
      setRevenueLoading(false);
    }
  }, []);

  const fetchHeatmap = useCallback(async () => {
    setHeatmapLoading(true);
    try {
      const res = await api.get("/admin/analytics/peak-hours");
      setHeatmapData(res.data.data);
    } catch (error) {
      console.error("Failed to load peak hours:", error?.message);
    } finally {
      setHeatmapLoading(false);
    }
  }, []);

  const fetchSellers = useCallback(async () => {
    setSellersLoading(true);
    try {
      const res = await api.get("/admin/analytics/sellers?limit=6");
      setSellers(res.data.data);
    } catch (error) {
      console.error("Failed to load sellers:", error?.message);
    } finally {
      setSellersLoading(false);
    }
  }, []);

  const refreshAll = useCallback(() => {
    fetchStats();
    fetchLiveOrders();
    fetchTodaySessions();
    fetchAvgRating();
    fetchHeatmap();
    fetchSellers();
  }, [fetchStats, fetchLiveOrders, fetchTodaySessions, fetchAvgRating, fetchHeatmap, fetchSellers]);

  useEffect(() => {
    if (!user) return;
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchRevenueTrend(revenuePeriod);
  }, [user, revenuePeriod, fetchRevenueTrend]);

  // ─────────────────────────────────────────
  // REAL-TIME SOCKET LISTENERS (all existing events — none added)
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const joinRoom = () => {
      console.log("[Admin Dashboard] Emitting join-admin to join room...");
      socket.emit("join-admin", { restaurantId: getEffectiveRestaurantId() });
    };

    if (socket.connected) {
      joinRoom();
    }

    socket.on("connect", joinRoom);

    const handleNewOrder = (data) => {
      toast.success(`📦 New order from Table ${data.tableCode}`, { duration: 5000, id: `admin-order-${data.orderId}` });
      refreshAll();
    };

    const handleWaiterCall = (data) => {
      toast(`🔔 Table ${data.tableCode} is calling for assistance!`, {
        duration: 8000,
        icon: "📣",
        style: { background: "#FEF3C7", border: "1px solid #F59E0B" },
        id: `admin-waiter-${data.tableCode}`,
      });
    };

    const handleSessionClosed = () => refreshAll();
    const handleTableUpdated = () => refreshAll();
    const handleKitchenUpdated = () => fetchLiveOrders();

    const handleBillRequested = (data) => {
      toast(`🧾 Bill requested at Table ${data.tableCode} — ₹${data.total}`, {
        duration: 6000,
        icon: "💰",
        id: `admin-bill-${data.sessionId}`,
      });
      refreshAll();
    };

    socket.on("new-order", handleNewOrder);
    socket.on("waiter-call", handleWaiterCall);
    socket.on("session-closed", handleSessionClosed);
    socket.on("bill-requested", handleBillRequested);
    socket.on("new-session", refreshAll);
    socket.on("table-updated", handleTableUpdated);
    socket.on("order-status-update", handleKitchenUpdated);
    socket.on("kitchen-updated", handleKitchenUpdated);

    return () => {
      socket.off("connect", joinRoom);
      socket.off("new-order", handleNewOrder);
      socket.off("waiter-call", handleWaiterCall);
      socket.off("session-closed", handleSessionClosed);
      socket.off("bill-requested", handleBillRequested);
      socket.off("new-session", refreshAll);
      socket.off("table-updated", handleTableUpdated);
      socket.off("order-status-update", handleKitchenUpdated);
      socket.off("kitchen-updated", handleKitchenUpdated);
    };
  }, [socket, refreshAll, fetchLiveOrders]);

  const kpis = useMemo(() => {
    const pendingOrders = liveOrders.filter((o) => ["PENDING", "ACCEPTED"].includes(o.status)).length;
    const kitchenLoad = liveOrders.filter((o) => o.status === "PREPARING").length;
    const completedSessionIds = new Set(
      todaySessions.filter((o) => o.session?.status === "CLOSED").map((o) => o.session.id)
    );
    const todayOrderCount = stats?.todayOrderCount || 0;
    const aov = todayOrderCount > 0 ? (stats?.revenue?.today || 0) / todayOrderCount : 0;

    return {
      todayRevenue: stats?.revenue?.today || 0,
      todayOrderCount,
      aov,
      activeTables: stats?.seating?.occupiedTables || 0,
      completedSessions: completedSessionIds.size,
      pendingOrders,
      kitchenLoad,
      avgRating: avgRating || 0,
    };
  }, [stats, liveOrders, todaySessions, avgRating]);

  const lowPerformerInsight = useMemo(() => {
    const worst = sellers.worstSellers?.[0];
    if (!worst) return null;
    if (worst.quantity === 0) {
      return `"${worst.name}" hasn't sold at all yet. Consider featuring it, adjusting its price, or running a limited-time offer to test demand.`;
    }
    return `"${worst.name}" is selling slower than the rest of the menu. Consider running an offer or repositioning it on the menu.`;
  }, [sellers]);

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--ss-bg)" }}>
      <DashboardHeader
        title="Dashboard"
        subtitle={activeRestaurant?.name || (isPlatformOwner ? "Platform Administration" : "Restaurant Management")}
      />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        {/* KPI Cards */}
        <section className="mb-8">
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <StatCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={<IndianRupee size={16} />} label="Today's Revenue" value={kpis.todayRevenue} prefix="₹" accent="var(--ss-success)" />
              <StatCard icon={<ShoppingBag size={16} />} label="Today's Orders" value={kpis.todayOrderCount} accent="var(--ss-accent)" />
              <StatCard icon={<TrendingUp size={16} />} label="Avg Order Value" value={kpis.aov} prefix="₹" decimals={0} accent="#0284C7" />
              <StatCard icon={<Users size={16} />} label="Active Tables" value={kpis.activeTables} accent="#7C3AED" />
              <StatCard icon={<CheckCircle2 size={16} />} label="Completed Sessions" value={kpis.completedSessions} accent="var(--ss-success)" />
              <StatCard icon={<Clock size={16} />} label="Pending Orders" value={kpis.pendingOrders} accent="var(--ss-danger)" />
              <StatCard icon={<ChefHat size={16} />} label="Kitchen Load" value={kpis.kitchenLoad} accent="var(--ss-warning)" />
              <StatCard icon={<Star size={16} />} label="Average Rating" value={kpis.avgRating} decimals={1} suffix=" / 5" accent="var(--ss-accent-dark)" />
            </div>
          )}
        </section>

        {/* ServeSync AI Copilot */}
        <AICopilotPanel />

        {/* Revenue Analytics */}
        <section className="mb-8">
          <h2 className="ss-h3 mb-4">Revenue Analytics</h2>
          <RevenueChart series={revenueSeries} period={revenuePeriod} onPeriodChange={setRevenuePeriod} loading={revenueLoading} />
        </section>

        {/* Peak Hours Heatmap */}
        <section className="mb-8">
          <h2 className="ss-h3 mb-4">Peak Hours</h2>
          {heatmapLoading ? (
            <ChartSkeleton height={160} />
          ) : (
            <div className="rounded-[var(--ss-radius-card)] p-4 sm:p-5" style={{ border: "1px solid var(--ss-border)", background: "var(--ss-surface)" }}>
              <Heatmap days={heatmapData.days} cells={heatmapData.cells} maxCount={heatmapData.maxCount} loading={heatmapLoading} />
            </div>
          )}
        </section>

        {/* Best Sellers / Low Performers */}
        <section className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="ss-h3 mb-4">Best Sellers</h2>
            {sellersLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl ss-shimmer" />)}
              </div>
            ) : sellers.bestSellers.length === 0 ? (
              <p className="ss-small font-semibold">No sales data yet.</p>
            ) : (
              <div className="space-y-2">
                {sellers.bestSellers.map((item) => (
                  <ItemPerformanceCard key={item.id} item={item} variant="best" />
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="ss-h3 mb-4">Low Performers</h2>
            {sellersLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl ss-shimmer" />)}
              </div>
            ) : sellers.worstSellers.length === 0 ? (
              <p className="ss-small font-semibold">Not enough data yet.</p>
            ) : (
              <div className="space-y-2">
                {sellers.worstSellers.map((item) => (
                  <ItemPerformanceCard key={item.id} item={item} variant="worst" />
                ))}
                {lowPerformerInsight && <InsightCard text={lowPerformerInsight} />}
              </div>
            )}
          </div>
        </section>
      </main>

      <QuickActionPanel />
    </div>
  );
}
