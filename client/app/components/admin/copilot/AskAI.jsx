"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { askAI } from "../../../lib/insights/useAICopilot";
import toast from "react-hot-toast";

const SUGGESTIONS = ["Show today's revenue", "Which item sold the most this week?", "How many orders came after 8 PM?", "Which table generated the highest revenue this month?"];

/** Admin-only natural-language question box — answers come from real
 * database queries only (see server/src/services/insights/askAI.js);
 * never a call to an external AI/LLM service. */
export default function AskAI() {
  const shouldReduceMotion = useReducedMotion();
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState([]);
  const [asking, setAsking] = useState(false);
  const inputRef = useRef(null);

  const handleAsk = async (q) => {
    const text = (q ?? question).trim();
    if (!text || asking) return;
    setAsking(true);
    setQuestion("");
    try {
      const result = await askAI(text);
      setHistory((prev) => [{ question: text, ...result }, ...prev].slice(0, 10));
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't reach the AI Copilot right now.");
    } finally {
      setAsking(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="rounded-2xl p-5 border" style={{ borderColor: "var(--color-border-light)", background: "var(--color-surface)" }}>
      <h3 className="text-sm font-black uppercase tracking-wide mb-1 flex items-center gap-2" style={{ color: "var(--color-brown-900)" }}>
        <Sparkles size={15} style={{ color: "var(--color-orange-500)" }} /> Ask AI
      </h3>
      <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
        Ask about revenue, top items, orders, or tables — answered directly from your restaurant&apos;s data.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk();
        }}
        className="flex gap-2 mb-3"
      >
        <input
          ref={inputRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. Show today's revenue"
          className="input flex-1"
          disabled={asking}
        />
        <button type="submit" disabled={asking || !question.trim()} className="btn-primary px-4 flex items-center justify-center" aria-label="Ask">
          {asking ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>

      {history.length === 0 && (
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleAsk(s)}
              disabled={asking}
              className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border"
              style={{ borderColor: "var(--color-border-light)", color: "var(--color-text-secondary)", background: "var(--color-cream-50, #fff)" }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence initial={false}>
        {history.map((h, i) => (
          <motion.div
            key={`${h.question}-${i}`}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 pt-3 border-t"
            style={{ borderColor: "var(--color-border-light)" }}
          >
            <p className="text-xs font-bold mb-1" style={{ color: "var(--color-text-secondary)" }}>Q: {h.question}</p>
            <p
              className="text-sm font-semibold leading-relaxed p-2.5 rounded-lg"
              style={{
                background: h.matched ? "var(--color-cream-100)" : "#FEF2F2",
                color: h.matched ? "var(--color-brown-900)" : "#991B1B",
              }}
            >
              {h.answer}
            </p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
