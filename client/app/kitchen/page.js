"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ChefHat,
  RefreshCcw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  LogOut,
  CheckCircle2,
  Clock,
  Check,
  Flame,
  LayoutGrid,
  UtensilsCrossed,
  Layers,
} from "lucide-react";
import api from "../lib/api";
import { getUser, clearAuth, isAuthenticated } from "../lib/auth";
import { useSocket } from "../components/SocketProvider";
import toast from "react-hot-toast";

// Audio alert sound generator via Web Audio API
function playKitchenChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    // Silent catch
  }
}

/**
 * Get category theme styling for Enterprise KDS color coding
 */
function getCategoryTheme(categoryName = "", isVeg = true) {
  const name = categoryName.trim().toUpperCase();

  if (name.includes("NON VEG STARTER") || name.includes("NON-VEG STARTER")) {
    return {
      headerBg: "#FEE2E2", // soft red-100
      headerText: "#991B1B", // red-800
      accentColor: "#DC2626", // red-600
      badgeBg: "#FEF2F2",
      badgeText: "#991B1B",
      badgeBorder: "#FECACA",
      icon: "🟥",
      label: "NON VEG STARTERS",
    };
  }

  if (name.includes("NON VEG CURR") || name.includes("NON-VEG CURR")) {
    return {
      headerBg: "#FFEDD5", // soft amber-100
      headerText: "#9A3412", // amber-800
      accentColor: "#D97706", // amber-600
      badgeBg: "#FFFBEB",
      badgeText: "#9A3412",
      badgeBorder: "#FDE68A",
      icon: "🟧",
      label: "NON VEG CURRY",
    };
  }

  if (name.includes("VEG STARTER")) {
    return {
      headerBg: "#D1FAE5", // soft emerald-100
      headerText: "#065F46", // emerald-800
      accentColor: "#059669", // emerald-600
      badgeBg: "#ECFDF5",
      badgeText: "#065F46",
      badgeBorder: "#A7F3D0",
      icon: "🟩",
      label: "VEG STARTERS",
    };
  }

  if (name.includes("VEG CURR")) {
    return {
      headerBg: "#DCFCE7", // soft green-100
      headerText: "#166534", // green-800
      accentColor: "#16A34A", // green-600
      badgeBg: "#F4FBF7",
      badgeText: "#166534",
      badgeBorder: "#BBF7D0",
      icon: "🟢",
      label: "VEG CURRY",
    };
  }

  if (name.includes("FRIED RICE") || name.includes("RICE")) {
    return {
      headerBg: "#FEF3C7", // soft yellow-100
      headerText: "#854D0E", // yellow-800
      accentColor: "#B8860B", // golden brown
      badgeBg: "#FFFDF5",
      badgeText: "#854D0E",
      badgeBorder: "#FDE68A",
      icon: "🟨",
      label: "FRIED RICE",
    };
  }

  if (name.includes("ROTI") || name.includes("BIRYANI") || name.includes("BREAD")) {
    return {
      headerBg: "#E0F2FE", // soft sky-100
      headerText: "#075985", // sky-800
      accentColor: "#0284C7", // sky-600
      badgeBg: "#F0F9FF",
      badgeText: "#075985",
      badgeBorder: "#BAE6FD",
      icon: "🟦",
      label: name,
    };
  }

  // Fallback default theme
  return isVeg
    ? {
        headerBg: "#DCFCE7",
        headerText: "#166534",
        accentColor: "#16A34A",
        badgeBg: "#F4FBF7",
        badgeText: "#166534",
        badgeBorder: "#BBF7D0",
        icon: "🟢",
        label: name || "VEG ITEMS",
      }
    : {
        headerBg: "#FEE2E2",
        headerText: "#991B1B",
        accentColor: "#DC2626",
        badgeBg: "#FEF2F2",
        badgeText: "#991B1B",
        badgeBorder: "#FECACA",
        icon: "🟥",
        label: name || "NON VEG ITEMS",
      };
}

