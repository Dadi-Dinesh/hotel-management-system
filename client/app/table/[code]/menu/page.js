"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import api from "../../../lib/api";
import Navbar from "../../../components/Navbar";
import MenuCard from "../../../components/MenuCard";
import CategoryTabs from "../../../components/CategoryTabs";
import CartDrawer from "../../../components/CartDrawer";
import { useCart } from "../../../hooks/useCart";
import toast from "react-hot-toast";

export default function MenuPage() {
  const params = useParams();
  const router = useRouter();
  const tableCode = params.code?.toUpperCase();

  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);

  const cart = useCart();

  useEffect(() => {
    fetchMenu();
  }, []);

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

  // Get all items, optionally filtered by category
  const allItems = menu.flatMap((cat) =>
    cat.items.map((item) => ({ ...item, category: { id: cat.id, name: cat.name } }))
  );
  const filteredItems = activeCategory
    ? allItems.filter((item) => item.category.id === activeCategory)
    : allItems;

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
      router.push(`/table/${tableCode}/orders`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to place order");
    } finally {
      setIsOrdering(false);
    }
  };

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
            onClick={() => setShowCart(true)}
            className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all"
            style={{
              background: cart.totalItems > 0 ? "var(--color-orange-500)" : "var(--color-cream-100)",
              color: cart.totalItems > 0 ? "white" : "var(--color-brown-800)",
              border: cart.totalItems > 0 ? "none" : "1px solid var(--color-cream-200)",
            }}
          >
            <ShoppingBag size={18} />
            {cart.totalItems > 0 && (
              <span className="text-sm font-bold">
                {cart.totalItems} · ₹{cart.totalPrice}
              </span>
            )}
          </button>
        }
      />

      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        onSelect={setActiveCategory}
      />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton h-28 w-full" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🍽️</p>
            <p
              className="font-medium"
              style={{ color: "var(--color-text-muted)" }}
            >
              No items in this category
            </p>
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
      {cart.totalItems > 0 && !showCart && (
        <div className="fixed bottom-4 left-4 right-4 z-40 md:hidden animate-slide-in-up">
          <button
            onClick={() => setShowCart(true)}
            className="btn-primary w-full py-3.5 flex items-center justify-between"
            style={{
              fontSize: "1rem",
              borderRadius: "1rem",
              boxShadow: "0 8px 32px rgba(232, 137, 28, 0.35)",
            }}
          >
            <span className="flex items-center gap-2">
              <ShoppingBag size={20} />
              {cart.totalItems} item{cart.totalItems > 1 ? "s" : ""}
            </span>
            <span className="font-bold">₹{cart.totalPrice} →</span>
          </button>
        </div>
      )}

      {/* Cart Drawer */}
      {showCart && (
        <CartDrawer
          items={cart.items}
          onUpdateQuantity={cart.updateQuantity}
          onRemove={cart.removeItem}
          onClose={() => setShowCart(false)}
          onPlaceOrder={handlePlaceOrder}
          isOrdering={isOrdering}
        />
      )}
    </div>
  );
}
