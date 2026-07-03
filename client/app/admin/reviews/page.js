"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Star, MessageSquare } from "lucide-react";
import api from "../../lib/api";
import { getUser, isAuthenticated } from "../../lib/auth";
import Navbar from "../../components/Navbar";

export default function AdminReviewsPage() {
  const router = useRouter();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

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
  const averageRating = totalReviews
    ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / totalReviews).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen" style={{ background: "var(--color-cream-50)" }}>
      <Navbar title="Customer Reviews" subtitle="Feedback & Ratings" backHref="/admin/dashboard" />

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Header Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
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
                {averageRating}
              </p>
              <Star size={28} fill="var(--color-orange-500)" color="var(--color-orange-500)" />
            </div>
          </div>
        </div>

        {/* Reviews Feed */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed rounded-2xl" style={{ borderColor: "var(--color-cream-200)" }}>
            <MessageSquare size={48} className="mx-auto mb-4" style={{ color: "var(--color-cream-300)" }} />
            <h3 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
              No Reviews Yet
            </h3>
            <p style={{ color: "var(--color-text-muted)" }}>
              When customers leave feedback, it will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {feedbacks.map((feedback) => (
              <div key={feedback.id} className="card flex flex-col gap-3">
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
                <div className="border-t pt-2 mt-2 flex justify-between items-center" style={{ borderColor: "var(--color-border-light)" }}>
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
                    {new Date(feedback.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
                    {new Date(feedback.createdAt).toLocaleTimeString("en-IN", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
