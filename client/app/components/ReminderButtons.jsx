"use client";
import { useState } from "react";
import { X, Minus, Plus } from "lucide-react";
import { useDialog } from "../hooks/useDialog";
import styles from "./customer/customer.module.css";
const supplies = [
  ["plates", "Plates"],
  ["spoons", "Spoons"],
  ["forks", "Forks"],
  ["bowls", "Small bowls"],
];
export default function ReminderButtons({ onSend, sending, tableCode = "" }) {
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState({
    plates: 0,
    spoons: 0,
    forks: 0,
    bowls: 0,
  });
  const ref = useDialog(() => setOpen(false), open);
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const update = (key, delta) =>
    setCounts((previous) => ({
      ...previous,
      [key]: Math.min(20, Math.max(0, previous[key] + delta)),
    }));
  const request = async () => {
    const summary = supplies
      .filter(([key]) => counts[key] > 0)
      .map(([key, label]) => `${counts[key]} ${label.toLowerCase()}`)
      .join(", ");
    const sent = await onSend("Cutlery request sent to staff.", {
      message: `Table ${tableCode} requested: Extra Cutlery (${summary})`,
      details: { type: "cutlery", items: counts, summary },
    });
    if (sent !== false) setOpen(false);
  };
  return (
    <section aria-label="Request table assistance" className="space-y-2">
      <p className="text-sm font-semibold">Need something for your table?</p>
      <div className="flex flex-wrap gap-2">
        {[
          ["Water", "Water request sent to staff."],
          ["Tissues / napkins", "Tissue request sent to staff."],
        ].map(([label, message]) => (
          <button
            key={label}
            disabled={sending}
            className="min-h-11 border rounded-xl px-3 text-sm"
            onClick={() =>
              onSend(message, {
                message: `Table ${tableCode} requested: ${label}`,
              })
            }
          >
            {label}
          </button>
        ))}
        <button
          disabled={sending}
          className="min-h-11 border rounded-xl px-3 text-sm"
          onClick={() => setOpen(true)}
        >
          Extra cutlery
        </button>
        <button
          disabled={sending}
          className="min-h-11 border rounded-xl px-3 text-sm"
          onClick={() => onSend("Assistance request sent to staff.")}
        >
          {sending ? "Please wait…" : "Call waiter"}
        </button>
      </div>
      {open && (
        <div className={styles.overlay}>
          <section
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby="supplies-title"
            tabIndex={-1}
            className={styles.dialog}
          >
            <header className={styles.dialogHeader}>
              <h2 id="supplies-title">Extra cutlery</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close cutlery request"
              >
                <X />
              </button>
            </header>
            <div className={styles.dialogBody}>
              <p className="text-sm mb-4">
                Choose optional supplies. This sends a request to staff,
                separate from your food order.
              </p>
              {supplies.map(([key, label]) => (
                <div key={key} className={styles.cartRow}>
                  <span className="flex-1">{label}</span>
                  <div className="flex items-center gap-3">
                    <button
                      className="w-11 h-11 border rounded-xl flex justify-center items-center"
                      aria-label={`Fewer ${label.toLowerCase()}`}
                      disabled={counts[key] === 0}
                      onClick={() => update(key, -1)}
                    >
                      <Minus size={16} />
                    </button>
                    <span aria-live="polite">{counts[key]}</span>
                    <button
                      className="w-11 h-11 border rounded-xl flex justify-center items-center"
                      aria-label={`More ${label.toLowerCase()}`}
                      disabled={counts[key] === 20}
                      onClick={() => update(key, 1)}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <footer className={styles.dialogFooter}>
              <button
                className={`${styles.action} w-full`}
                disabled={!total || sending}
                onClick={request}
              >
                Send request · {total} items
              </button>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}
