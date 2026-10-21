"use client";
import { X, Trash2 } from "lucide-react";
import QuantitySelector from "./customer/QuantitySelector";
import { useDialog } from "../hooks/useDialog";
import { cartTotal, money } from "../lib/customerCart.mjs";
import styles from "./customer/customer.module.css";
export default function CartDrawer({
  items = [],
  placedOrders = [],
  runningTotal = 0,
  tableCode,
  onUpdateQuantity,
  onRemove,
  onClose,
  onPlaceOrder,
  isOrdering,
  onViewOrders,
  error,
  blocked = false,
  onReview,
}) {
  const ref = useDialog(onClose);
  const subtotal = cartTotal(items);
  const placed = placedOrders.filter((order) => order.status !== "CANCELLED");
  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        className={styles.dialog}
      >
        <header className={styles.dialogHeader}>
          <div>
            <h2 id="cart-title">Your cart</h2>
            <p className={styles.status}>Table {tableCode}</p>
          </div>
          <button onClick={onClose} aria-label="Close cart">
            <X />
          </button>
        </header>
        <div className={styles.dialogBody}>
          {error && (
            <div role="alert" className={styles.notice}>
              {error}
              {blocked && onReview && (
                <>
                  <button onClick={onViewOrders}>Check placed orders</button>
                  <button onClick={onReview}>
                    Retry the same order safely
                  </button>
                </>
              )}
            </div>
          )}
          {!items.length && (
            <div className="py-6">
              <h3 className="font-bold">Your cart is empty</h3>
              <p className="my-2">
                Add something from the menu when you are ready.
              </p>
              <button className={styles.action} onClick={onClose}>
                Browse menu
              </button>
            </div>
          )}
          <fieldset disabled={isOrdering} aria-label="Cart items">
            {items.map((item) => (
              <div key={item.menuItemId} className={styles.cartRow}>
                <div className={styles.cartName}>
                  <h3>{item.name}</h3>
                  <p className={styles.meta}>
                    {money(item.price)} each × {item.quantity}
                  </p>
                  <p className="font-semibold">
                    {money(item.price * item.quantity)}
                  </p>
                </div>
                <div className={styles.cartActions}>
                  <QuantitySelector
                    quantity={item.quantity}
                    onIncrement={() =>
                      onUpdateQuantity(item.menuItemId, item.quantity + 1)
                    }
                    onDecrement={() =>
                      onUpdateQuantity(item.menuItemId, item.quantity - 1)
                    }
                    itemName={item.name}
                  />
                  <button
                    onClick={() => onRemove(item.menuItemId)}
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </fieldset>
          {!!placed.length && (
            <section className="mt-6">
              <h3 className="font-bold">
                Already ordered · {money(runningTotal)}
              </h3>
              <p className={styles.meta}>
                These items have already been sent. They will not be sent again.
              </p>
              {placed.map((order) => (
                <p key={order.id} className="text-sm mt-2">
                  Order #{order.orderNumber} ·{" "}
                  {order.items.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                  items · {order.status.toLowerCase()}
                </p>
              ))}
              <button
                onClick={onViewOrders}
                className="min-h-11 underline text-sm"
              >
                View orders and request bill
              </button>
            </section>
          )}
        </div>
        {!!items.length && (
          <footer className={styles.dialogFooter}>
            <div className={styles.totals}>
              <span>New items subtotal</span>
              <span>{money(subtotal)}</span>
            </div>
            <p className={`${styles.meta} mb-3`}>
              Prices are checked when you order. Ask staff about any final bill
              charges.
            </p>
            <button
              onClick={onPlaceOrder}
              disabled={isOrdering || blocked}
              className={`${styles.action} w-full`}
              aria-busy={isOrdering}
            >
              {isOrdering
                ? "Sending order…"
                : `Place order · ${money(subtotal)}`}
            </button>
          </footer>
        )}
      </section>
    </div>
  );
}
