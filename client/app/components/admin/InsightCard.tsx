"use client";

import { Lightbulb } from "lucide-react";

/** A single, non-prescriptive suggestion — never auto-applies anything.
 * `badge`, when passed (e.g. by the AI Copilot's recommendation cards),
 * renders a small "Suggestion" label so it's never mistaken for a fact. */
export default function InsightCard({ text, badge }: { text: string; badge?: string }) {
  return (
    <div
      className="flex items-start gap-2.5 p-3 rounded-xl border text-xs font-semibold leading-relaxed"
      style={{ borderColor: "#FDE68A", background: "#FFFBEB", color: "#92400E" }}
    >
      <Lightbulb size={16} className="flex-shrink-0 mt-0.5" />
      <span>
        {badge && (
          <span className="inline-block mr-1.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider align-middle" style={{ background: "#F59E0B", color: "white" }}>
            {badge}
          </span>
        )}
        {text}
      </span>
    </div>
  );
}
