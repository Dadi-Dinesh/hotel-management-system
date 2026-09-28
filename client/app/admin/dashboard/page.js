"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  BarChart3,
  Users,
  UtensilsCrossed,
  ClipboardList,
  LogOut,
  IndianRupee,
  Star,
  Sliders,
  ShoppingBag,
  CheckCircle2,
  Clock,
  ChefHat,
  Tag,
  FileBarChart,
  TrendingUp,
  Settings,
  Printer,
  CreditCard,
} from "lucide-react";
import api from "../../lib/api";
import { getUser, clearAuth, isAuthenticated, getEffectiveRestaurantId } from "../../lib/auth";
import { DEMO_RESTAURANT } from "../../lib/branding";
import { useSocket } from "../../components/SocketProvider";
import Navbar from "../../components/Navbar";
import RestaurantSwitcher from "../../components/RestaurantSwitcher";
import { useRestaurant } from "../../components/RestaurantContext";
import StatCard from "../../components/admin/StatCard";
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
    <section className="mb-10">
      <div className="h-8 w-64 rounded-lg animate-pulse mb-5" style={{ background: "var(--color-cream-200)" }} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: "var(--color-cream-200)" }} />
        ))}
      </div>
    </section>
  ),
});

export default function AdminDashboard() {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
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

  const handleLogout = () => {
    clearAuth();
    router.push("/admin/login");
  };

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

  const navItems = [
    { href: "/admin/tables", icon: <Sliders size={24} />, label: "Table Management", desc: "Live seats occupation, add/edit/delete tables" },
    { href: "/admin/menu", icon: <UtensilsCrossed size={24} />, label: "Menu Management", desc: "Add, edit, remove items" },
    { href: "/admin/orders", icon: <ClipboardList size={24} />, label: "Order History", desc: "View and filter orders" },
    { href: "/admin/captains", icon: <Users size={24} />, label: "Captain Management", desc: "Manage captain accounts" },
    { href: "/admin/reviews", icon: <Star size={24} />, label: "Customer Reviews", desc: "View customer feedback" },
    { href: "/admin/menu-performance", icon: <BarChart3 size={24} />, label: "Menu Performance", desc: "Per-item orders & revenue" },
    { href: "/admin/offers", icon: <Tag size={24} />, label: "Offers", desc: "Manage promotions & discounts" },
    { href: "/admin/reports", icon: <FileBarChart size={24} />, label: "Reports", desc: "Export CSV / PDF / Print" },
    { href: "/admin/printer/settings", icon: <Printer size={24} />, label: "Print Engine", desc: "Printers, queue, history & test print" },
    { href: "/admin/settings", icon: <Settings size={24} />, label: "Restaurant Settings", desc: "Branding, colors, tax & service charge" },
    { href: "/admin/account", icon: <CreditCard size={24} />, label: "Account & Billing", desc: "Plan, trial status & upgrade" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--color-surface)" }}>
      <Navbar
        title="Admin Dashboard"
        subtitle={activeRestaurant?.name || (isPlatformOwner ? "Platform-wide" : DEMO_RESTAURANT.shortName)}
        rightContent={
          <div className="flex items-center gap-3">
            {isPlatformOwner && (
              <Link
                href="/platform"
                className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1.5 border rounded-lg transition-colors hover:bg-cream-100"
                style={{ borderColor: "var(--color-brown-900)", color: "var(--color-brown-900)" }}
              >
                Review Applications
              </Link>
            )}
            <RestaurantSwitcher />
            <div
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2 py-1 border"
              style={{
                borderColor: isConnected ? "var(--color-success)" : "var(--color-danger)",
                color: isConnected ? "var(--color-success)" : "var(--color-danger)",
                background: isConnected ? "#f0fdf4" : "#fef2f2",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: isConnected ? "var(--color-success)" : "var(--color-danger)" }} />
              {isConnected ? "LIVE" : "OFFLINE"}
            </div>
            <button
              onClick={handleLogout}
              className="w-10 h-10 border flex items-center justify-center transition-colors hover:bg-brown-900 hover:text-white"
              style={{ borderColor: "var(--color-brown-900)", color: "var(--color-danger)" }}
            >
              <LogOut size={20} />
            </button>
          </div>
        }
      />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* KPI Cards */}
        <section className="mb-10">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl h-28 animate-pulse" style={{ background: "var(--color-cream-200)" }} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={<IndianRupee size={18} />} label="Today's Revenue" value={kpis.todayRevenue} prefix="₹" accent="#16A34A" />
              <StatCard icon={<ShoppingBag size={18} />} label="Today's Orders" value={kpis.todayOrderCount} accent="#E8891C" />
              <StatCard icon={<TrendingUp size={18} />} label="Avg Order Value" value={kpis.aov} prefix="₹" decimals={0} accent="#0284C7" />
              <StatCard icon={<Users size={18} />} label="Active Tables" value={kpis.activeTables} accent="#7C3AED" />
              <StatCard icon={<CheckCircle2 size={18} />} label="Completed Sessions" value={kpis.completedSessions} accent="#16A34A" />
              <StatCard icon={<Clock size={18} />} label="Pending Orders" value={kpis.pendingOrders} accent="#DC2626" />
              <StatCard icon={<ChefHat size={18} />} label="Kitchen Load" value={kpis.kitchenLoad} accent="#D97706" />
              <StatCard icon={<Star size={18} />} label="Average Rating" value={kpis.avgRating} decimals={1} suffix=" / 5" accent="#F59E0B" />
            </div>
          )}
        </section>

        {/* ServeSync AI Copilot */}
        <AICopilotPanel />

        {/* Revenue Analytics */}
        <section className="mb-10">
          <h2 className="text-xl font-black uppercase tracking-widest mb-4" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
            Revenue Analytics
          </h2>
          <RevenueChart series={revenueSeries} period={revenuePeriod} onPeriodChange={setRevenuePeriod} loading={revenueLoading} />
        </section>

        {/* Peak Hours Heatmap */}
        <section className="mb-10">
          <h2 className="text-xl font-black uppercase tracking-widest mb-4" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
            Peak Hours
          </h2>
          <div className="rounded-2xl p-4 sm:p-5 border" style={{ borderColor: "var(--color-border-light)", background: "var(--color-surface)" }}>
            <Heatmap days={heatmapData.days} cells={heatmapData.cells} maxCount={heatmapData.maxCount} loading={heatmapLoading} />
          </div>
        </section>

        {/* Best Sellers / Low Performers */}
        <section className="mb-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-black uppercase tracking-widest mb-4" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
              Best Sellers
            </h2>
            {sellersLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "var(--color-cream-200)" }} />)}
              </div>
            ) : sellers.bestSellers.length === 0 ? (
              <p className="text-xs font-bold" style={{ color: "var(--color-text-muted)" }}>No sales data yet.</p>
            ) : (
              <div className="space-y-2">
                {sellers.bestSellers.map((item) => (
                  <ItemPerformanceCard key={item.id} item={item} variant="best" />
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-black uppercase tracking-widest mb-4" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
              Low Performers
            </h2>
            {sellersLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "var(--color-cream-200)" }} />)}
              </div>
            ) : sellers.worstSellers.length === 0 ? (
              <p className="text-xs font-bold" style={{ color: "var(--color-text-muted)" }}>Not enough data yet.</p>
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

        {/* Navigation Grid */}
        <section>
          <h2 className="text-xl font-black uppercase tracking-widest mb-6" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
            Management
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {navItems.map((item) => (
              <motion.div key={item.href} whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
                <Link
                  href={item.href}
                  className="border p-6 flex flex-col items-center text-center transition-colors hover:bg-cream-200 h-full"
                  style={{ borderColor: "var(--color-brown-900)", textDecoration: "none" }}
                >
                  <div
                    className="w-16 h-16 border flex items-center justify-center mb-4"
                    style={{ background: "var(--color-surface)", borderColor: "var(--color-brown-900)", color: "var(--color-orange-500)" }}
                  >
                    {item.icon}
                  </div>
                  <p className="font-black text-base uppercase tracking-widest" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
                    {item.label}
                  </p>
                  <p className="text-xs font-bold uppercase tracking-wider mt-2" style={{ color: "var(--color-text-muted)" }}>
                    {item.desc}
                  </p>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      <QuickActionPanel />
    </div>
  );
}
