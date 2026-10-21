"use client";
import { X } from "lucide-react";
import MenuItemImage from "./MenuItemImage";
import QuantitySelector from "./customer/QuantitySelector";
import { useDialog } from "../hooks/useDialog";
import { money } from "../lib/customerCart.mjs";
import { isDietFilterApplicable } from "../lib/menuCategoryType";
import { MenuItem } from "../types";
import styles from "./customer/customer.module.css";
interface Props {
  item: MenuItem;
  cartQuantity: number;
  onClose: () => void;
  onAdd: (item: MenuItem) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
}
export default function FoodDetailModal({
  item,
  cartQuantity,
  onClose,
  onAdd,
  onUpdateQuantity,
}: Props) {
  const ref = useDialog(onClose);
  const food = isDietFilterApplicable(item.category?.name);
  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-detail-title"
        tabIndex={-1}
        className={styles.dialog}
      >
        <header className={styles.dialogHeader}>
          <h2 id="item-detail-title">{item.name}</h2>
          <button onClick={onClose} aria-label="Close item details">
            <X />
          </button>
        </header>
        <div className={styles.dialogBody}>
          <MenuItemImage src={item.imageUrl || item.image} alt={item.name} />
          <p className="mt-4 text-sm">{item.category?.name}</p>
          <p className="font-bold my-3">{money(item.price)}</p>
          {food && (
            <p>
              {item.isVeg ? "Vegetarian" : "Non-vegetarian"}
              {item.spiceLevel ? ` · ${item.spiceLevel}` : ""}
            </p>
          )}
          {item.servingInformation && (
            <p className="my-3">{item.servingInformation}</p>
          )}
          {item.calories != null && <p>{item.calories} kcal</p>}
          {item.description && (
            <p className="my-4 leading-relaxed">{item.description}</p>
          )}
        </div>
        <footer className={styles.dialogFooter}>
          {item.isAvailable === false ? (
            <p>Currently unavailable</p>
          ) : (
            <QuantitySelector
              quantity={cartQuantity}
              onAdd={() => onAdd(item)}
              onIncrement={() => onUpdateQuantity(item.id, cartQuantity + 1)}
              onDecrement={() => onUpdateQuantity(item.id, cartQuantity - 1)}
              itemName={item.name}
              fullWidthAdd
            />
          )}
        </footer>
      </section>
    </div>
  );
}
