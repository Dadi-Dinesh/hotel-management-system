"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import api from "../../../lib/api";
import Navbar from "../../../components/Navbar";
import MenuCard from "../../../components/MenuCard";
import CategoryTabs from "../../../components/CategoryTabs";
import CartDrawer from "../../../components/CartDrawer";
import { useCart } from "../../../hooks/useCart";
import { useSocket } from "../../../components/SocketProvider";
import toast from "react-hot-toast";

export default function MenuPage() {
  const params = useParams();
  const router = useRouter();
  const tableCode = params.code?.toUpperCase();
  const { socket } = useSocket();

  const [menu, setMenu] = useState([]);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);
  const [dietFilter, setDietFilter] = useState("ALL"); // "ALL", "VEG", "NON_VEG"
  const [searchQuery, setSearchQuery] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);

  const cart = useCart();

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

    socket.emit("join-table", tableCode);

    socket.on("order-accepted", fetchSession);
    socket.on("order-status-update", fetchSession);
    socket.on("session-closed", () => {
      router.push(`/table/${tableCode}/thank-you`);
    });

    return () => {
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

  // Get all items, filtered by category, diet (Veg / Non-Veg), and search query
  const allItems = menu.flatMap((cat) =>
    cat.items.map((item) => ({ ...item, category: { id: cat.id, name: cat.name } }))
  );

  const filteredItems = allItems.filter((item) => {
    if (activeCategory && item.category.id !== activeCategory) return false;
    if (dietFilter === "VEG" && !item.isVeg) return false;
    if (dietFilter === "NON_VEG" && item.isVeg) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = item.name.toLowerCase().includes(q);
      const catMatch = item.category?.name?.toLowerCase().includes(q);
      const descMatch = item.description?.toLowerCase().includes(q);
      if (!nameMatch && !catMatch && !descMatch) return false;
    }
    return true;
  });

  const categories = menu.map((cat) => ({ id: cat.id, name: cat.name }));

  const handlePlaceOrder = async () => {
    const sessionId = localStorage.getItem(`session-${tableCode}`);
    if (!sessionId) {
      toast.error("Session expired. Please scan the QR code again.");
      router.push(`/table/${tableCode}`);
      return;
    }

    setIsOrdering(true);
    try {
      const res = await api.post("/orders", {
        sessionId,
        items: cart.items.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
        })),
      });

      toast.success(`Order #${res.data.data.orderNumber} placed! 🎉`);
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
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--color-cream-50)" }}
    >
      <Navbar
        title="Menu"
        subtitle={`Table ${tableCode}`}
        backHref={`/table/${tableCode}`}
        rightContent={
          <button
            onClick={handleOpenCart}
            className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all"
            style={{
              background:
                cart.totalItems > 0 || placedItemsCount > 0
                  ? "var(--color-orange-500)"
                  : "var(--color-cream-100)",
              color:
                cart.totalItems > 0 || placedItemsCount > 0
                  ? "white"
                  : "var(--color-brown-800)",
              border:
                cart.totalItems > 0 || placedItemsCount > 0
                  ? "none"
                  : "1px solid var(--color-cream-200)",
            }}
          >
            <ShoppingBag size={18} />
            {cart.totalItems > 0 ? (
              <span className="text-sm font-bold">
                {cart.totalItems} · ₹{cart.totalPrice}
              </span>
            ) : placedItemsCount > 0 ? (
              <span className="text-sm font-bold">
                Orders ({placedItemsCount}) · ₹{runningTotal}
              </span>
            ) : null}
          </button>
        }
      />

      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        onSelect={setActiveCategory}
        dietFilter={dietFilter}
        onDietChange={setDietFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="flex-1 max-w-5xl mx-auto w-full px-3 sm:px-4 py-3 sm:py-4 overflow-x-hidden">
        {/* Search & Filter status banner */}
        {(searchQuery || dietFilter !== "ALL" || activeCategory) && (
          <div className="flex items-center justify-between mb-3 text-xs text-gray-600 bg-amber-50/70 border border-amber-200 px-3 py-1.5 rounded-lg">
            <span>
              Showing <strong>{filteredItems.length}</strong> {filteredItems.length === 1 ? "dish" : "dishes"}
              {searchQuery && <> matching &quot;<strong>{searchQuery}</strong>&quot;</>}
              {dietFilter !== "ALL" && <> ({dietFilter === "VEG" ? "Veg Only" : "Non-Veg Only"})</>}
            </span>
            <button
              onClick={() => {
                setSearchQuery("");
                setDietFilter("ALL");
                setActiveCategory(null);
              }}
              className="text-orange-600 font-bold uppercase tracking-wider hover:underline ml-2 flex-shrink-0"
            >
              Reset Filters
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton h-28 w-full" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-bold text-base text-brown-900 mb-1">
              No dishes found
            </p>
            <p
              className="text-xs max-w-xs mx-auto"
              style={{ color: "var(--color-text-muted)" }}
            >
              We couldn&apos;t find any items matching your current search or filters. Try clearing your search query or switching categories.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setDietFilter("ALL");
                setActiveCategory(null);
              }}
              className="mt-4 btn-secondary text-xs font-bold px-4 py-2 uppercase tracking-wider"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid gap-3 stagger-children">
            {filteredItems.map((item) => (
              <MenuCard
                key={item.id}
                item={item}
                cartQuantity={
                  cart.items.find((c) => c.menuItemId === item.id)?.quantity || 0
                }
                onAdd={cart.addItem}
                onUpdateQuantity={cart.updateQuantity}
              />
            ))}
          </div>
        )}
      </main>

      {/* Floating cart button (mobile) */}
      {(cart.totalItems > 0 || placedItemsCount > 0) && !showCart && (
        <div className="fixed bottom-4 left-4 right-4 z-40 md:hidden animate-slide-in-up">
          <button
            onClick={handleOpenCart}
            className="btn-primary w-full py-3.5 flex items-center justify-between"
            style={{
              fontSize: "1rem",
              borderRadius: "1rem",
              boxShadow: "0 8px 32px rgba(232, 137, 28, 0.35)",
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
    </div>
  );
}
