"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Search, ShoppingBag } from "lucide-react";
import api from "../../../lib/api";
import StickyHeader from "../../../components/customer/StickyHeader";
import MenuCard from "../../../components/MenuCard";
import CategoryTabs from "../../../components/CategoryTabs";
import CartDrawer from "../../../components/CartDrawer";
import EmptyState from "../../../components/EmptyState";
import { SkeletonCard } from "../../../components/customer/SkeletonCard";
import { useCart } from "../../../hooks/useCart";
import { useSocket } from "../../../components/SocketProvider";
import { requestOrQueue } from "../../../lib/pwa/queuedRequest";
import { DEMO_RESTAURANT } from "../../../lib/branding";
import toast from "react-hot-toast";

// An item counts as "New" if it was added to the menu within the last 14 days.
const NEW_ITEM_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export default function MenuPage() {
  const params = useParams();
  const router = useRouter();
  const tableCode = params.code?.toUpperCase();
  const { socket } = useSocket();
  const searchInputRef = useRef(null);

  const [menu, setMenu] = useState([]);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);
  const [dietFilter, setDietFilter] = useState("ALL"); // "ALL", "VEG", "NON_VEG"
  const [searchQuery, setSearchQuery] = useState("");
  const [popularOnly, setPopularOnly] = useState(false);
  const [newOnly, setNewOnly] = useState(false);
  const [sortBy, setSortBy] = useState("NONE"); // "NONE", "PRICE_LOW", "PRICE_HIGH"
  const [showCart, setShowCart] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [seatNumber, setSeatNumber] = useState("");
  // Stable reference point for "New" filtering — captured once on mount, not on every render.
  const [pageLoadTime] = useState(() => Date.now());

  const cart = useCart();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    setSeatNumber(localStorage.getItem(`seat-${tableCode}`) || "");
  }, [tableCode]);

  const fetchSession = useCallback(async () => {
    const sessionId = localStorage.getItem(`session-${tableCode}`);
    if (!sessionId) return;
    try {
      const res = await api.get(`/sessions/${sessionId}`);
      setSession(res.data.data);
    } catch (error) {
      console.error("Failed to fetch session:", error);
    }
  }, [tableCode]);

  useEffect(() => {
    fetchMenu();
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (!socket || !tableCode) return;

    const joinRoom = () => {
      console.log(`[Menu Table ${tableCode}] Emitting join-table...`);
      socket.emit("join-table", tableCode);
    };

    if (socket.connected) {
      joinRoom();
    }
    socket.on("connect", joinRoom);

    socket.on("order-accepted", fetchSession);
    socket.on("order-status-update", fetchSession);
    socket.on("session-closed", () => {
      router.push(`/table/${tableCode}/thank-you`);
    });

    return () => {
      socket.off("connect", joinRoom);
      socket.off("order-accepted", fetchSession);
      socket.off("order-status-update", fetchSession);
      socket.off("session-closed");
    };
  }, [socket, tableCode, fetchSession, router]);

  const fetchMenu = async () => {
    try {
      const res = await api.get("/menu?available=true");
      setMenu(res.data.data);
    } catch (error) {
      toast.error("Failed to load menu");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCart = () => {
    fetchSession();
    setShowCart(true);
  };

  // Add-to-cart feedback (Step 6): the cart hook itself stays silent/pure —
  // this page-level wrapper is what shows the toast, matching how the roti
  // quantity flow already toasts on its own "Add" tap.
  const handleAddToCart = (item) => {
    cart.addItem(item);
    toast.success(`Added ${item.name} to cart!`, { icon: "🛒", duration: 2200 });
  };

  // Get all items, filtered by category, diet (Veg / Non-Veg), and search query
  const allItems = menu.flatMap((cat) =>
    cat.items.map((item) => ({ ...item, category: { id: cat.id, name: cat.name } }))
  );

  const filteredItems = allItems
    .filter((item) => {
      if (activeCategory && item.category.id !== activeCategory) return false;
      if (dietFilter === "VEG" && !item.isVeg) return false;
      if (dietFilter === "NON_VEG" && item.isVeg) return false;
      if (popularOnly && !item.isPopular) return false;
      if (newOnly) {
        const createdAt = item.createdAt ? new Date(item.createdAt).getTime() : 0;
        if (!createdAt || pageLoadTime - createdAt > NEW_ITEM_WINDOW_MS) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = item.name.toLowerCase().includes(q);
        const catMatch = item.category?.name?.toLowerCase().includes(q);
        const descMatch = item.description?.toLowerCase().includes(q);
        if (!nameMatch && !catMatch && !descMatch) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "PRICE_LOW") return a.price - b.price;
      if (sortBy === "PRICE_HIGH") return b.price - a.price;
      return 0;
    });

  const categories = menu.map((cat) => ({ id: cat.id, name: cat.name }));
  const filtersActive = Boolean(searchQuery || dietFilter !== "ALL" || activeCategory || popularOnly || newOnly || sortBy !== "NONE");

  const resetFilters = () => {
    setSearchQuery("");
    setDietFilter("ALL");
    setActiveCategory(null);
    setPopularOnly(false);
    setNewOnly(false);
    setSortBy("NONE");
  };

  const handlePlaceOrder = async () => {
    const sessionId = localStorage.getItem(`session-${tableCode}`);
    if (!sessionId) {
      toast.error("Session expired. Please scan the QR code again.");
      router.push(`/table/${tableCode}`);
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
      router.push(`/table/${tableCode}/orders`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to place order");
    } finally {
      setIsOrdering(false);
    }
  };

  const activePlacedOrders = session?.orders?.filter((o) => o.status !== "CANCELLED") || [];
  const runningTotal = session?.runningTotal || 0;
  const placedItemsCount = activePlacedOrders.reduce(
    (sum, order) => sum + order.items.reduce((s, item) => s + item.quantity, 0),
    0
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--ss-bg)" }}>
      <StickyHeader
        title={DEMO_RESTAURANT.shortName}
        tableCode={seatNumber ? `${tableCode} · Seat ${seatNumber}` : tableCode}
        logoSrc={DEMO_RESTAURANT.logo}
        onSearchClick={() => searchInputRef.current?.focus()}
        cartCount={cart.totalItems || placedItemsCount}
        cartLabel={
          cart.totalItems > 0
            ? `${cart.totalItems} · ₹${cart.totalPrice}`
            : placedItemsCount > 0
            ? `${placedItemsCount} · ₹${runningTotal}`
            : undefined
        }
        cartBumpKey={cart.totalItems}
        onCartClick={handleOpenCart}
      />

      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        onSelect={setActiveCategory}
        dietFilter={dietFilter}
        onDietChange={setDietFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        popularOnly={popularOnly}
        onPopularChange={setPopularOnly}
        newOnly={newOnly}
        onNewChange={setNewOnly}
        sortBy={sortBy}
        onSortChange={setSortBy}
        loading={loading}
        searchInputRef={searchInputRef}
      />

      <main className="flex-1 max-w-5xl mx-auto w-full px-3 sm:px-4 py-3 sm:py-4 pb-28 sm:pb-36 overflow-x-hidden">
        {/* Search & Filter status banner */}
        {filtersActive && !loading && (
          <div
            className="flex items-center justify-between mb-3 ss-caption px-3 py-2 rounded-xl"
            style={{ background: "var(--ss-accent-tint)", border: "1px solid var(--ss-border)", color: "var(--ss-secondary)" }}
          >
            <span>
              Showing <strong style={{ color: "var(--ss-primary)" }}>{filteredItems.length}</strong> {filteredItems.length === 1 ? "dish" : "dishes"}
              {searchQuery && <> matching &quot;<strong style={{ color: "var(--ss-primary)" }}>{searchQuery}</strong>&quot;</>}
              {dietFilter !== "ALL" && <> ({dietFilter === "VEG" ? "Veg Only" : "Non-Veg Only"})</>}
              {popularOnly && <> (Popular)</>}
              {newOnly && <> (New)</>}
            </span>
            <button onClick={resetFilters} className="font-bold ml-2 flex-shrink-0" style={{ color: "var(--ss-accent-dark)" }}>
              Reset
            </button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={<Search size={28} style={{ color: "var(--ss-secondary)" }} />}
            title={menu.length === 0 ? "No Menu Items" : "No matching dishes"}
            description={
              menu.length === 0
                ? "This restaurant hasn't added any menu items yet. Please check back soon."
                : "We couldn't find any items matching your current search or filters. Try clearing them and browsing again."
            }
            action={
              filtersActive && (
                <button
                  onClick={resetFilters}
                  className="ss-btn px-5 py-2.5 ss-small font-semibold"
                  data-variant="secondary"
                  style={{ background: "var(--ss-surface)", color: "var(--ss-primary)", border: "1px solid var(--ss-border)", borderRadius: "var(--ss-radius-button)" }}
                >
                  Clear All Filters
                </button>
              )
            }
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
                cartQuantity={
                  cart.items.find((c) => c.menuItemId === item.id)?.quantity || 0
                }
                onAdd={handleAddToCart}
                onUpdateQuantity={cart.updateQuantity}
              />
            ))}
          </motion.div>
        )}

        {/* Bottom Spacer to ensure floating order bar never overlaps the last item */}
        {(cart.totalItems > 0 || placedItemsCount > 0) && (
          <div className="h-24 w-full flex-shrink-0" aria-hidden="true" />
        )}
      </main>

      {/* Floating cart button (mobile) */}
      {(cart.totalItems > 0 || placedItemsCount > 0) && !showCart && (
        <div className="fixed bottom-4 left-4 right-4 z-40 md:hidden animate-slide-in-up">
          <button
            onClick={handleOpenCart}
            className="ss-btn w-full py-4 flex items-center justify-between ss-body font-semibold"
            data-variant="primary"
            style={{
              background: "var(--ss-accent)",
              color: "var(--ss-on-accent)",
              borderRadius: "var(--ss-radius-button)",
              boxShadow: "var(--ss-shadow-lg)",
            }}
          >
            <span className="flex items-center gap-2">
              <ShoppingBag size={20} />
              {cart.totalItems > 0
                ? `${cart.totalItems} item${cart.totalItems > 1 ? "s" : ""} (Draft)`
                : `Orders (${placedItemsCount})`}
            </span>
            <span className="font-bold">
              ₹{cart.totalItems > 0 ? cart.totalPrice : runningTotal} →
            </span>
          </button>
        </div>
      )}

      {/* Cart Drawer */}
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
            onViewOrders={() => router.push(`/table/${tableCode}/orders`)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
