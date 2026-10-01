"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Search, ShoppingBag } from "lucide-react";
import api from "../../../../../lib/api";
import Navbar from "../../../../../components/Navbar";
import MenuCard from "../../../../../components/MenuCard";
import CategoryTabs from "../../../../../components/CategoryTabs";
import CartDrawer from "../../../../../components/CartDrawer";
import EmptyState from "../../../../../components/EmptyState";
import { useCart } from "../../../../../hooks/useCart";
import { useSocket } from "../../../../../components/SocketProvider";
import { requestOrQueue } from "../../../../../lib/pwa/queuedRequest";
import { isDietFilterApplicable } from "../../../../../lib/menuCategoryType";
import toast from "react-hot-toast";

export default function TenantMenuPage() {
  const params = useParams();
  const router = useRouter();
  const tableCode = params.code?.toUpperCase();
  const slug = params.slug;
  const { socket } = useSocket();

  const [menu, setMenu] = useState([]);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);
  const [dietFilter, setDietFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);

  const cart = useCart();
  const shouldReduceMotion = useReducedMotion();
  const sessionKey = `session-${slug}-${tableCode}`;

  const fetchSession = useCallback(async () => {
    const sessionId = localStorage.getItem(sessionKey);
    if (!sessionId) return;
    try {
      const res = await api.get(`/sessions/${sessionId}`);
      setSession(res.data.data);
    } catch (error) {
      console.error("Failed to fetch session:", error);
    }
  }, [sessionKey]);

  const fetchMenu = useCallback(async () => {
    try {
      const res = await api.get(`/restaurants/${slug}/menu?available=true`);
      setMenu(res.data.data);
    } catch (error) {
      toast.error("Failed to load menu");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchMenu();
    fetchSession();
  }, [fetchMenu, fetchSession]);

  useEffect(() => {
    if (!socket || !tableCode || !slug) return;
    const joinRoom = () => socket.emit("join-table", { tableCode, restaurantSlug: slug });
    if (socket.connected) joinRoom();
    socket.on("connect", joinRoom);
    socket.on("order-accepted", fetchSession);
    socket.on("order-status-update", fetchSession);
    socket.on("session-closed", () => router.push(`/restaurant/${slug}/table/${tableCode}/thank-you`));

    return () => {
      socket.off("connect", joinRoom);
      socket.off("order-accepted", fetchSession);
      socket.off("order-status-update", fetchSession);
      socket.off("session-closed");
    };
  }, [socket, tableCode, slug, fetchSession, router]);

  const handleOpenCart = () => {
    fetchSession();
    setShowCart(true);
  };

  const allItems = menu.flatMap((cat) => cat.items.map((item) => ({ ...item, category: { id: cat.id, name: cat.name } })));

  const categories = menu.map((cat) => ({ id: cat.id, name: cat.name }));

  const activeCategoryObj = activeCategory ? categories.find((c) => c.id === activeCategory) : null;
  // Diet filter only makes sense for food categories — hidden entirely for
  // drinks/paan/service-request categories (see lib/menuCategoryType).
  const dietFilterVisible = activeCategory
    ? isDietFilterApplicable(activeCategoryObj?.name)
    : categories.some((c) => isDietFilterApplicable(c.name));

  const filteredItems = allItems.filter((item) => {
    if (activeCategory && item.category.id !== activeCategory) return false;
    // Never apply Veg/Non-Veg to items whose category doesn't support it,
    // even if the global filter is still set from a previous category.
    if (isDietFilterApplicable(item.category?.name)) {
      if (dietFilter === "VEG" && !item.isVeg) return false;
      if (dietFilter === "NON_VEG" && item.isVeg) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!item.name.toLowerCase().includes(q) && !item.category?.name?.toLowerCase().includes(q) && !item.description?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filtersActive = Boolean(searchQuery || dietFilter !== "ALL" || activeCategory);

  const handleSelectCategory = (categoryId) => {
    setActiveCategory(categoryId);
    const nextCategory = categoryId ? categories.find((c) => c.id === categoryId) : null;
    const nextDietVisible = categoryId ? isDietFilterApplicable(nextCategory?.name) : true;
    if (!nextDietVisible && dietFilter !== "ALL") setDietFilter("ALL");
  };

  const resetFilters = () => {
    setSearchQuery("");
    setDietFilter("ALL");
    setActiveCategory(null);
  };

  const handlePlaceOrder = async () => {
    const sessionId = localStorage.getItem(sessionKey);
    if (!sessionId) {
      toast.error("Session expired. Please scan the QR code again.");
      router.push(`/restaurant/${slug}/table/${tableCode}`);
      return;
    }
    setIsOrdering(true);
    try {
      const result = await requestOrQueue({
        type: "ORDER",
        method: "post",
        url: "/orders",
        body: { sessionId, items: cart.items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })) },
        label: `Order — Table ${tableCode}`,
        offlineMessage: "Your order will be sent automatically once you're back online.",
      });
      if (result.queued) {
        cart.clearCart();
        setShowCart(false);
        return;
      }
      toast.success(`Order #${result.data.data.orderNumber} placed! 🎉`);
      cart.clearCart();
      setShowCart(false);
      fetchSession();
      router.push(`/restaurant/${slug}/table/${tableCode}/orders`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to place order");
    } finally {
      setIsOrdering(false);
    }
  };

  const activePlacedOrders = session?.orders?.filter((o) => o.status !== "CANCELLED") || [];
  const runningTotal = session?.runningTotal || 0;
  const placedItemsCount = activePlacedOrders.reduce((sum, order) => sum + order.items.reduce((s, item) => s + item.quantity, 0), 0);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-cream-50)" }}>
      <Navbar
        title="Menu"
        subtitle={`Table ${tableCode}`}
        backHref={`/restaurant/${slug}/table/${tableCode}`}
        rightContent={
          <button
            onClick={handleOpenCart}
            className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all"
            style={{
              background: cart.totalItems > 0 || placedItemsCount > 0 ? "var(--color-orange-500)" : "var(--color-cream-100)",
              color: cart.totalItems > 0 || placedItemsCount > 0 ? "white" : "var(--color-brown-800)",
              border: cart.totalItems > 0 || placedItemsCount > 0 ? "none" : "1px solid var(--color-cream-200)",
            }}
          >
            <ShoppingBag size={18} />
            {cart.totalItems > 0 ? (
              <span className="text-sm font-bold">{cart.totalItems} · ₹{cart.totalPrice}</span>
            ) : placedItemsCount > 0 ? (
              <span className="text-sm font-bold">Orders ({placedItemsCount}) · ₹{runningTotal}</span>
            ) : null}
          </button>
        }
      />

      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        onSelect={handleSelectCategory}
        dietFilter={dietFilter}
        onDietChange={setDietFilter}
        dietFilterVisible={dietFilterVisible}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="flex-1 max-w-5xl mx-auto w-full px-3 sm:px-4 py-3 sm:py-4 pb-28 sm:pb-36 overflow-x-hidden">
        {filtersActive && !loading && (
          <div className="flex items-center justify-between mb-3 text-xs text-gray-600 bg-amber-50/70 border border-amber-200 px-3 py-1.5 rounded-lg">
            <span>
              Showing <strong>{filteredItems.length}</strong> {filteredItems.length === 1 ? "item" : "items"}
            </span>
            <button onClick={resetFilters} className="text-orange-600 font-bold uppercase tracking-wider hover:underline ml-2 flex-shrink-0">
              Reset Filters
            </button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-2xl overflow-hidden border" style={{ borderColor: "var(--color-border-light)" }}>
                <div className="w-full aspect-[4/3] animate-pulse" style={{ background: "var(--color-cream-200)" }} />
                <div className="p-3.5 space-y-2">
                  <div className="h-4 w-3/4 rounded animate-pulse" style={{ background: "var(--color-cream-200)" }} />
                  <div className="h-8 w-full rounded-lg animate-pulse mt-2" style={{ background: "var(--color-cream-200)" }} />
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={<Search size={30} style={{ color: "var(--color-text-muted)" }} />}
            title={menu.length === 0 ? "No Menu Items" : "No matching items"}
            description={menu.length === 0 ? "This restaurant hasn't added any menu items yet." : "Try clearing your search or filters."}
            action={filtersActive && <button onClick={resetFilters} className="btn-secondary text-xs font-bold px-4 py-2 uppercase tracking-wider">Clear All Filters</button>}
          />
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.05 } } }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
          >
            {filteredItems.map((item) => (
              <MenuCard
                key={item.id}
                item={item}
                cartQuantity={cart.items.find((c) => c.menuItemId === item.id)?.quantity || 0}
                onAdd={cart.addItem}
                onUpdateQuantity={cart.updateQuantity}
              />
            ))}
          </motion.div>
        )}

        {(cart.totalItems > 0 || placedItemsCount > 0) && <div className="h-24 w-full flex-shrink-0" aria-hidden="true" />}
      </main>

      {(cart.totalItems > 0 || placedItemsCount > 0) && !showCart && (
        <div className="fixed bottom-4 left-4 right-4 z-40 md:hidden animate-slide-in-up">
          <button
            onClick={handleOpenCart}
            className="btn-primary w-full py-3.5 flex items-center justify-between"
            style={{ fontSize: "1rem", borderRadius: "1rem", boxShadow: "0 8px 32px rgba(232, 137, 28, 0.35)" }}
          >
            <span className="flex items-center gap-2">
              <ShoppingBag size={20} />
              {cart.totalItems > 0 ? `${cart.totalItems} item${cart.totalItems > 1 ? "s" : ""} (Draft)` : `Orders (${placedItemsCount})`}
            </span>
            <span className="font-bold">₹{cart.totalItems > 0 ? cart.totalPrice : runningTotal} →</span>
          </button>
        </div>
      )}

      <AnimatePresence>
        {showCart && (
          <CartDrawer
            items={cart.items}
            placedOrders={session?.orders || []}
            runningTotal={runningTotal}
            tableCode={tableCode}
            onUpdateQuantity={cart.updateQuantity}
            onRemove={cart.removeItem}
            onClose={() => setShowCart(false)}
            onPlaceOrder={handlePlaceOrder}
            isOrdering={isOrdering}
            onViewOrders={() => router.push(`/restaurant/${slug}/table/${tableCode}/orders`)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
