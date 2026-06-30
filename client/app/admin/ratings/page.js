"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Star, ArrowLeft, Filter, MessageSquare, TrendingUp, Award, Utensils } from "lucide-react";
import api from "../../lib/api";
import { getUser, isAuthenticated } from "../../lib/auth";
import Navbar from "../../components/Navbar";
import toast from "react-hot-toast";

export default function AdminRatingsPage() {
  const router = useRouter();

  const [stats, setStats] = useState(null);
  const [reviewsData, setReviewsData] = useState({ reviews: [], overallFeedbacks: [] });
  const [loading, setLoading] = useState(true);
  const [selectedItemFilter, setSelectedItemFilter] = useState("");
  const [activeTab, setActiveTab] = useState("items"); // items, general

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/admin/login");
      return;
    }
    const u = getUser();
    if (u?.role !== "ADMIN") {
      router.push("/admin/login");
      return;
    }
    loadData();
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, reviewsRes] = await Promise.all([
        api.get("/ratings/admin/stats"),
        api.get("/ratings/admin/reviews"),
      ]);
      setStats(statsRes.data.data);
      setReviewsData(reviewsRes.data.data);
    } catch (error) {
      toast.error("Failed to load ratings and reviews");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = async (itemId) => {
    setSelectedItemFilter(itemId);
    setLoading(true);
    try {
      const url = itemId ? `/ratings/admin/reviews?menuItemId=${itemId}` : "/ratings/admin/reviews";
      const res = await api.get(url);
      setReviewsData((prev) => ({
        ...prev,
        reviews: res.data.data.reviews,
      }));
    } catch (error) {
      toast.error("Failed to filter reviews");
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex gap-0.5 text-orange-500">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            fill={star <= rating ? "var(--color-orange-500)" : "transparent"}
            color="var(--color-orange-500)"
          />
        ))}
      </div>
    );
  };

  if (loading && !stats) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--color-surface)" }}
      >
        <div className="animate-pulse-soft text-center">
          <p className="text-4xl mb-2">⭐</p>
          <p className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--color-brown-900)" }}>
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  // Get current item's stats if filtered
  const filteredItemStats = selectedItemFilter
    ? stats?.itemStats?.find((item) => item.id === selectedItemFilter)
    : null;

  return (
    <div
      className="min-h-screen pb-12"
      style={{ background: "var(--color-surface)" }}
    >
      <Navbar
        title="Ratings & Reviews"
        subtitle="Admin Feedback Center"
        rightContent={
          <Link
            href="/admin/dashboard"
            className="w-10 h-10 border flex items-center justify-center transition-colors hover:bg-brown-900 hover:text-white"
            style={{ borderColor: "var(--color-brown-900)", color: "var(--color-brown-900)" }}
          >
            <ArrowLeft size={20} />
          </Link>
        }
      />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Stat cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card flex items-center gap-6">
            <div
              className="w-12 h-12 border flex items-center justify-center"
              style={{
                borderColor: "var(--color-brown-900)",
                background: "var(--color-cream-200)",
                color: "var(--color-brown-900)",
              }}
            >
              <TrendingUp size={24} />
            </div>
            <div>
              <p
                className="text-3xl font-black"
                style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}
              >
                ⭐ {stats?.overallAverage ? stats.overallAverage.toFixed(1) : "0.0"}
              </p>
              <p className="text-xs font-bold uppercase tracking-widest mt-1 text-gray-500">
                Average Rating (Original)
              </p>
            </div>
          </div>

          <div className="card flex items-center gap-6">
            <div
              className="w-12 h-12 border flex items-center justify-center"
              style={{
                borderColor: "var(--color-brown-900)",
                background: "var(--color-cream-200)",
                color: "var(--color-brown-900)",
              }}
            >
              <MessageSquare size={24} />
            </div>
            <div>
              <p
                className="text-3xl font-black"
                style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}
              >
                {stats?.totalReviews || 0}
              </p>
              <p className="text-xs font-bold uppercase tracking-widest mt-1 text-gray-500">
                Total Food Reviews
              </p>
            </div>
          </div>

          <div className="card flex items-center gap-6">
            <div
              className="w-12 h-12 border flex items-center justify-center"
              style={{
                borderColor: "var(--color-brown-900)",
                background: "var(--color-cream-200)",
                color: "var(--color-brown-900)",
              }}
            >
              <Award size={24} />
            </div>
            <div>
              <p
                className="text-3xl font-black"
                style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}
              >
                {reviewsData?.overallFeedbacks?.length || 0}
              </p>
              <p className="text-xs font-bold uppercase tracking-widest mt-1 text-gray-500">
                Overall Experience Reviews
              </p>
            </div>
          </div>
        </section>

        {/* Tab Controls */}
        <div className="flex border-b-2 border-brown-900 mb-8">
          <button
            onClick={() => setActiveTab("items")}
            className={`px-6 py-3 font-bold text-sm uppercase tracking-wider border-t-2 border-l-2 border-r-2 -mb-[2px] transition-colors ${
              activeTab === "items"
                ? "bg-white border-brown-900 border-b-white z-10"
                : "border-transparent text-gray-400 bg-transparent hover:text-brown-900"
            }`}
          >
            Food Item Reviews
          </button>
          <button
            onClick={() => setActiveTab("general")}
            className={`px-6 py-3 font-bold text-sm uppercase tracking-wider border-t-2 border-l-2 border-r-2 -mb-[2px] transition-colors ${
              activeTab === "general"
                ? "bg-white border-brown-900 border-b-white z-10"
                : "border-transparent text-gray-400 bg-transparent hover:text-brown-900"
            }`}
          >
            General Restaurant Feedback
          </button>
        </div>

        {activeTab === "items" ? (
          <div>
            {/* Filter Section */}
            <div
              className="p-5 border-2 border-brown-900 mb-8 bg-cream-50 flex flex-col md:flex-row gap-4 items-center justify-between shadow-[4px_4px_0px_0px_rgba(92,61,26,1)]"
              style={{ background: "var(--color-cream-50)" }}
            >
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-brown-900" />
                <span className="font-bold uppercase tracking-wider text-sm text-brown-900">
                  Filter by Food Item:
                </span>
              </div>
              <select
                value={selectedItemFilter}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="w-full md:w-72 p-2 border-2 border-brown-900 font-bold bg-white text-brown-900 focus:outline-none"
              >
                <option value="">All Menu Items</option>
                {stats?.itemStats
                  ?.filter((item) => item.totalReviews > 0)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.totalReviews} reviews)
                    </option>
                  ))}
              </select>
            </div>

            {/* Filtered food item summary card */}
            {filteredItemStats && (
              <div
                className="card p-5 border-2 border-orange-500 mb-8 bg-orange-50 flex items-center justify-between"
                style={{ borderColor: "var(--color-orange-500)", background: "rgba(232, 137, 28, 0.05)" }}
              >
                <div>
                  <h3
                    className="text-lg font-black uppercase tracking-wider text-brown-900"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {filteredItemStats.name}
                  </h3>
                  <p className="text-xs uppercase tracking-widest font-bold text-gray-400 mt-0.5">
                    Category: {filteredItemStats.categoryName}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1.5 font-black text-lg text-brown-900">
                    ⭐ {filteredItemStats.averageRating.toFixed(1)} / 5.0
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mt-1">
                    Based on {filteredItemStats.totalReviews} customer ratings
                  </p>
                </div>
              </div>
            )}

            {/* Review List */}
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton h-24 w-full border border-brown-900" />
                ))}
              </div>
            ) : reviewsData.reviews.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-brown-900/30">
                <Utensils size={40} className="mx-auto mb-4 text-gray-400 animate-bounce-soft" />
                <p className="font-bold text-gray-500 uppercase tracking-widest">
                  No food reviews found
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviewsData.reviews.map((review) => (
                  <div
                    key={review.id}
                    className="p-5 border-2 border-brown-900 bg-white transition-all shadow-[4px_4px_0px_0px_rgba(92,61,26,0.15)]"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-dashed border-brown-900/20 pb-3 mb-3">
                      <div>
                        <span className="font-bold text-sm uppercase tracking-wider text-brown-900">
                          {review.itemName}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-gray-400 bg-cream-100 border border-cream-200 px-1.5 py-0.5 ml-2">
                          {review.categoryName}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {renderStars(review.rating)}
                        <span className="font-black text-xs text-orange-600">
                          (Rating: {review.rating}.0)
                        </span>
                      </div>
                    </div>

                    <p className="text-sm font-medium text-brown-900/80 italic">
                      {review.feedback || "No written review comments left."}
                    </p>

                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <span>Table {review.tableCode} · Order #{review.orderNumber}</span>
                      <span>
                        {new Date(review.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* General Feedback List */}
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton h-24 w-full border border-brown-900" />
                ))}
              </div>
            ) : reviewsData.overallFeedbacks.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-brown-900/30">
                <MessageSquare size={40} className="mx-auto mb-4 text-gray-400" />
                <p className="font-bold text-gray-500 uppercase tracking-widest">
                  No overall experience feedback found
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviewsData.overallFeedbacks.map((f) => (
                  <div
                    key={f.id}
                    className="p-5 border-2 border-brown-900 bg-white transition-all shadow-[4px_4px_0px_0px_rgba(92,61,26,0.15)]"
                  >
                    <div className="flex items-center justify-between border-b border-dashed border-brown-900/20 pb-3 mb-3 text-xs font-bold text-brown-900 uppercase">
                      <span>Overall Experience Feedback</span>
                      <span className="text-[10px] text-orange-600">Restaurant Level</span>
                    </div>

                    <p className="text-sm font-medium text-brown-900/80 italic">
                      "{f.feedback}"
                    </p>

                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <span>Table {f.tableCode} · Order #{f.orderNumber}</span>
                      <span>
                        {new Date(f.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
