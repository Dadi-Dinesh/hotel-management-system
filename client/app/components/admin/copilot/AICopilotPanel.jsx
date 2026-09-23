"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Sparkles,
  Clock,
  IndianRupee,
  Trophy,
  TrendingDown,
  ChefHat,
  Star,
  UtensilsCrossed,
  MessageSquare,
  Timer,
  Sliders,
  Lightbulb,
} from "lucide-react";
import { useAICopilot } from "../../../lib/insights/useAICopilot";
import CopilotCard from "./CopilotCard";
import TrendComparison from "./TrendComparison";
import InsightTimeline from "./InsightTimeline";
import AskAI from "./AskAI";
import InsightCard from "../InsightCard";

export default function AICopilotPanel() {
  const { data, loading, error } = useAICopilot();
  const shouldReduceMotion = useReducedMotion();

  const dailyCards = useMemo(() => {
    if (!data) return [];
    const { daily } = data;
    return [
      { key: "busy", icon: <Clock size={16} />, title: "Busy Hour Today", accent: "#7C3AED", ...daily.busyHour },
      { key: "revenue", icon: <IndianRupee size={16} />, title: "Revenue vs Yesterday", accent: "#16A34A", hasData: daily.revenueComparison.hasData, text: daily.revenueComparison.text },
      { key: "best", icon: <Trophy size={16} />, title: "Best Seller Today", accent: "#E8891C", hasData: daily.bestSellerToday.hasData, text: daily.bestSellerToday.text },
      { key: "slow", icon: <TrendingDown size={16} />, title: "Slow Seller Today", accent: "#DC2626", hasData: daily.slowSellerToday.hasData, text: daily.slowSellerToday.text },
      { key: "kitchen", icon: <ChefHat size={16} />, title: "Kitchen Alert", accent: "#D97706", hasData: daily.kitchenAlert.hasData, text: daily.kitchenAlert.text },
      { key: "feedback", icon: <Star size={16} />, title: "Feedback Summary", accent: "#0284C7", hasData: daily.feedbackSummary.hasData, text: daily.feedbackSummary.text },
    ];
  }, [data]);

  return (
    <section className="mb-10">
      <div className="flex items-center gap-2.5 mb-1">
        <span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #E8891C, #7C3AED)" }}>
          <Sparkles size={16} color="white" />
        </span>
        <h2 className="text-xl font-black uppercase tracking-widest" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
          ServeSync AI Copilot
        </h2>
      </div>
      <p className="text-xs mb-5" style={{ color: "var(--color-text-muted)" }}>
        Daily insights computed from your restaurant&apos;s own orders, feedback, and kitchen data — never invented.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-xl text-xs font-semibold" style={{ background: "#FEF2F2", color: "#991B1B" }}>{error}</div>
      )}

      {/* Daily insight cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {loading || dailyCards.length === 0
          ? Array.from({ length: 6 }).map((_, i) => <CopilotCard key={i} icon={<Sparkles size={16} />} title="Loading" loading accent="#E8891C" />)
          : dailyCards.map((c) => <CopilotCard key={c.key} icon={c.icon} title={c.title} text={c.text} accent={c.accent} hasData={c.hasData} />)}
      </div>

      {/* Historical trend comparison */}
      <div className="mb-6">
        <TrendComparison />
      </div>

      {/* Menu Intelligence + Feedback Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <MenuIntelligenceCard menu={data?.menu} loading={loading} />
        <FeedbackInsightsCard feedback={data?.feedback} loading={loading} />
      </div>

      {/* Kitchen Performance + Table Utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <KitchenPerformanceCard kitchen={data?.kitchen} loading={loading} />
        <TableUtilizationCard tables={data?.tables} loading={loading} />
      </div>

      {/* Recommendations */}
      {!loading && data?.recommendations?.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-black uppercase tracking-wide mb-3 flex items-center gap-2" style={{ color: "var(--color-brown-900)" }}>
            <Lightbulb size={15} style={{ color: "var(--color-orange-500)" }} /> Suggestions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {data.recommendations.map((r) => (
              <InsightCard key={r.id} text={r.text} badge="Suggestion" />
            ))}
          </div>
        </div>
      )}

      {/* Timeline + Ask AI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5 border" style={{ borderColor: "var(--color-border-light)", background: "var(--color-surface)" }}>
          <h3 className="text-sm font-black uppercase tracking-wide mb-3" style={{ color: "var(--color-brown-900)" }}>Today&apos;s Timeline</h3>
          <InsightTimeline timeline={data?.timeline} loading={loading} />
        </div>
        <AskAI />
      </div>
    </section>
  );
}

function SectionShell({ title, icon, children }) {
  return (
    <div className="rounded-2xl p-5 border" style={{ borderColor: "var(--color-border-light)", background: "var(--color-surface)" }}>
      <h3 className="text-sm font-black uppercase tracking-wide mb-3 flex items-center gap-2" style={{ color: "var(--color-brown-900)" }}>
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}

function MenuIntelligenceCard({ menu, loading }) {
  if (loading) {
    return (
      <SectionShell title="Menu Intelligence" icon={<UtensilsCrossed size={15} style={{ color: "var(--color-orange-500)" }} />}>
        <div className="h-28 rounded-lg animate-pulse" style={{ background: "var(--color-cream-200)" }} />
      </SectionShell>
    );
  }
  if (!menu?.hasData) {
    return (
      <SectionShell title="Menu Intelligence" icon={<UtensilsCrossed size={15} style={{ color: "var(--color-orange-500)" }} />}>
        <p className="text-sm text-center py-6" style={{ color: "var(--color-text-muted)" }}>Not enough data yet.</p>
      </SectionShell>
    );
  }
  return (
    <SectionShell title="Menu Intelligence" icon={<UtensilsCrossed size={15} style={{ color: "var(--color-orange-500)" }} />}>
      <div className="space-y-3 text-xs">
        {menu.popularCategories?.length > 0 && (
          <div>
            <p className="font-bold uppercase tracking-wide mb-1" style={{ color: "var(--color-text-secondary)" }}>Popular Categories</p>
            <div className="flex flex-wrap gap-1.5">
              {menu.popularCategories.slice(0, 4).map((c) => (
                <span key={c.name} className="px-2 py-1 rounded-full font-semibold" style={{ background: "var(--color-cream-100)", color: "var(--color-brown-900)" }}>
                  {c.name} · {c.quantity}
                </span>
              ))}
            </div>
          </div>
        )}
        {menu.frequentlyOrderedTogether?.length > 0 && (
          <div>
            <p className="font-bold uppercase tracking-wide mb-1" style={{ color: "var(--color-text-secondary)" }}>Frequently Ordered Together</p>
            {menu.frequentlyOrderedTogether.slice(0, 3).map((p, i) => (
              <p key={i} className="font-semibold" style={{ color: "var(--color-brown-900)" }}>{p.itemA} + {p.itemB} <span style={{ color: "var(--color-text-muted)" }}>({p.count}x)</span></p>
            ))}
          </div>
        )}
        {menu.underperformingItems?.length > 0 && (
          <div>
            <p className="font-bold uppercase tracking-wide mb-1" style={{ color: "var(--color-text-secondary)" }}>Underperforming</p>
            <p className="font-semibold" style={{ color: "var(--color-brown-900)" }}>{menu.underperformingItems[0].name}</p>
          </div>
        )}
      </div>
    </SectionShell>
  );
}

function FeedbackInsightsCard({ feedback, loading }) {
  if (loading) {
    return (
      <SectionShell title="Customer Feedback Insights" icon={<MessageSquare size={15} style={{ color: "var(--color-orange-500)" }} />}>
        <div className="h-28 rounded-lg animate-pulse" style={{ background: "var(--color-cream-200)" }} />
      </SectionShell>
    );
  }
  if (!feedback?.hasData) {
    return (
      <SectionShell title="Customer Feedback Insights" icon={<MessageSquare size={15} style={{ color: "var(--color-orange-500)" }} />}>
        <p className="text-sm text-center py-6" style={{ color: "var(--color-text-muted)" }}>Not enough data yet.</p>
      </SectionShell>
    );
  }
  return (
    <SectionShell title="Customer Feedback Insights" icon={<MessageSquare size={15} style={{ color: "var(--color-orange-500)" }} />}>
      <div className="space-y-3 text-xs">
        <p className="font-semibold" style={{ color: "var(--color-brown-900)" }}>
          Average rating: {feedback.overallAverage}/5 ({feedback.trendDirection === "UP" ? "trending up ↑" : feedback.trendDirection === "DOWN" ? "trending down ↓" : "steady"})
        </p>
        {feedback.compliments?.length > 0 && (
          <div>
            <p className="font-bold uppercase tracking-wide mb-1" style={{ color: "var(--color-text-secondary)" }}>Common Compliments</p>
            <div className="flex flex-wrap gap-1.5">
              {feedback.compliments.map((c) => (
                <span key={c.word} className="px-2 py-1 rounded-full font-semibold" style={{ background: "#ECFDF5", color: "#065F46" }}>{c.word}</span>
              ))}
            </div>
          </div>
        )}
        {feedback.complaints?.length > 0 && (
          <div>
            <p className="font-bold uppercase tracking-wide mb-1" style={{ color: "var(--color-text-secondary)" }}>Common Complaints</p>
            <div className="flex flex-wrap gap-1.5">
              {feedback.complaints.map((c) => (
                <span key={c.word} className="px-2 py-1 rounded-full font-semibold" style={{ background: "#FEF2F2", color: "#991B1B" }}>{c.word}</span>
              ))}
            </div>
          </div>
        )}
        {feedback.commentsNote && <p style={{ color: "var(--color-text-muted)" }}>{feedback.commentsNote}</p>}
      </div>
    </SectionShell>
  );
}

function KitchenPerformanceCard({ kitchen, loading }) {
  if (loading) {
    return (
      <SectionShell title="Kitchen Performance" icon={<Timer size={15} style={{ color: "var(--color-orange-500)" }} />}>
        <div className="h-20 rounded-lg animate-pulse" style={{ background: "var(--color-cream-200)" }} />
      </SectionShell>
    );
  }
  return (
    <SectionShell title="Kitchen Performance" icon={<Timer size={15} style={{ color: "var(--color-orange-500)" }} />}>
      {!kitchen?.hasData ? (
        <p className="text-sm text-center py-6" style={{ color: "var(--color-text-muted)" }}>Not enough data yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Stat label="Avg Prep Time" value={`${kitchen.averagePrepMinutes} min`} />
          <Stat label="Longest Prep" value={kitchen.longestPrep ? `${kitchen.longestPrep.minutes} min` : "—"} />
          <Stat label="Delayed Now" value={String(kitchen.delayedCount)} warn={kitchen.delayedCount > 0} />
          <Stat label="Busiest Hour" value={kitchen.busiestHour?.label || "—"} />
        </div>
      )}
    </SectionShell>
  );
}

function TableUtilizationCard({ tables, loading }) {
  if (loading) {
    return (
      <SectionShell title="Table Utilization" icon={<Sliders size={15} style={{ color: "var(--color-orange-500)" }} />}>
        <div className="h-20 rounded-lg animate-pulse" style={{ background: "var(--color-cream-200)" }} />
      </SectionShell>
    );
  }
  return (
    <SectionShell title="Table Utilization" icon={<Sliders size={15} style={{ color: "var(--color-orange-500)" }} />}>
      {!tables?.hasData ? (
        <p className="text-sm text-center py-6" style={{ color: "var(--color-text-muted)" }}>Not enough data yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Stat label="Most Used Table" value={`${tables.mostUsedTable.code} (${tables.mostUsedTable.sessions})`} />
          <Stat label="Avg Dining Time" value={tables.averageDiningMinutes != null ? `${tables.averageDiningMinutes} min` : "—"} />
          <Stat label="Peak Occupancy" value={tables.peakOccupancy?.label || "—"} />
        </div>
      )}
    </SectionShell>
  );
}

function Stat({ label, value, warn }) {
  return (
    <div className="p-2.5 rounded-lg" style={{ background: warn ? "#FEF2F2" : "var(--color-cream-100)" }}>
      <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>{label}</p>
      <p className="text-xs font-bold" style={{ color: warn ? "#991B1B" : "var(--color-brown-900)" }}>{value}</p>
    </div>
  );
}
