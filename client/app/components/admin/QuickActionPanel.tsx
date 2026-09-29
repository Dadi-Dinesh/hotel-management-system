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
    <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-40 flex flex-col items-end gap-2">
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
                    className="flex items-center gap-2 pl-3 pr-3.5 py-2 rounded-full ss-caption font-bold whitespace-nowrap hover:scale-105 transition-transform"
                    style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)", color: "var(--ss-primary)", boxShadow: "var(--ss-shadow-md)" }}
                  >
                    <Icon size={14} style={{ color: "var(--ss-accent-dark)" }} />
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
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{ background: "var(--ss-accent)", color: "var(--ss-on-accent)", boxShadow: "var(--ss-shadow-lg)" }}
        animate={{ rotate: open ? 45 : 0 }}
        transition={{ duration: 0.2 }}
      >
        {open ? <X size={20} /> : <Plus size={20} />}
      </motion.button>
    </div>
  );
}
