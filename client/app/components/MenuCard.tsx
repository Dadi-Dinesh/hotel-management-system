"use client";
import { useState } from "react";
import MenuItemImage from "./MenuItemImage";
import FoodDetailModal from "./FoodDetailModal";
import QuantitySelector from "./customer/QuantitySelector";
import { isDietFilterApplicable } from "../lib/menuCategoryType";
import { money } from "../lib/customerCart.mjs";
import { MenuItem } from "../types";
import styles from "./customer/customer.module.css";
interface Props {
  item: MenuItem;
  cartQuantity: number;
  onAdd: (item: MenuItem) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
}
export default function MenuCard({
  item,
  cartQuantity,
  onAdd,
  onUpdateQuantity,
}: Props) {
  const [detail, setDetail] = useState(false);
  const [quantity, setQuantity] = useState("");
  const quantityItem = /roti|pulka|phulka|chapati|naan|paratha/i.test(
    item.name,
  );
  const unavailable = item.isAvailable === false;
  const food = isDietFilterApplicable(item.category?.name);
  const applyQuantity = () => {
    const amount = Number(quantity);
    if (unavailable || !Number.isSafeInteger(amount) || amount < 1) return;
    if (!cartQuantity) onAdd(item);
    onUpdateQuantity(item.id, amount);
    setQuantity("");
  };
  return (
    <article className={styles.card} aria-label={item.name}>
      <div className={styles.cardTop}>
        <MenuItemImage
          src={item.imageUrl || item.image}
          alt={item.name}
          onClick={() => setDetail(true)}
        />
        <div className={styles.cardInfo}>
          <p className={styles.meta}>{item.category?.name}</p>
          <button className={styles.name} onClick={() => setDetail(true)}>
            {item.name}
          </button>
          {food && (
            <p className={styles.meta}>
              {item.isVeg ? "● Vegetarian" : "▲ Non-vegetarian"}
            </p>
          )}
          {item.servingInformation && (
            <p className={styles.meta}>{item.servingInformation}</p>
          )}
        </div>
      </div>
      <div className={styles.cardBottom}>
        <span className={styles.price}>{money(item.price)}</span>
        {unavailable ? (
          <span className={styles.meta}>Currently unavailable</span>
        ) : cartQuantity > 0 ? (
          <QuantitySelector
            quantity={cartQuantity}
            onIncrement={() => onUpdateQuantity(item.id, cartQuantity + 1)}
            onDecrement={() => onUpdateQuantity(item.id, cartQuantity - 1)}
            itemName={item.name}
          />
        ) : (
          <QuantitySelector
            onAdd={() => onAdd(item)}
            addLabel="Add"
            itemName={item.name}
          />
        )}
      </div>
      {quantityItem && !unavailable && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            applyQuantity();
          }}
          className="flex gap-2 items-center"
        >
          <input
            className={styles.quantityInput}
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            aria-label={`Set quantity for ${item.name}`}
            placeholder="Qty"
          />
          <button
            type="submit"
            className="text-sm underline min-h-11"
            disabled={
              !Number.isSafeInteger(Number(quantity)) || Number(quantity) < 1
            }
          >
            Set quantity
          </button>
        </form>
      )}
      {detail && (
        <FoodDetailModal
          item={item}
          cartQuantity={cartQuantity}
          onClose={() => setDetail(false)}
          onAdd={onAdd}
          onUpdateQuantity={onUpdateQuantity}
        />
      )}
    </article>
  );
}
