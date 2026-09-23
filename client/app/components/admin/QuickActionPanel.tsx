"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, UtensilsCrossed, Tag, Users, ChefHat, FileBarChart, Sliders } from "lucide-react";

const ACTIONS = [
  { href: "/admin/menu", icon: UtensilsCrossed, label: "Add Menu Item" },
  { href: "/admin/offers", icon: Tag, label: "Create Offer" },
  { href: "/admin/captains", icon: Users, label: "Manage Waiters" },
  { href: "/kitchen", icon: ChefHat, label: "View Kitchen" },
  { href: "/admin/reports", icon: FileBarChart, label: "Generate Report" },
  { href: "/admin/tables", icon: Sliders, label: "Table Management" },
];

export default function QuickActionPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2.5">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15, staggerChildren: 0.03 }}
            className="flex flex-col items-end gap-2 mb-1"
          >
            {ACTIONS.map((action, i) => {
              const Icon = action.icon;
              return (
                <motion.div
                  key={action.href}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link
                    href={action.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 pl-3.5 pr-4 py-2.5 rounded-full shadow-lg border text-xs font-bold whitespace-nowrap hover:scale-105 transition-transform"
                    style={{ background: "var(--color-surface)", borderColor: "var(--color-border-light)", color: "var(--color-brown-900)" }}
                  >
                    <Icon size={15} style={{ color: "var(--color-orange-500)" }} />
                    {action.label}
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close quick actions" : "Open quick actions"}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl text-white"
        style={{ background: "var(--color-orange-500)" }}
        animate={{ rotate: open ? 45 : 0 }}
        transition={{ duration: 0.2 }}
      >
        {open ? <X size={22} /> : <Plus size={22} />}
      </motion.button>
    </div>
  );
}
