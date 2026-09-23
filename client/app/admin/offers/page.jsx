"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Copy, Trash2, Tag, Clock, Save } from "lucide-react";
import api from "../../lib/api";
import { getUser, isAuthenticated } from "../../lib/auth";
import Navbar from "../../components/Navbar";
import EmptyState from "../../components/EmptyState";
import toast from "react-hot-toast";

const STATUS_STYLES = {
  ACTIVE: { bg: "#ECFDF5", color: "#065F46", border: "#A7F3D0", label: "Active" },
  SCHEDULED: { bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE", label: "Scheduled" },
  EXPIRED: { bg: "#F3F4F6", color: "#6B7280", border: "#E5E7EB", label: "Expired" },
  DISABLED: { bg: "#FEF2F2", color: "#991B1B", border: "#FECACA", label: "Disabled" },
};

function countdown(endsAt) {
  if (!endsAt) return null;
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  if (days > 0) return `${days}d ${hours}h left`;
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  return `${hours}h ${minutes}m left`;
}

const emptyForm = { title: "", description: "", discountType: "PERCENTAGE", discountValue: "", code: "", startsAt: "", endsAt: "", isEnabled: true };

export default function AdminOffersPage() {
  const router = useRouter();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingOffer, setDeletingOffer] = useState(null);

  useEffect(() => {
    if (!isAuthenticated() || getUser()?.role !== "ADMIN") {
      router.push("/admin/login");
      return;
    }
    fetchOffers();
  }, [router]);

  const fetchOffers = useCallback(async () => {
    try {
      const res = await api.get("/offers");
      setOffers(res.data.data || []);
    } catch (error) {
      toast.error("Failed to load offers");
    } finally {
      setLoading(false);
    }
  }, []);

  const counts = useMemo(() => {
    const c = { ACTIVE: 0, SCHEDULED: 0, EXPIRED: 0, DISABLED: 0 };
    offers.forEach((o) => { c[o.computedStatus] = (c[o.computedStatus] || 0) + 1; });
    return c;
  }, [offers]);

  const filteredOffers = offers.filter((o) => statusFilter === "ALL" || o.computedStatus === statusFilter);

  const openCreateModal = () => {
    setEditingOffer(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (offer) => {
    setEditingOffer(offer);
    setForm({
      title: offer.title,
      description: offer.description || "",
      discountType: offer.discountType,
      discountValue: String(offer.discountValue),
      code: offer.code || "",
      startsAt: offer.startsAt ? offer.startsAt.slice(0, 16) : "",
      endsAt: offer.endsAt ? offer.endsAt.slice(0, 16) : "",
      isEnabled: offer.isEnabled,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      title: form.title,
      description: form.description || null,
      discountType: form.discountType,
      discountValue: parseFloat(form.discountValue),
      code: form.code || null,
      startsAt: form.startsAt || null,
      endsAt: form.endsAt || null,
      isEnabled: form.isEnabled,
    };
    try {
      if (editingOffer) {
        await api.patch(`/offers/${editingOffer.id}`, payload);
        toast.success("Offer updated.");
      } else {
        await api.post("/offers", payload);
        toast.success("Offer created.");
      }
      setModalOpen(false);
      fetchOffers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save offer");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (offer) => {
    try {
      await api.patch(`/offers/${offer.id}`, { isEnabled: !offer.isEnabled });
      toast.success(offer.isEnabled ? "Offer disabled." : "Offer enabled.");
      fetchOffers();
    } catch (error) {
      toast.error("Failed to toggle offer");
    }
  };

  const handleDuplicate = async (offer) => {
    try {
      await api.post(`/offers/${offer.id}/duplicate`);
      toast.success("Offer duplicated (created disabled).");
      fetchOffers();
    } catch (error) {
      toast.error("Failed to duplicate offer");
    }
  };

  const handleDelete = async () => {
    if (!deletingOffer) return;
    try {
      await api.delete(`/offers/${deletingOffer.id}`);
      toast.success("Offer deleted.");
      setDeletingOffer(null);
      fetchOffers();
    } catch (error) {
      toast.error("Failed to delete offer");
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--color-cream-50)" }}>
      <Navbar
        title="Offers"
        subtitle="Promotions & Discounts"
        backHref="/admin/dashboard"
        rightContent={
          <button onClick={openCreateModal} className="btn-primary flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider py-2.5 px-4">
            <Plus size={16} /> New Offer
          </button>
        }
      />

      <main className="max-w-5xl mx-auto px-4 py-6">
        <p className="text-xs font-semibold mb-5 p-3 rounded-xl border" style={{ color: "#92400E", background: "#FFFBEB", borderColor: "#FDE68A" }}>
          Offers are managed here for marketing/promotional purposes. There is currently no customer-facing coupon redemption flow in checkout, so
          usage count is not auto-incremented from real orders — that would require changes to the ordering flow, which is outside this phase&apos;s scope.
        </p>

        {/* Status filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {["ALL", "ACTIVE", "SCHEDULED", "EXPIRED", "DISABLED"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-lg border transition-all"
              style={{
                background: statusFilter === s ? "var(--color-brown-900)" : "var(--color-surface)",
                color: statusFilter === s ? "white" : "var(--color-brown-900)",
                borderColor: "var(--color-brown-900)",
              }}
            >
              {s === "ALL" ? `All (${offers.length})` : `${STATUS_STYLES[s].label} (${counts[s] || 0})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-40 rounded-2xl animate-pulse" style={{ background: "var(--color-cream-200)" }} />)}
          </div>
        ) : filteredOffers.length === 0 ? (
          <EmptyState
            icon={<Tag size={30} style={{ color: "var(--color-text-muted)" }} />}
            title="No Offers"
            description="Create your first promotion to see it here."
            action={
              <button onClick={openCreateModal} className="btn-primary text-xs font-bold px-4 py-2 uppercase tracking-wider">
                <Plus size={14} /> New Offer
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence>
              {filteredOffers.map((offer) => {
                const style = STATUS_STYLES[offer.computedStatus];
                const cd = offer.computedStatus === "ACTIVE" ? countdown(offer.endsAt) : null;
                return (
                  <motion.div
                    key={offer.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="rounded-2xl p-4 border flex flex-col gap-2.5"
                    style={{ borderColor: "var(--color-border-light)", background: "var(--color-surface)" }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-sm" style={{ color: "var(--color-brown-900)" }}>{offer.title}</h3>
                        {offer.code && (
                          <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded" style={{ background: "var(--color-cream-100)", color: "var(--color-orange-600)" }}>
                            {offer.code}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border flex-shrink-0" style={{ background: style.bg, color: style.color, borderColor: style.border }}>
                        {style.label}
                      </span>
                    </div>

                    {offer.description && <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{offer.description}</p>}

                    <p className="text-lg font-black" style={{ fontFamily: "var(--font-heading)", color: "var(--color-orange-500)" }}>
                      {offer.discountType === "PERCENTAGE" ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} OFF`}
                    </p>

                    <div className="flex items-center justify-between text-[11px] font-bold" style={{ color: "var(--color-text-muted)" }}>
                      <span>Used {offer.usageCount} times</span>
                      {cd && (
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> {cd}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 pt-2 mt-1 border-t" style={{ borderColor: "var(--color-border-light)" }}>
                      <button
                        onClick={() => handleToggle(offer)}
                        className="flex-1 py-1.5 text-[11px] font-bold uppercase tracking-wide rounded-lg border transition-colors"
                        style={{
                          borderColor: offer.isEnabled ? "#FCA5A5" : "#A7F3D0",
                          color: offer.isEnabled ? "#991B1B" : "#065F46",
                          background: offer.isEnabled ? "#FEF2F2" : "#ECFDF5",
                        }}
                      >
                        {offer.isEnabled ? "Disable" : "Enable"}
                      </button>
                      <button onClick={() => openEditModal(offer)} className="p-1.5 rounded-lg border" style={{ borderColor: "var(--color-border-light)", color: "var(--color-brown-900)" }} title="Edit">
                        <Save size={13} />
                      </button>
                      <button onClick={() => handleDuplicate(offer)} className="p-1.5 rounded-lg border" style={{ borderColor: "var(--color-border-light)", color: "var(--color-brown-900)" }} title="Duplicate">
                        <Copy size={13} />
                      </button>
                      <button onClick={() => setDeletingOffer(offer)} className="p-1.5 rounded-lg border" style={{ borderColor: "#FECACA", color: "#991B1B" }} title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setModalOpen(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(61, 39, 16, 0.4)", backdropFilter: "blur(2px)" }} />
          <div
            className="relative w-full max-w-md rounded-2xl p-6 border-2 max-h-[90vh] overflow-y-auto"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-brown-900)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5 pb-3 border-b" style={{ borderColor: "var(--color-cream-300)" }}>
              <h3 className="text-base font-bold uppercase tracking-wider" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
                {editingOffer ? "Edit Offer" : "New Offer"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="w-8 h-8 rounded-lg border flex items-center justify-center" style={{ borderColor: "var(--color-brown-900)", background: "var(--color-cream-100)" }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-brown-900)" }}>Title</label>
                <input required className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Weekend Special" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-brown-900)" }}>Description</label>
                <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-brown-900)" }}>Type</label>
                  <select className="input" value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })}>
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FLAT">Flat (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-brown-900)" }}>Value</label>
                  <input required type="number" min="0" step="0.01" className="input" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-brown-900)" }}>Code (optional)</label>
                <input className="input uppercase" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. WEEKEND10" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-brown-900)" }}>Starts</label>
                  <input type="datetime-local" className="input" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-brown-900)" }}>Ends</label>
                  <input type="datetime-local" className="input" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="offerEnabled"
                  checked={form.isEnabled}
                  onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })}
                  className="w-5 h-5 accent-orange-500 cursor-pointer"
                />
                <label htmlFor="offerEnabled" className="text-sm font-bold uppercase tracking-wider cursor-pointer" style={{ color: "var(--color-brown-900)" }}>
                  Enabled
                </label>
              </div>

              <button type="submit" disabled={saving} className="btn-primary w-full py-3 text-xs font-bold uppercase tracking-wider mt-2">
                <Save size={16} /> {saving ? "Saving..." : editingOffer ? "Update Offer" : "Create Offer"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deletingOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setDeletingOffer(null)}>
          <div className="absolute inset-0" style={{ background: "rgba(61, 39, 16, 0.4)" }} />
          <div className="relative w-full max-w-sm rounded-2xl p-6 border-2" style={{ background: "var(--color-surface)", borderColor: "#991B1B" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold uppercase tracking-wider mb-3" style={{ color: "#991B1B" }}>Delete &quot;{deletingOffer.title}&quot;?</h3>
            <p className="text-sm mb-5" style={{ color: "var(--color-text-secondary)" }}>This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeletingOffer(null)} className="btn-secondary text-xs font-bold uppercase tracking-wider py-2 px-4">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-800 text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-red-900">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
