"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Star, MessageSquare } from "lucide-react";
import api from "../../lib/api";
import { getUser, isAuthenticated } from "../../lib/auth";
import DashboardHeader from "../../components/admin/DashboardHeader";
import EmptyState from "../../components/EmptyState";
import RatingDistribution from "../../components/admin/RatingDistribution";
import ExportButton from "../../components/admin/ExportButton";

const sentimentFor = (rating) => {
  if (rating >= 4) return { label: "Positive", bg: "#ECFDF5", color: "#065F46", border: "#A7F3D0" };
  if (rating === 3) return { label: "Neutral", bg: "#FFFBEB", color: "#92400E", border: "#FDE68A" };
  return { label: "Negative", bg: "#FEF2F2", color: "#991B1B", border: "#FECACA" };
};

export default function AdminReviewsPage() {
  const router = useRouter();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sentimentFilter, setSentimentFilter] = useState("ALL");

  useEffect(() => {
    if (!isAuthenticated() || getUser()?.role !== "ADMIN") {
      router.push("/admin/login");
      return;
    }
    fetchFeedbacks();
  }, [router]);

  const fetchFeedbacks = async () => {
    try {
      const res = await api.get("/feedbacks");
      setFeedbacks(res.data.data);
    } catch (error) {
      console.error("Failed to fetch feedbacks:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalReviews = feedbacks.length;
  const averageRating = totalReviews ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / totalReviews : 0;

  const distribution = useMemo(() => {
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    feedbacks.forEach((f) => {
      if (dist[f.rating] != null) dist[f.rating] += 1;
    });
    return dist;
  }, [feedbacks]);

  const sentimentCounts = useMemo(() => {
    const counts = { Positive: 0, Neutral: 0, Negative: 0 };
    feedbacks.forEach((f) => {
      counts[sentimentFor(f.rating).label] += 1;
    });
    return counts;
  }, [feedbacks]);

  const filteredFeedbacks = feedbacks.filter((f) => sentimentFilter === "ALL" || sentimentFor(f.rating).label === sentimentFilter);

  const exportColumns = [
    { key: "menuItem", label: "Item", value: (row) => row.menuItem?.name || "" },
    { key: "table", label: "Table", value: (row) => row.session?.table?.code || "" },
    { key: "rating", label: "Rating" },
    { key: "sentiment", label: "Sentiment", value: (row) => sentimentFor(row.rating).label },
    { key: "createdAt", label: "Date", value: (row) => new Date(row.createdAt).toLocaleString("en-IN") },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--ss-bg)" }}>
      <DashboardHeader title="Customer Insights" subtitle="Feedback & Ratings" />

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Header Stats + Rating Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="card text-center p-6 border-b-4" style={{ borderColor: "var(--color-orange-500)" }}>
              <p className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: "var(--color-text-secondary)" }}>
                Total Reviews
              </p>
              <p className="text-4xl font-black" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
                {totalReviews}
              </p>
            </div>
            <div className="card text-center p-6 border-b-4" style={{ borderColor: "var(--color-orange-500)" }}>
              <p className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: "var(--color-text-secondary)" }}>
                Average Rating
              </p>
              <div className="flex items-center justify-center gap-2">
                <p className="text-4xl font-black" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
                  {averageRating.toFixed(1)}
                </p>
                <Star size={28} fill="var(--color-orange-500)" color="var(--color-orange-500)" />
              </div>
            </div>
          </div>

          <div className="card">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--color-text-secondary)" }}>
              Rating Distribution
            </p>
            <RatingDistribution distribution={distribution} total={totalReviews} />
          </div>
        </div>

        {/* Sentiment filter + export */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: "var(--color-cream-100)" }}>
            {["ALL", "Positive", "Neutral", "Negative"].map((s) => (
              <button
                key={s}
                onClick={() => setSentimentFilter(s)}
                className="px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-colors"
                style={{
                  background: sentimentFilter === s ? "var(--color-brown-900)" : "transparent",
                  color: sentimentFilter === s ? "white" : "var(--color-brown-900)",
                }}
              >
                {s === "ALL" ? "All" : `${s} (${sentimentCounts[s]})`}
              </button>
            ))}
          </div>
          <ExportButton
            filename="customer-feedback"
            title="Customer Feedback Report"
            subtitle={`Generated ${new Date().toLocaleString("en-IN")}`}
            columns={exportColumns}
            rows={filteredFeedbacks}
          />
        </div>

        {/* Reviews Feed (Feedback Timeline) */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <EmptyState
            icon={<MessageSquare size={30} style={{ color: "var(--color-text-muted)" }} />}
            title="No Reviews Yet"
            description="When customers leave feedback, it will appear here."
          />
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.04 } } }}
            className="grid gap-4 md:grid-cols-2"
          >
            {filteredFeedbacks.map((feedback) => {
              const sentiment = sentimentFor(feedback.rating);
              return (
                <motion.div
                  key={feedback.id}
                  variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                  className="card flex flex-col gap-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold uppercase tracking-widest" style={{ color: "var(--color-brown-900)" }}>
                        {feedback.menuItem.name}
                      </h3>
                      <p className="text-xs font-semibold mt-1" style={{ color: "var(--color-text-muted)" }}>
                        Table {feedback.session.table.code}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={16}
                          fill={feedback.rating >= star ? "var(--color-orange-500)" : "transparent"}
                          color={feedback.rating >= star ? "var(--color-orange-500)" : "var(--color-cream-300)"}
                        />
                      ))}
                    </div>
                  </div>
                  <span
                    className="self-start text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border"
                    style={{ background: sentiment.bg, color: sentiment.color, borderColor: sentiment.border }}
                  >
                    {sentiment.label}
                  </span>
                  <div className="border-t pt-2 mt-1 flex justify-between items-center" style={{ borderColor: "var(--color-border-light)" }}>
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
                      {new Date(feedback.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
                      {new Date(feedback.createdAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </main>
    </div>
  );
}