/**
 * Get food emoji icon for ticket list item
 */
function getFoodEmoji(name = "") {
  const lower = name.toLowerCase();
  if (lower.includes("roti") || lower.includes("pulka") || lower.includes("naan") || lower.includes("chapati")) return "🫓";
  if (lower.includes("rice") || lower.includes("biryani")) return "🍚";
  if (lower.includes("chicken") || lower.includes("mutton") || lower.includes("wings")) return "🍗";
  if (lower.includes("fish") || lower.includes("prawn")) return "🐟";
  if (lower.includes("paneer") || lower.includes("kaju") || lower.includes("mushroom")) return "🥘";
  if (lower.includes("drink") || lower.includes("water") || lower.includes("beverage")) return "🥤";
  return "🍽️";
}

export default function KitchenDashboard() {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  
  // State variables
  const [viewMode, setViewMode] = useState("summary"); // Default to Enterprise Category Summary
  const [orders, setOrders] = useState([]);
  const [aggregatedItems, setAggregatedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [updatingOrders, setUpdatingOrders] = useState(new Set());

  // Verify auth on mount
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/kitchen/login");
      return;
    }
    const u = getUser();
    if (!["KITCHEN", "ADMIN", "CAPTAIN"].includes(u?.role)) {
      router.push("/kitchen/login");
    }
  }, [router]);

  // Fetch active order tickets and aggregated quantities
  const fetchAllKitchenData = useCallback(async () => {
    try {
      const [ordersRes, aggRes] = await Promise.all([
        api.get("/orders"),
        api.get("/orders/kitchen/aggregated"),
      ]);

      const allOrders = ordersRes.data.data || [];
      const active = allOrders.filter(
        (o) =>
          ["PENDING", "ACCEPTED", "PREPARING"].includes(o.status) &&
          o.session?.status !== "CLOSED"
      );

      // Sort orders oldest first (KDS queue order)
      active.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setOrders(active);

      const aggData = aggRes.data.data || [];
      setAggregatedItems(aggData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch kitchen data:", error);
      toast.error("Failed to update Kitchen Display");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllKitchenData();
  }, [fetchAllKitchenData]);

  // Socket.IO Real-Time listeners
  useEffect(() => {
    if (!socket) return;

    const joinRoom = () => {
      console.log("👨‍🍳 [Enterprise KDS] Joining kitchen room...");
      socket.emit("join-kitchen");
    };

    if (socket.connected) {
      joinRoom();
    }
    socket.on("connect", joinRoom);

    // Listen for new order
    const handleNewOrder = (newOrder) => {
      console.log("⚡ [Enterprise KDS] New order received:", newOrder);
      if (soundEnabled) playKitchenChime();

      toast(`🔔 New order #${newOrder.orderNumber} (Table ${newOrder.tableCode || "QR"})!`, {
        duration: 5000,
        style: { background: "#1E293B", color: "#F8FAFC", border: "1px solid #3B82F6" },
      });

      fetchAllKitchenData();
    };

    // Listen for aggregated updates
    const handleKitchenUpdated = (aggData = []) => {
      setAggregatedItems(aggData);
      setLastUpdated(new Date());
    };

    const handleOrderStatusUpdate = () => {
      fetchAllKitchenData();
    };

    const handleItemServed = () => {
      fetchAllKitchenData();
    };

    socket.on("new-order", handleNewOrder);
    socket.on("kitchen-updated", handleKitchenUpdated);
    socket.on("order-status-update", handleOrderStatusUpdate);
    socket.on("item-served", handleItemServed);

    return () => {
      socket.off("connect", joinRoom);
      socket.off("new-order", handleNewOrder);
      socket.off("kitchen-updated", handleKitchenUpdated);
      socket.off("order-status-update", handleOrderStatusUpdate);
      socket.off("item-served", handleItemServed);
    };
  }, [socket, soundEnabled, fetchAllKitchenData]);

  // Handle Kitchen Status update for an entire order (e.g. PREPARING -> SERVED)
  const handleUpdateOrderStatus = async (orderId, status) => {
    setUpdatingOrders((prev) => new Set([...prev, `${orderId}-${status}`]));
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      toast.success(`Order marked as ${status.toLowerCase()} ✅`);
      fetchAllKitchenData();
    } catch (error) {
      toast.error("Failed to update order status");
    } finally {
      setUpdatingOrders((prev) => {
        const next = new Set(prev);
        next.delete(`${orderId}-${status}`);
        return next;
      });
    }
  };

  // Fullscreen toggle helper & event listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const handleLogout = () => {
    clearAuth();
    router.push("/kitchen/login");
  };

  // Group aggregated items by category for structured Category Columns Display
  const categoryGroups = useMemo(() => {
    const map = {};

    // Standard category display ordering
    const priorityOrder = [
      "NON VEG STARTERS",
      "NON-VEG STARTERS",
      "NON VEG CURRIES",
      "NON-VEG CURRIES",
      "VEG STARTERS",
      "VEG CURRIES",
      "FRIED RICE",
    ];

    aggregatedItems.forEach((item) => {
      const catName = (item.categoryName || "OTHER").trim();
      const normCatName = catName.toUpperCase();

      if (!map[normCatName]) {
        map[normCatName] = {
          rawName: catName,
          displayName: normCatName,
          items: [],
          totalQuantity: 0,
          isVeg: item.isVeg,
          theme: getCategoryTheme(catName, item.isVeg),
        };
      }

      map[normCatName].items.push(item);
      map[normCatName].totalQuantity += item.quantity;
    });

    // Sort items inside each category by quantity highest first
    Object.values(map).forEach((cat) => {
      cat.items.sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name));
    });

    // Convert map to sorted array according to priority category order
    return Object.values(map).sort((a, b) => {
      const idxA = priorityOrder.findIndex((p) => a.displayName.includes(p));
      const idxB = priorityOrder.findIndex((p) => b.displayName.includes(p));

      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [aggregatedItems]);

  const totalAggregatedSum = aggregatedItems.reduce((sum, item) => sum + item.quantity, 0);

  // Dynamic Density Styling based on total item volume
  const densityStyles = useMemo(() => {
    const totalItems = aggregatedItems.length;
    if (totalItems <= 15) {
      return {
        rowPadding: "py-3 px-4",
        nameSize: "text-base sm:text-lg font-extrabold",
        qtySize: "text-3xl sm:text-4xl font-black",
      };
    }
    if (totalItems <= 35) {
      return {
        rowPadding: "py-2.5 px-3.5",
        nameSize: "text-sm sm:text-base font-bold",
        qtySize: "text-2xl sm:text-3xl font-black",
      };
    }
    // High density compact mode for 50+ items
    return {
      rowPadding: "py-2 px-3",
      nameSize: "text-xs sm:text-sm font-bold",
      qtySize: "text-xl sm:text-2xl font-black",
    };
  }, [aggregatedItems.length]);

  // Dynamic grid column class for Category Columns
  const categoryGridClass = useMemo(() => {
    const count = categoryGroups.length;
    if (count <= 2) return "grid-cols-1 md:grid-cols-2";
    if (count === 3) return "grid-cols-1 md:grid-cols-3";
    if (count === 4) return "grid-cols-2 md:grid-cols-4";
    if (count === 5) return "grid-cols-2 md:grid-cols-3 lg:grid-cols-5";
    return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6";
  }, [categoryGroups.length]);

  // Dynamic grid column class for Order Tickets View
  const ticketGridClass = useMemo(() => {
    const count = orders.length;
    if (count <= 3) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
    if (count <= 8) return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
    return "grid-cols-3 md:grid-cols-4 lg:grid-cols-6";
  }, [orders.length]);

  return (
    <div className="h-screen max-h-screen w-screen overflow-hidden flex flex-col bg-slate-900 text-slate-100 font-sans select-none relative">
      
      {/* ─────────────────────────────────────────
          FLOATING EXIT FULLSCREEN BUTTON (Top Right Corner)
      ───────────────────────────────────────── */}
      {isFullscreen && (
        <button
          onClick={toggleFullscreen}
          title="Exit Fullscreen & Show Navbar"
          className="fixed top-3 right-3 z-50 w-10 h-10 rounded-full bg-slate-950/85 hover:bg-slate-900 border-2 border-amber-500/80 text-amber-400 flex items-center justify-center shadow-xl backdrop-blur-sm transition-all hover:scale-110 active:scale-95"
        >
          <Minimize size={20} strokeWidth={2.5} />
        </button>
      )}

      {/* ─────────────────────────────────────────
          TOP NAVBAR (Hidden in Fullscreen Mode)
      ───────────────────────────────────────── */}
      {!isFullscreen && (
        <header className="h-[55px] flex-shrink-0 px-4 flex items-center justify-between border-b border-slate-800 bg-slate-950 text-white sticky top-0 z-50">
          {/* Left: KDS Brand Title */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black">
              <ChefHat size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black uppercase tracking-wider text-white leading-none">
                KITCHEN DISPLAY SYSTEM
              </h1>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:inline">
                ENTERPRISE COMMAND CENTER
              </span>
            </div>
          </div>

          {/* Center: View Switcher (Category Columns vs Order Tickets) & Live Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center p-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold">
              <button
                onClick={() => setViewMode("summary")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded transition-all ${
                  viewMode === "summary"
                    ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Layers size={14} />
                <span>CATEGORY DISPLAY ({aggregatedItems.length})</span>
              </button>
              <button
                onClick={() => setViewMode("tickets")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded transition-all ${
                  viewMode === "tickets"
                    ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <LayoutGrid size={14} />
                <span>ORDER TICKETS ({orders.length})</span>
              </button>
            </div>

            {/* Live Sync Indicator */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${
                isConnected
                  ? "border-emerald-500/40 bg-emerald-950/60 text-emerald-400"
                  : "border-rose-500/40 bg-rose-950/60 text-rose-400"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
              {isConnected ? "LIVE" : "OFFLINE"}
            </div>
          </div>

          {/* Right: Dish Counter, Fullscreen & Controls */}
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300">
              <span>Total Qty:</span>
              <span className="text-amber-400 font-black text-sm">{totalAggregatedSum}</span>
            </div>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Mute alert chime" : "Enable alert chime"}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              {soundEnabled ? <Volume2 size={16} className="text-amber-400" /> : <VolumeX size={16} />}
            </button>

            <button
              onClick={toggleFullscreen}
              title="Enter Fullscreen Mode"
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <Maximize size={16} />
            </button>

            <button
              onClick={fetchAllKitchenData}
              title="Refresh Data"
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            </button>

            <button
              onClick={handleLogout}
              title="Exit Kitchen"
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-950/60 border border-rose-800/60 text-rose-400 hover:bg-rose-900/80 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>
      )}

      {/* ─────────────────────────────────────────
          MAIN KDS DISPLAY AREA (Zero Page-Level Body Scroll)
      ───────────────────────────────────────── */}
      <main className={`flex-1 ${isFullscreen ? "h-screen p-2" : "h-[calc(100vh-55px)] p-3"} overflow-hidden bg-slate-900`}>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 h-full">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-4 animate-pulse h-full space-y-4">
                <div className="h-8 bg-slate-800 rounded-md w-3/4" />
                <div className="h-16 bg-slate-900 rounded-lg" />
                <div className="h-16 bg-slate-900 rounded-lg" />
              </div>
            ))}
          </div>
        ) : viewMode === "summary" ? (
          /* ── ENTERPRISE KDS DISPLAY MODE: CATEGORY COLUMNS ── */
          categoryGroups.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-950 border border-slate-800 rounded-2xl">
              <div className="w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mb-4">
                <CheckCircle2 size={38} />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-wider text-white mb-1">
                ALL PREPARATION DISHES CLEAR!
              </h2>
              <p className="text-sm font-medium text-slate-400 max-w-sm">
                No active cooking items are pending right now. New customer orders will appear automatically by category.
              </p>
            </div>
          ) : (
            <div className={`grid ${categoryGridClass} gap-3 h-full overflow-hidden`}>
              {categoryGroups.map((cat) => {
                const theme = cat.theme;
                return (
                  <div
                    key={cat.displayName}
                    className="bg-white border rounded-2xl flex flex-col overflow-hidden shadow-sm h-full border-slate-300"
                    style={{ borderTop: `4px solid ${theme.accentColor}` }}
                  >
                    {/* Sticky Category Header */}
                    <div
                      className="px-3 py-2.5 flex items-center justify-between border-b flex-shrink-0"
                      style={{ background: theme.headerBg, borderColor: theme.badgeBorder }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base flex-shrink-0">{theme.icon}</span>
                        {/* Category Name — NEVER TRUNCATED, Full Bold Uppercase */}
                        <h2
                          className="font-black text-xs sm:text-sm uppercase tracking-wider leading-tight truncate"
                          style={{ color: theme.headerText }}
                        >
                          {theme.label}
                        </h2>
                      </div>

                      {/* Total Item & Qty Badge */}
                      <span
                        className="text-[10px] font-black uppercase px-2 py-0.5 rounded border flex-shrink-0 ml-1"
                        style={{ background: "#FFFFFF", color: theme.headerText, borderColor: theme.badgeBorder }}
                      >
                        {cat.items.length} ITEMS • {cat.totalQuantity} QTY
                      </span>
                    </div>

                    {/* Category Items List (Adaptive Category Height & Equal Flex Row Distribution) */}
                    {(() => {
                      const count = cat.items.length;
                      let rowPad = "px-3 sm:px-4";
                      let nameCls = "text-base sm:text-xl font-black";
                      let qtyCls = "text-3xl sm:text-4xl font-black px-3 py-1.5";
                      let containerScroll = "overflow-hidden";

                      if (count > 5 && count <= 9) {
                        rowPad = "px-3";
                        nameCls = "text-xs sm:text-base font-extrabold";
                        qtyCls = "text-xl sm:text-2xl font-black px-2.5 py-1";
                      } else if (count > 9 && count <= 14) {
                        rowPad = "px-2.5";
                        nameCls = "text-[11px] sm:text-xs font-bold leading-tight";
                        qtyCls = "text-sm sm:text-base font-black px-2 py-0.5";
                      } else if (count > 14 && count <= 22) {
                        rowPad = "px-2";
                        nameCls = "text-[10px] sm:text-[11px] font-bold leading-none";
                        qtyCls = "text-xs sm:text-sm font-black px-1.5 py-0";
                      } else if (count > 22) {
                        rowPad = "px-2 py-1";
                        nameCls = "text-[10px] sm:text-[11px] font-bold leading-none";
                        qtyCls = "text-xs font-black px-1 py-0";
                        containerScroll = "overflow-y-auto";
                      }

                      return (
                        <div className={`flex-1 h-full min-h-0 ${containerScroll} flex flex-col divide-y divide-slate-100 bg-white`}>
                          {cat.items.map((item) => (
                            <div
                              key={item.name}
                              className={`${count <= 22 ? "flex-1" : "min-h-[28px]"} flex items-center justify-between ${rowPad} hover:bg-slate-50 transition-all gap-2 min-h-0`}
                            >
                              {/* Item Name: Full text, wraps onto next line cleanly if needed */}
                              <div className="flex-1 min-w-0 pr-1">
                                <h3
                                  className={`${nameCls} text-slate-900 uppercase tracking-wide break-words`}
                                >
                                  {item.name}
                                </h3>
                              </div>

                              {/* Quantity: LARGEST, MOST PROMINENT VISUAL ELEMENT */}
                              <div className="flex items-center flex-shrink-0">
                                <span
                                  className={`${qtyCls} tracking-tight font-black leading-none rounded-md`}
                                  style={{
                                    color: "#B8860B",
                                    background: "#FFF8EC",
                                    border: "1px solid #E8D8B5",
                                  }}
                                >
                                  ×{item.quantity}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* ── MODE 2: ORDER TICKETS VIEW ── */
          orders.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-950 border border-slate-800 rounded-2xl">
              <div className="w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mb-4">
                <CheckCircle2 size={38} />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-wider text-white mb-1">
                NO PENDING ORDER TICKETS
              </h2>
              <p className="text-sm font-medium text-slate-400 max-w-sm">
                All order tickets are completed.
              </p>
            </div>
          ) : (
            <div className={`grid ${ticketGridClass} gap-3 h-full overflow-y-auto pr-1`}>
              {orders.map((order) => {
                const tableCode = order.session?.table?.code || "QR";
                const timeStr = new Date(order.createdAt).toLocaleTimeString("en-IN", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                });

                return (
                  <div
                    key={order.id}
                    className="bg-white border-2 rounded-2xl p-4 flex flex-col justify-between shadow-sm border-slate-300 relative overflow-hidden"
                    style={{ maxHeight: "100%" }}
                  >
                    <div>
                      {/* Ticket Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xl sm:text-2xl font-black uppercase tracking-wide text-slate-900">
                              TABLE {tableCode}
                            </span>
                            <span className="text-xs font-extrabold text-[#B8860B] bg-[#FFF8EC] px-2 py-0.5 rounded-md border border-[#E8D8B5]">
                              #{order.orderNumber}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold mt-1">
                            <Clock size={13} className="text-slate-400" />
                            <span>{timeStr}</span>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${
                            order.status === "PREPARING"
                              ? "bg-amber-100 text-amber-900 border-amber-300"
                              : "bg-emerald-50 text-emerald-800 border-emerald-300"
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>

                      {/* Ticket Items List */}
                      <div className="my-3 overflow-y-auto max-h-[180px] pr-1 space-y-2">
                        {order.items.map((item) => {
                          const emoji = getFoodEmoji(item.menuItem?.name || item.name);
                          const isItemServed = item.status === "SERVED";

                          return (
                            <div
                              key={item.id}
                              className={`flex items-center justify-between p-2 rounded-xl border text-xs sm:text-sm font-bold ${
                                isItemServed
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                  : "bg-slate-50 border-slate-200 text-slate-900"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                <span>{emoji}</span>
                                <span className="truncate">{item.menuItem?.name || item.name}</span>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span
                                  className="text-sm font-black px-2 py-0.5 rounded-lg"
                                  style={{ background: "#FFF8EC", color: "#B8860B", border: "1px solid #E8D8B5" }}
                                >
                                  x{item.quantity}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Notes Box */}
                      {(order.notes || order.specialInstructions) && (
                        <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs font-bold text-amber-900 flex items-start gap-1.5">
                          <span className="text-amber-600 font-extrabold flex-shrink-0">Notes:</span>
                          <span className="line-clamp-2">{order.notes || order.specialInstructions}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-slate-200 flex items-center gap-2">
                      {order.status !== "PREPARING" && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, "PREPARING")}
                          disabled={updatingOrders.has(`${order.id}-PREPARING`)}
                          className="flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl border transition-all flex items-center justify-center gap-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300"
                        >
                          <Flame size={14} />
                          {updatingOrders.has(`${order.id}-PREPARING`) ? "Updating..." : "Preparing"}
                        </button>
                      )}

                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, "SERVED")}
                        disabled={updatingOrders.has(`${order.id}-SERVED`)}
                        className="flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl border transition-all flex items-center justify-center gap-1 text-white shadow-xs"
                        style={{ background: "#B8860B", borderColor: "#966C06" }}
                      >
                        <Check size={14} />
                        {updatingOrders.has(`${order.id}-SERVED`) ? "Updating..." : "Ready / Served"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </main>
    </div>
  );
}
