"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BellRing, Droplets, Sparkles, UtensilsCrossed, Plus, Minus, X, Check } from "lucide-react";

const QUICK_PRESETS = [
  { key: "water", label: "Bring Water", toast: "💧 Water requested! A waiter is on the way.", Icon: Droplets },
  { key: "tissue", label: "Need Tissue", toast: "🧻 Tissue requested! A waiter is on the way.", Icon: Sparkles },
  { key: "cutlery", label: "Extra Cutlery", toast: null, Icon: UtensilsCrossed },
];

export default function ReminderButtons({ onSend, sending, tableCode = "" }) {
  const [showCutleryModal, setShowCutleryModal] = useState(false);
  const [cutlery, setCutlery] = useState({
    plates: 2,
    spoons: 2,
    forks: 0,
    bowls: 0,
  });

  const updateQuantity = (item, delta) => {
    setCutlery((prev) => ({
      ...prev,
      [item]: Math.max(0, Math.min(20, (prev[item] || 0) + delta)),
    }));
  };

  const setCombo = (combo) => {
    setCutlery({
      plates: combo.plates ?? 0,
      spoons: combo.spoons ?? 0,
      forks: combo.forks ?? 0,
      bowls: combo.bowls ?? 0,
    });
  };

  const totalCutleryCount = cutlery.plates + cutlery.spoons + cutlery.forks + cutlery.bowls;

  const handleCutlerySubmit = () => {
    if (totalCutleryCount === 0) return;

    const parts = [];
    if (cutlery.plates > 0) parts.push(`${cutlery.plates} Plate${cutlery.plates > 1 ? "s" : ""}`);
    if (cutlery.spoons > 0) parts.push(`${cutlery.spoons} Spoon${cutlery.spoons > 1 ? "s" : ""}`);
    if (cutlery.forks > 0) parts.push(`${cutlery.forks} Fork${cutlery.forks > 1 ? "s" : ""}`);
    if (cutlery.bowls > 0) parts.push(`${cutlery.bowls} Bowl${cutlery.bowls > 1 ? "s" : ""}`);

    const summary = parts.join(", ");
    const toastMsg = `🍽️ Extra Cutlery requested: ${summary}! A waiter is on the way.`;
    const waiterMsg = tableCode
      ? `Table ${tableCode} requested: Extra Cutlery (${summary})`
      : `Table requested: Extra Cutlery (${summary})`;

    onSend(toastMsg, {
      type: "cutlery",
      items: cutlery,
      summary,
      waiterMessage: waiterMsg,
    });

    setShowCutleryModal(false);
  };

  const handlePresetClick = (preset) => {
    if (preset.key === "cutlery") {
      setShowCutleryModal(true);
    } else {
      onSend(preset.toast);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          {QUICK_PRESETS.map(({ key, label, Icon }) => (
            <motion.button
              key={key}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePresetClick({ key, label, Icon, toast: QUICK_PRESETS.find((p) => p.key === key)?.toast })}
              disabled={sending}
              className="flex flex-col items-center justify-center gap-1 py-3 px-1 text-center transition-colors rounded-xl border disabled:opacity-50 hover:bg-cream-200"
              style={{
                borderColor: "var(--color-border-light)",
                background: "var(--color-cream-100)",
                color: "var(--color-brown-900)",
              }}
            >
              <Icon size={16} className="text-orange-600" />
              <span className="text-[10px] font-bold uppercase tracking-wide leading-tight">{label}</span>
            </motion.button>
          ))}
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => onSend("🔔 Waiter has been called! They'll be with you shortly.")}
          disabled={sending}
          className="w-full py-3.5 text-sm font-black uppercase tracking-widest border-2 flex items-center justify-center gap-2 transition-all rounded-xl shadow-sm hover:shadow"
          style={{
            borderColor: sending ? "var(--color-text-muted)" : "#F59E0B",
            color: sending ? "var(--color-text-muted)" : "#92400E",
            background: sending ? "var(--color-cream-100)" : "#FEF3C7",
          }}
        >
          <BellRing size={18} />
          {sending ? "WAITER CALLED ✓" : "CALL WAITER"}
        </motion.button>
      </div>

      {/* ── EXTRA CUTLERY MODAL ── */}
      <AnimatePresence>
        {showCutleryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border flex flex-col gap-5 overflow-hidden"
              style={{ borderColor: "var(--color-border-light)" }}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-orange-100 text-orange-600">
                    <UtensilsCrossed size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-brown-900" style={{ fontFamily: "var(--font-heading)" }}>
                      Extra Cutlery
                    </h3>
                    <p className="text-xs text-neutral-500">Select what you need for your table</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCutleryModal(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Quick Combos */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setCombo({ plates: 2, spoons: 2 })}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border bg-cream-50 hover:bg-cream-100 text-brown-900 transition-colors"
                  style={{ borderColor: "var(--color-border-light)" }}
                >
                  2 Plates + 2 Spoons
                </button>
                <button
                  type="button"
                  onClick={() => setCombo({ plates: 4, spoons: 4 })}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border bg-cream-50 hover:bg-cream-100 text-brown-900 transition-colors"
                  style={{ borderColor: "var(--color-border-light)" }}
                >
                  4 Plates + 4 Spoons
                </button>
                <button
                  type="button"
                  onClick={() => setCombo({ plates: 2, spoons: 0 })}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border bg-cream-50 hover:bg-cream-100 text-brown-900 transition-colors"
                  style={{ borderColor: "var(--color-border-light)" }}
                >
                  Only Plates (2)
                </button>
                <button
                  type="button"
                  onClick={() => setCombo({ plates: 0, spoons: 2 })}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border bg-cream-50 hover:bg-cream-100 text-brown-900 transition-colors"
                  style={{ borderColor: "var(--color-border-light)" }}
                >
                  Only Spoons (2)
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-3 divide-y divide-neutral-100">
                {/* Plates */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">🍽️</span>
                    <div>
                      <p className="font-bold text-sm text-brown-900">Plates</p>
                      <p className="text-[11px] text-neutral-400">Dinner / side plates</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuantity("plates", -1)}
                      disabled={cutlery.plates <= 0}
                      className="w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-neutral-700 disabled:opacity-30 hover:bg-neutral-100 transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-7 text-center font-black text-base text-brown-900">
                      {cutlery.plates}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity("plates", 1)}
                      className="w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-orange-600 border-orange-200 hover:bg-orange-50 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Spoons */}
                <div className="flex items-center justify-between pt-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">🥄</span>
                    <div>
                      <p className="font-bold text-sm text-brown-900">Spoons</p>
                      <p className="text-[11px] text-neutral-400">Table & dessert spoons</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuantity("spoons", -1)}
                      disabled={cutlery.spoons <= 0}
                      className="w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-neutral-700 disabled:opacity-30 hover:bg-neutral-100 transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-7 text-center font-black text-base text-brown-900">
                      {cutlery.spoons}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity("spoons", 1)}
                      className="w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-orange-600 border-orange-200 hover:bg-orange-50 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Forks */}
                <div className="flex items-center justify-between pt-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">🍴</span>
                    <div>
                      <p className="font-bold text-sm text-brown-900">Forks</p>
                      <p className="text-[11px] text-neutral-400">Dinner forks</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuantity("forks", -1)}
                      disabled={cutlery.forks <= 0}
                      className="w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-neutral-700 disabled:opacity-30 hover:bg-neutral-100 transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-7 text-center font-black text-base text-brown-900">
                      {cutlery.forks}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity("forks", 1)}
                      className="w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-orange-600 border-orange-200 hover:bg-orange-50 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Bowls */}
                <div className="flex items-center justify-between pt-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">🥣</span>
                    <div>
                      <p className="font-bold text-sm text-brown-900">Small Bowls</p>
                      <p className="text-[11px] text-neutral-400">Curry / dessert katoris</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuantity("bowls", -1)}
                      disabled={cutlery.bowls <= 0}
                      className="w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-neutral-700 disabled:opacity-30 hover:bg-neutral-100 transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-7 text-center font-black text-base text-brown-900">
                      {cutlery.bowls}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity("bowls", 1)}
                      className="w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-orange-600 border-orange-200 hover:bg-orange-50 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer CTA */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCutleryModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl border text-xs font-bold uppercase tracking-wider text-neutral-600 hover:bg-neutral-100 transition-colors"
                  style={{ borderColor: "var(--color-border-light)" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCutlerySubmit}
                  disabled={totalCutleryCount === 0 || sending}
                  className="flex-[2] py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-40"
                  style={{ background: "var(--color-orange-500, #E8891C)" }}
                >
                  <Check size={16} /> Request Cutlery ({totalCutleryCount})
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
