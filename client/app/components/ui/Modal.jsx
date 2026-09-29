"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Design-system modal — centered, backdrop blur, ESC + outside-click to
 * close, and a manual focus trap (no extra dependency): focus moves into
 * the dialog on open, Tab/Shift+Tab wrap within it, and focus returns to
 * whatever triggered the modal on close.
 */
export default function Modal({ open, onClose, title, children, maxWidth = "max-w-md", labelledBy }) {
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);
  const shouldReduceMotion = useReducedMotion();
  const titleId = labelledBy || (title ? "ss-modal-title" : undefined);

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;
    const dialog = dialogRef.current;
    const focusFirst = () => {
      const first = dialog?.querySelector(FOCUSABLE_SELECTOR);
      (first || dialog)?.focus();
    };
    // Wait a tick so the entrance animation's initial render has mounted.
    const t = setTimeout(focusFirst, 0);

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
        return;
      }
      if (e.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <div
            className="absolute inset-0"
            style={{ background: "rgba(59, 34, 10, 0.5)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            className={`relative w-full ${maxWidth} max-h-[90vh] overflow-y-auto rounded-[var(--ss-radius-modal)] focus:outline-none`}
            style={{ background: "var(--ss-surface)", boxShadow: "var(--ss-shadow-lg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {title && (
              <div className="flex items-center justify-between p-5 sm:p-6 border-b" style={{ borderColor: "var(--ss-border)" }}>
                <h3 id={titleId} className="ss-h3" style={{ marginBottom: 0 }}>
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  aria-label="Close dialog"
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--ss-bg)", color: "var(--ss-primary)" }}
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <div className={title ? "p-5 sm:p-6" : ""}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
