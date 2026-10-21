"use client";
import { readOrderAttempt, createOrderAttempt } from "../../lib/orderAttempt.mjs";
import { customerJoinPayload } from "../../lib/customerAccess";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "../../lib/api";
import { customerPaths, loadCustomerContext } from "../../lib/customerContext";
import { isDietFilterApplicable } from "../../lib/menuCategoryType";
import { money } from "../../lib/customerCart.mjs";
import { useCart } from "../../hooks/useCart";
import { useSocket } from "../SocketProvider";
import StickyHeader from "./StickyHeader";
import MenuCard from "../MenuCard";
import CategoryTabs from "../CategoryTabs";
import CartDrawer from "../CartDrawer";
import styles from "./customer.module.css";
import toast from "react-hot-toast";

export default function CustomerMenu() {
  const { slug, code } = useParams();
  return (
    <MenuLoader key={`${slug || "demo"}:${code}`} slug={slug} code={code} />
  );
}
function MenuLoader({ slug, code }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const paths = customerPaths(slug, code);
  useEffect(() => {
    let current = true;
    Promise.all([
      loadCustomerContext(slug, code),
      api.get(
        slug ? `/restaurants/${encodeURIComponent(slug)}/menu` : "/menu",
        { timeout: 12000 },
      ),
    ])
      .then(([context, response]) => {
        if (current) setData({ ...context, menu: response.data.data });
      })
      .catch((error) => {
        if (current)
          setError(
            error.response?.data?.message ||
              error.message ||
              "The menu could not be loaded.",
          );
      });
    return () => {
      current = false;
    };
  }, [slug, code, attempt]);
  if (!data)
    return (
      <div className={styles.page}>
        <StickyHeader title="Restaurant menu" tableCode={paths.tableCode} />
        <main className={styles.main}>
          <div className={styles.notice} role={error ? "alert" : "status"}>
            <h2 className="font-bold">
              {error
                ? "We couldn’t load your table and menu"
                : "Loading your restaurant and menu…"}
            </h2>
            {error && (
              <>
                <p>{error}</p>
                <button
                  onClick={() => {
                    setError("");
                    setAttempt((value) => value + 1);
                  }}
                >
                  Try again
                </button>
                <Link href={paths.base}>Return to table</Link>
                <p>
                  Check the QR code on your table if the restaurant or table is
                  incorrect.
                </p>
              </>
            )}
          </div>
        </main>
      </div>
    );
  return (
    <MenuContent
      key={`${data.restaurant.id}:${data.table.id}:${data.session?.id || "no-session"}`}
      context={data}
      slug={slug}
    />
  );
}
function MenuContent({ context, slug }) {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const searchRef = useRef(null);
  const submitting = useRef(false);
  const [seat] = useState(() =>
    !slug ? localStorage.getItem(`seat-${context.tableCode}`) || "" : "",
  );
  const [session, setSession] = useState(context.session);
  const [sessionError, setSessionError] = useState("");
  const [category, setCategory] = useState(null);
  const [diet, setDiet] = useState("ALL");
  const [search, setSearch] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [ordering, setOrdering] = useState(false);

  const { restaurant, table, base, tableCode } = context;
  const menu = useMemo(
    () =>
      context.menu.flatMap((cat) =>
        cat.items.map((item) => ({
          ...item,
          category: { id: cat.id, name: cat.name },
        })),
      ),
    [context.menu],
  );
  const cartKey = `servesync-cart:${restaurant.id}:${table.id}:${context.session?.id || "browse"}`;
  const pendingKey = `${cartKey}:pending`;
  const cart = useCart(cartKey, menu);
  const [uncertain, setUncertain] = useState(() => {
    try {
      return Boolean(sessionStorage.getItem(pendingKey));
    } catch {
      return false;
    }
  });
  const [orderError, setOrderError] = useState(
    uncertain
      ? "An earlier order has no confirmed result on this device. Check your orders or ask staff before sending again."
      : "",
  );
  const fetchSession = useCallback(async () => {
    if (!context.session) return;
    try {
      const response = await api.get(`/sessions/${context.session.id}`, {
        timeout: 12000,
      });
      const next = response.data.data;
      if (next.restaurantId !== restaurant.id || next.tableId !== table.id)
        throw new Error(
          "This session no longer matches your table. Please scan the QR again.",
        );
      if (next.status === "CLOSED") {
        router.replace(`${base}/thank-you`);
        return;
      }
      setSession(next);
      setSessionError("");
    } catch (error) {
      setSessionError(
        error.response?.data?.message ||
          "Order updates could not be loaded. Your last view may be out of date.",
      );
    }
  }, [context.session, restaurant.id, table.id, base, router]);
  useEffect(() => {
    if (!socket || !session?.id) return;
    const join = () => {
      socket.emit(
        "join-table",
        customerJoinPayload(slug, tableCode),
      );
      fetchSession();
    };
    // Re-fetch the scoped session rather than trusting data from a socket event.
    if (socket.connected) join();
    socket.on("connect", join);
    window.addEventListener("customer-access-updated", join);
    const events = [
      "order-accepted",
      "order-status-update",
      "item-served",
      "session-closed",
    ];
    events.forEach((event) => socket.on(event, fetchSession));
    return () => {
      socket.off("connect", join);
      window.removeEventListener("customer-access-updated", join);
      events.forEach((event) => socket.off(event, fetchSession));
    };
  }, [socket, slug, tableCode, session?.id, fetchSession]);
  const categories = context.menu
    .filter((cat) => cat.items.length)
    .map((cat) => ({ id: cat.id, name: cat.name }));
  const categoryName = categories.find((cat) => cat.id === category)?.name;
  const dietVisible = category
    ? isDietFilterApplicable(categoryName)
    : categories.some((cat) => isDietFilterApplicable(cat.name));
  const filtered = menu.filter(
    (item) =>
      (!category || item.category.id === category) &&
      (!isDietFilterApplicable(item.category.name) ||
        diet === "ALL" ||
        (diet === "VEG" ? item.isVeg : !item.isVeg)) &&
      `${item.name} ${item.category.name} ${item.description || ""}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  const reset = () => {
    setSearch("");
    setCategory(null);
    setDiet("ALL");
  };
  const placeOrder = async (retryRequested = false) => {
    const retry = retryRequested === true;
    if (submitting.current || (uncertain && !retry) || (!retry && !cart.items.length) || !session)
      return;
    submitting.current = true;
    setOrdering(true);
    setOrderError("");
    try {
      if (!navigator.onLine)
        throw new Error(
          "You are offline. Your cart is saved; reconnect before placing your order.",
        );
      let attempt;
      if (retry) {
        attempt = readOrderAttempt(sessionStorage, pendingKey);
        if (!attempt || attempt.sessionId !== session.id) throw new Error("This older request cannot be retried safely. Please check placed orders with staff.");
      } else {
        const verified = await loadCustomerContext(slug, tableCode);
        if (verified.session?.id !== session.id) throw new Error("Your table session has changed. Scan again before ordering.");
        attempt = createOrderAttempt(sessionStorage, pendingKey, session.id, cart.items, () => crypto.randomUUID());
      }
      let response;
      try {
        response = await api.post(
          "/orders",
          {
            sessionId: attempt.sessionId,
            items: attempt.items,
          },
          { timeout: 20000, headers: { "Idempotency-Key": attempt.key } },
        );
      } catch (error) {
        if (retry || !error.response || error.response.status >= 500 || error.response.status === 409) {
          setUncertain(true);
          throw new Error(
            "This order needs confirmation. Retry the same request safely or check placed orders with staff.",
          );
        }
        try {
          sessionStorage.removeItem(pendingKey);
        } catch {}
        throw error;
      }
      try {
        sessionStorage.removeItem(pendingKey);
      } catch {}
      cart.clearCart();
      setShowCart(false);
      toast.success(
        `Order #${response.data.data.orderNumber} sent. Follow its progress here.`,
      );
      router.push(`${base}/orders`);
    } catch (error) {
      setOrderError(
        error.response?.data?.message ||
          error.message ||
          "Could not place order. Your cart has been kept.",
      );
    } finally {
      submitting.current = false;
      setOrdering(false);
    }
  };
  const resetUncertain = () => placeOrder(true);
  return (
    <div className={styles.page}>
      <StickyHeader
        title={restaurant.shortName || restaurant.name}
        logoSrc={restaurant.logo}
        tableCode={seat ? `${tableCode} · Seat ${seat}` : tableCode}
        onSearchClick={() => searchRef.current?.focus()}
        onCartClick={() => setShowCart(true)}
        cartCount={cart.totalItems}
        cartLabel={cart.totalItems ? money(cart.totalPrice) : undefined}
      />
      <CategoryTabs
        categories={categories}
        activeCategory={category}
        onSelect={(id) => {
          setCategory(id);
          if (
            id &&
            !isDietFilterApplicable(
              categories.find((cat) => cat.id === id)?.name,
            )
          )
            setDiet("ALL");
        }}
        dietFilter={diet}
        onDietChange={setDiet}
        dietFilterVisible={dietVisible}
        searchQuery={search}
        onSearchChange={setSearch}
        searchInputRef={searchRef}
      />
      <main className={styles.main}>
        {!session && (
          <div className={styles.notice}>
            <p>Start your table session before placing an order.</p>
            <Link href={base}>Return to table</Link>
          </div>
        )}
        {session && !isConnected && (
          <div className={styles.notice} role="status">
            Live updates are reconnecting. You can check your orders manually.
            <button onClick={fetchSession}>Refresh orders</button>
          </div>
        )}
        {sessionError && (
          <div role="alert" className={styles.notice}>
            {sessionError}
            <button onClick={fetchSession}>Retry</button>
          </div>
        )}
        {cart.storageError && (
          <p role="status" className={styles.notice}>
            Browser storage is unavailable. Keep this page open to retain your
            cart.
          </p>
        )}
        {orderError && !showCart && (
          <div role="alert" className={styles.notice}>
            {orderError}
            <button onClick={() => setShowCart(true)}>Review cart</button>
          </div>
        )}
        <div className={styles.toolbar}>
          <p role="status" className="text-sm">
            {filtered.length} menu items
          </p>
          <div className="flex gap-4 flex-wrap">
            {(search || category || diet !== "ALL") && (
              <button onClick={reset} className="min-h-11 text-sm underline">
                Clear filters
              </button>
            )}
            {session && (
              <Link
                className="min-h-11 py-3 text-sm underline"
                href={`${base}/orders`}
              >
                Your orders &amp; bill
              </Link>
            )}
          </div>
        </div>
        {!filtered.length ? (
          <div className={styles.notice}>
            <h2 className="font-bold">
              {menu.length
                ? "No matching items"
                : "The menu is not available yet"}
            </h2>
            <p>
              {menu.length
                ? "Try another search or category."
                : "Please ask a member of staff for help."}
            </p>
            {menu.length > 0 && <button onClick={reset}>Clear filters</button>}
          </div>
        ) : (
          <div className={styles.grid}>
            {filtered.map((item) => (
              <MenuCard
                key={item.id}
                item={item}
                cartQuantity={
                  cart.items.find((row) => row.menuItemId === item.id)
                    ?.quantity || 0
                }
                onAdd={cart.addItem}
                onUpdateQuantity={cart.updateQuantity}
              />
            ))}
          </div>
        )}
      </main>
      {!!cart.totalItems && !showCart && (
        <div className={styles.bottomBar}>
          <button onClick={() => setShowCart(true)}>
            <span>View cart · {cart.totalItems} items</span>
            <span>{money(cart.totalPrice)}</span>
          </button>
        </div>
      )}
      {showCart && (
        <CartDrawer
          items={cart.items}
          placedOrders={session?.orders || []}
          runningTotal={session?.runningTotal || 0}
          tableCode={tableCode}
          onUpdateQuantity={cart.updateQuantity}
          onRemove={cart.removeItem}
          onClose={() => {
            if (!ordering) setShowCart(false);
          }}
          onPlaceOrder={placeOrder}
          isOrdering={ordering}
          onViewOrders={() => router.push(`${base}/orders`)}
          error={
            !session ? "Start your table session before ordering." : orderError
          }
          blocked={uncertain || !session}
          onReview={uncertain ? resetUncertain : undefined}
        />
      )}
    </div>
  );
}
