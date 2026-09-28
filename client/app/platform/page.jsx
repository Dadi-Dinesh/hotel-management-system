"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Loader2,
  Inbox,
  Store,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  Sliders,
  Send,
  ExternalLink,
  Power,
  RefreshCw,
  Mail,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import api from "../lib/api";
import { clearAuth } from "../lib/auth";
import Navbar from "../components/Navbar";
import EmptyState from "../components/EmptyState";
import ApplicationReviewCard from "../components/ApplicationReviewCard";
import NotificationBell from "../components/NotificationBell";
import toast from "react-hot-toast";

const MAIN_TABS = [
  { key: "applications", label: "Applications" },
  { key: "restaurants", label: "All Restaurants" },
  { key: "whatsapp", label: "WhatsApp Outbox" },
];

const STATUS_FILTERS = [
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
  { key: "", label: "All" },
];

const ITEMS_PER_PAGE = 9;

export default function PlatformDashboardPage() {
  const [mainTab, setMainTab] = useState("applications");
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  // Data states
  const [stats, setStats] = useState(null);
  const [applications, setApplications] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [whatsappMessages, setWhatsappMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Fetch overview stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("/platform/stats");
      setStats(res.data.data);
    } catch (e) {
      console.error("Stats fetch notice:", e.message);
    }
  }, []);

  // Fetch applications
  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (query.trim()) params.q = query.trim();
      const res = await api.get("/platform/applications", { params });
      setApplications(res.data.data || []);
      setPage(1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load applications.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, query]);

  // Fetch all restaurants
  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/platform/restaurants");
      setRestaurants(res.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load restaurants.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch WhatsApp outbox
  const fetchWhatsAppMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/platform/whatsapp-messages");
      setWhatsappMessages(res.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load WhatsApp messages.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (mainTab === "applications") {
      const timeout = setTimeout(fetchApplications, query ? 250 : 0);
      return () => clearTimeout(timeout);
    } else if (mainTab === "restaurants") {
      fetchRestaurants();
    } else if (mainTab === "whatsapp") {
      fetchWhatsAppMessages();
    }
  }, [mainTab, fetchApplications, fetchRestaurants, fetchWhatsAppMessages, query]);

  // Handler for live Socket.IO notification from NotificationBell
  const handleNewApplicationReceived = useCallback(
    (newApp) => {
      fetchStats();
      if (mainTab === "applications") {
        setApplications((prev) => [newApp, ...prev.filter((a) => a.id !== newApp.id)]);
      }
    },
    [fetchStats, mainTab]
  );

  // Toggle Restaurant Active/Disabled
  const handleToggleRestaurantStatus = async (restaurant) => {
    const actionWord = restaurant.isActive ? "disable" : "activate";
    if (!window.confirm(`Are you sure you want to ${actionWord} "${restaurant.name}"?`)) return;

    setActionLoadingId(restaurant.id);
    try {
      const res = await api.patch(`/platform/restaurants/${restaurant.id}/toggle-status`);
      toast.success(res.data.message || `Restaurant status updated.`);
      fetchRestaurants();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update restaurant status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Resend QR Kit to restaurant admin
  const handleResendKit = async (restaurantId, restaurantName) => {
    setActionLoadingId(`resend-${restaurantId}`);
    try {
      const res = await api.post(`/platform/restaurants/${restaurantId}/resend-kit`);
      toast.success(res.data.message || `QR Kit resent for ${restaurantName}.`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to resend QR Kit.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Resend WhatsApp Message
  const handleResendWhatsApp = async (msgId) => {
    setActionLoadingId(`wa-${msgId}`);
    try {
      await api.post(`/platform/whatsapp-messages/${msgId}/resend`);
      toast.success("WhatsApp resend initiated.");
      fetchWhatsAppMessages();
    } catch (error) {
      toast.error(error.response?.data?.message || "Resend failed.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Pagination slice
  const totalPages = Math.ceil(applications.length / ITEMS_PER_PAGE) || 1;
  const paginatedApplications = applications.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen pb-16" style={{ background: "var(--color-surface, #FFFDF7)" }}>
      <Navbar
        title="ServeSync Platform Admin"
        subtitle="Platform Owner Control Center"
        rightContent={
          <div className="flex items-center gap-3">
            <NotificationBell onNewApplication={handleNewApplicationReceived} />
            <button
              onClick={() => {
                clearAuth();
                window.location.href = "/admin/login";
              }}
              className="text-[10px] font-bold uppercase tracking-widest px-3 py-2 border rounded-xl transition-colors hover:bg-cream-100"
              style={{ borderColor: "var(--color-brown-900)", color: "var(--color-brown-900)" }}
            >
              Log Out
            </button>
          </div>
        }
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ── OVERVIEW STATS CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <div
            onClick={() => {
              setMainTab("applications");
              setStatusFilter("PENDING");
            }}
            className="p-4 sm:p-5 rounded-2xl border bg-white cursor-pointer transition-all hover:shadow-sm"
            style={{ borderColor: statusFilter === "PENDING" && mainTab === "applications" ? "#E8891C" : "var(--color-border-light)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">Pending</span>
              <Clock size={16} className="text-amber-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-brown-900" style={{ fontFamily: "var(--font-heading)" }}>
              {stats ? stats.pendingApplications : "..."}
            </p>
            <p className="text-[11px] text-neutral-400 mt-1">Awaiting Review</p>
          </div>

          <div
            onClick={() => {
              setMainTab("applications");
              setStatusFilter("APPROVED");
            }}
            className="p-4 sm:p-5 rounded-2xl border bg-white cursor-pointer transition-all hover:shadow-sm"
            style={{ borderColor: statusFilter === "APPROVED" && mainTab === "applications" ? "#065F46" : "var(--color-border-light)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Approved</span>
              <CheckCircle2 size={16} className="text-emerald-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-brown-900" style={{ fontFamily: "var(--font-heading)" }}>
              {stats ? stats.approvedApplications : "..."}
            </p>
            <p className="text-[11px] text-neutral-400 mt-1">Provisioned</p>
          </div>

          <div
            onClick={() => {
              setMainTab("applications");
              setStatusFilter("REJECTED");
            }}
            className="p-4 sm:p-5 rounded-2xl border bg-white cursor-pointer transition-all hover:shadow-sm"
            style={{ borderColor: statusFilter === "REJECTED" && mainTab === "applications" ? "#991B1B" : "var(--color-border-light)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-red-700">Rejected</span>
              <XCircle size={16} className="text-red-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-brown-900" style={{ fontFamily: "var(--font-heading)" }}>
              {stats ? stats.rejectedApplications : "..."}
            </p>
            <p className="text-[11px] text-neutral-400 mt-1">Ineligible / Disqualified</p>
          </div>

          <div
            onClick={() => setMainTab("restaurants")}
            className="p-4 sm:p-5 rounded-2xl border bg-white cursor-pointer transition-all hover:shadow-sm"
            style={{ borderColor: mainTab === "restaurants" ? "var(--color-orange-500)" : "var(--color-border-light)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-brown-900">Active</span>
              <Store size={16} className="text-orange-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-brown-900" style={{ fontFamily: "var(--font-heading)" }}>
              {stats ? stats.activeRestaurants : "..."}
            </p>
            <p className="text-[11px] text-neutral-400 mt-1">Live Restaurants</p>
          </div>

          <div className="col-span-2 sm:col-span-1 p-4 sm:p-5 rounded-2xl border bg-white shadow-sm" style={{ borderColor: "var(--color-border-light)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-600">Platform MRR</span>
              <TrendingUp size={16} className="text-orange-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-orange-600" style={{ fontFamily: "var(--font-heading)" }}>
              ₹{stats ? Number(stats.platformRevenue || 49990).toLocaleString("en-IN") : "..."}
            </p>
            <p className="text-[11px] text-neutral-400 mt-1">Estimated Monthly</p>
          </div>
        </div>

        {/* ── MAIN NAVIGATION BAR ── */}
        <div className="flex border-b pb-1 gap-2" style={{ borderColor: "var(--color-border-light)" }}>
          {MAIN_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setMainTab(tab.key)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                mainTab === tab.key
                  ? "bg-brown-900 text-white shadow-sm"
                  : "text-neutral-500 hover:text-brown-900 hover:bg-cream-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── SECTION 1: APPLICATIONS ── */}
        {mainTab === "applications" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {STATUS_FILTERS.map((t) => (
                  <button
                    key={t.key || "all"}
                    onClick={() => setStatusFilter(t.key)}
                    className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-colors"
                    style={{
                      borderColor: statusFilter === t.key ? "var(--color-orange-500)" : "var(--color-border-light)",
                      background: statusFilter === t.key ? "var(--color-orange-500)" : "#fff",
                      color: statusFilter === t.key ? "#fff" : "var(--color-brown-900)",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  className="input pl-9 text-xs"
                  placeholder="Search restaurant, owner, city, email..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-orange-500" />
              </div>
            ) : applications.length === 0 ? (
              <EmptyState
                icon={<Inbox size={32} />}
                title="No applications found"
                description={
                  query
                    ? `No applications match "${query}".`
                    : statusFilter
                    ? `No ${statusFilter.toLowerCase()} applications registered yet.`
                    : "No restaurant applications registered yet."
                }
              />
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedApplications.map((app) => (
                    <ApplicationReviewCard key={app.id} application={app} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: "var(--color-border-light)" }}>
                    <span className="text-xs text-neutral-500">
                      Showing {(page - 1) * ITEMS_PER_PAGE + 1} to {Math.min(page * ITEMS_PER_PAGE, applications.length)} of {applications.length} applications
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-2 rounded-lg border bg-white disabled:opacity-30"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="text-xs font-bold text-brown-900">
                        {page} / {totalPages}
                      </span>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="p-2 rounded-lg border bg-white disabled:opacity-30"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── SECTION 2: ALL RESTAURANTS ── */}
        {mainTab === "restaurants" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Total Restaurants Provisioned: {restaurants.length}
              </p>
              <button
                onClick={fetchRestaurants}
                className="text-xs font-bold text-orange-600 flex items-center gap-1.5 hover:underline"
              >
                <RefreshCw size={12} /> Refresh List
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-orange-500" />
              </div>
            ) : restaurants.length === 0 ? (
              <EmptyState icon={<Store size={32} />} title="No restaurants found" description="No restaurants have been provisioned on ServeSync yet." />
            ) : (
              <div className="bg-white rounded-2xl border divide-y overflow-hidden shadow-sm" style={{ borderColor: "var(--color-border-light)" }}>
                {restaurants.map((rest) => {
                  const adminUser = rest.users?.[0];
                  const isLoading = actionLoadingId === rest.id || actionLoadingId === `resend-${rest.id}`;

                  return (
                    <div key={rest.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-black text-base text-brown-900">{rest.name}</p>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              rest.isActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {rest.isActive ? "Active" : "Disabled"}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span>Slug: <code className="text-brown-900 font-bold">{rest.slug}</code></span>
                          {adminUser && <span>Admin: {adminUser.email}</span>}
                          <span>Tables: {rest._count?.tables || 0}</span>
                          <span>Orders: {rest._count?.orders || 0}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <Link
                          href={`/restaurant/${rest.slug}/table/T01`}
                          target="_blank"
                          className="px-3 py-1.5 rounded-lg border text-xs font-bold text-neutral-700 flex items-center gap-1.5 hover:bg-cream-100"
                        >
                          <ExternalLink size={12} /> View QR Portal
                        </Link>
                        <button
                          onClick={() => handleResendKit(rest.id, rest.name)}
                          disabled={isLoading}
                          className="px-3 py-1.5 rounded-lg border text-xs font-bold text-orange-600 flex items-center gap-1.5 hover:bg-cream-100"
                        >
                          <Mail size={12} /> Resend Kit
                        </button>
                        <button
                          onClick={() => handleToggleRestaurantStatus(rest)}
                          disabled={isLoading}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 ${
                            rest.isActive
                              ? "text-red-700 border-red-200 hover:bg-red-50"
                              : "text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                          }`}
                        >
                          <Power size={12} /> {rest.isActive ? "Disable" : "Activate"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── SECTION 3: WHATSAPP OUTBOX ── */}
        {mainTab === "whatsapp" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Queued & Sent WhatsApp Notifications: {whatsappMessages.length}
              </p>
              <button
                onClick={fetchWhatsAppMessages}
                className="text-xs font-bold text-orange-600 flex items-center gap-1.5 hover:underline"
              >
                <RefreshCw size={12} /> Refresh Outbox
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-orange-500" />
              </div>
            ) : whatsappMessages.length === 0 ? (
              <EmptyState icon={<Send size={32} />} title="No WhatsApp messages" description="No WhatsApp messages have been queued yet." />
            ) : (
              <div className="bg-white rounded-2xl border divide-y overflow-hidden shadow-sm" style={{ borderColor: "var(--color-border-light)" }}>
                {whatsappMessages.map((msg) => (
                  <div key={msg.id} className="p-4 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-brown-900">{msg.application?.restaurantName || "Platform Notification"}</span>
                        <span className="text-[10px] text-neutral-400">to {msg.to}</span>
                      </div>
                      <p className="text-neutral-600 line-clamp-2">{msg.message}</p>
                      {msg.error && <p className="text-[11px] text-red-600 mt-1">Error: {msg.error}</p>}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={`font-bold uppercase tracking-wide text-[10px] px-2.5 py-1 rounded-full ${
                          msg.status === "SENT"
                            ? "bg-emerald-100 text-emerald-800"
                            : msg.status === "FAILED"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {msg.status}
                      </span>
                      {msg.status !== "SENT" && (
                        <button
                          onClick={() => handleResendWhatsApp(msg.id)}
                          disabled={actionLoadingId === `wa-${msg.id}`}
                          className="px-2.5 py-1 text-[11px] font-bold border rounded-lg hover:bg-cream-100"
                        >
                          {actionLoadingId === `wa-${msg.id}` ? <Loader2 size={12} className="animate-spin" /> : "Resend"}
                        </button>
                      )}
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
