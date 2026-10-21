"use client";
import { useState, useRef, useCallback } from "react";
import {
  cartTotal,
  changeQuantity,
  reconcileCart,
} from "../lib/customerCart.mjs";
// Mounted under a restaurant/table/session key after the menu is loaded.
export function useCart(storageKey, menu) {
  const [initial] = useState(() => {
    try {
      return {
        items: reconcileCart(
          JSON.parse(sessionStorage.getItem(storageKey) || "[]"),
          menu,
        ),
        error: false,
      };
    } catch {
      return { items: [], error: true };
    }
  });
  const [items, setItems] = useState(initial.items);
  const [storageError, setStorageError] = useState(initial.error);
  const latest = useRef(initial.items);
  const commit = useCallback(
    (change) => {
      const next = change(latest.current);
      latest.current = next;
      setItems(next);
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        setStorageError(true);
      }
    },
    [storageKey],
  );
  const addItem = useCallback(
    (item) => {
      if (item.isAvailable === false) return;
      commit((previous) => {
        const existing = previous.find((row) => row.menuItemId === item.id);
        return existing
          ? changeQuantity(previous, item.id, existing.quantity + 1)
          : [
              ...previous,
              {
                menuItemId: item.id,
                name: item.name,
                price: Number(item.price),
                quantity: 1,
              },
            ];
      });
    },
    [commit],
  );
  const updateQuantity = useCallback(
    (id, quantity) =>
      commit((previous) => changeQuantity(previous, id, quantity)),
    [commit],
  );
  const removeItem = useCallback(
    (id) =>
      commit((previous) => previous.filter((item) => item.menuItemId !== id)),
    [commit],
  );
  const clearCart = useCallback(() => commit(() => []), [commit]);
  return {
    items,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    ready: true,
    storageError,
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice: cartTotal(items),
  };
}
