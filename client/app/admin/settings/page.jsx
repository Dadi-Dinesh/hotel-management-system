"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Save,
  Image as ImageIcon,
  X,
  Store,
  Palette,
  SlidersHorizontal,
  QrCode,
  Users,
  Receipt,
  AlertTriangle,
  ArrowRight,
  Power,
  Smartphone,
} from "lucide-react";
import api from "../../lib/api";
import { getUser, isAuthenticated } from "../../lib/auth";
import { useRestaurant } from "../../components/RestaurantContext";
import DashboardHeader from "../../components/admin/DashboardHeader";
import PwaSettingsPanel from "../../components/admin/PwaSettingsPanel";
import toast from "react-hot-toast";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED"];
const TIME_ZONES = ["Asia/Kolkata", "Asia/Dubai", "Europe/London", "America/New_York", "America/Los_Angeles"];

const TABS = [
  { key: "general", label: "General", icon: Store },
  { key: "branding", label: "Branding", icon: Palette },
  { key: "operations", label: "Operations", icon: SlidersHorizontal },
  { key: "qr", label: "QR Management", icon: QrCode },
  { key: "staff", label: "Staff", icon: Users },
  { key: "receipt", label: "Receipt", icon: Receipt },
  { key: "pwa", label: "App & Offline", icon: Smartphone },
  { key: "danger", label: "Danger Zone", icon: AlertTriangle },
];

export default function RestaurantSettingsPage() {
  const router = useRouter();
  const { restaurant: contextRestaurant, loading: restaurantLoading } = useRestaurant();
  const [restaurant, setRestaurant] = useState(null);
  const [form, setForm] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [confirmingDisable, setConfirmingDisable] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);

  useEffect(() => {
    if (!isAuthenticated() || getUser()?.role !== "ADMIN") {
      router.push("/admin/login");
    }
  }, [router]);

  const loadSettings = () => {
    if (!contextRestaurant?.slug) return;
    api
      .get(`/restaurants/${contextRestaurant.slug}/settings`)
      .then((res) => {
        const full = res.data.data;
        setRestaurant(full);
        setForm({
          name: full.name || "",
          shortName: full.shortName || "",
          cuisine: full.cuisine || "",
          phone: full.phone || "",
          email: full.email || "",
          address: full.address || "",
          primaryColor: full.primaryColor || "#E8891C",
          secondaryColor: full.secondaryColor || "#3D2710",
          accentColor: full.accentColor || "#0EA5E9",
          receiptFooter: full.receiptFooter || "",
          welcomeMessage: full.welcomeMessage || "",
          currency: full.currency || "INR",
          timeZone: full.timeZone || "Asia/Kolkata",
          taxPercent: full.taxPercent ?? 0,
          serviceChargePercent: full.serviceChargePercent ?? 0,
        });
        setLogoPreview(full.logo || null);
        setCoverPreview(full.coverImage || null);
      })
      .catch(() => toast.error("Failed to load settings"));
  };

  useEffect(loadSettings, [contextRestaurant]);

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSave = async () => {
    if (!restaurant?.slug) {
      toast.error("No restaurant selected.");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([key, value]) => fd.append(key, value));
      if (logoFile) fd.append("logo", logoFile);
      if (coverFile) fd.append("coverImage", coverFile);
      if (logoFile === null && logoPreview === null && restaurant.logo) fd.append("removeLogo", "true");
      if (coverFile === null && coverPreview === null && restaurant.coverImage) fd.append("removeCoverImage", "true");

      await api.patch(`/restaurants/${restaurant.slug}/settings`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Settings saved.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!restaurant?.slug) return;
    setTogglingActive(true);
    try {
      const res = await api.patch(`/restaurants/${restaurant.slug}/status`, { isActive: !restaurant.isActive });
      setRestaurant((prev) => ({ ...prev, isActive: res.data.data.isActive }));
      toast.success(res.data.message);
      setConfirmingDisable(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update restaurant status");
    } finally {
      setTogglingActive(false);
    }
  };

  if (restaurantLoading || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-surface)" }}>
        <div className="animate-pulse text-sm font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
          Loading settings...
        </div>
      </div>
    );
  }

  const showSaveBar = ["general", "branding", "operations", "receipt"].includes(activeTab);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--ss-bg)" }}>
      <DashboardHeader title="Restaurant Settings" subtitle={restaurant?.name} />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Tab switcher */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 -mx-1 px-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all shrink-0"
              style={{
                background: activeTab === key ? "var(--color-brown-900)" : "var(--color-cream-50, #fff)",
                color: activeTab === key ? "white" : "var(--color-text-secondary)",
                borderColor: activeTab === key ? "var(--color-brown-900)" : "var(--color-border-light)",
              }}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {activeTab === "general" && (
              <section className="rounded-2xl p-5 border space-y-3" style={{ borderColor: "var(--color-border-light)", background: "var(--color-cream-50, #fff)" }}>
                <h2 className="text-sm font-black uppercase tracking-wide mb-1" style={{ color: "var(--color-brown-900)" }}>Restaurant Info</h2>
                <Field label="Name"><input className="input" value={form.name} onChange={(e) => update({ name: e.target.value })} /></Field>
                <Field label="Short Name (used in headers)"><input className="input" value={form.shortName} onChange={(e) => update({ shortName: e.target.value })} /></Field>
                <Field label="Cuisine"><input className="input" value={form.cuisine} onChange={(e) => update({ cuisine: e.target.value })} /></Field>
                <Field label="Phone"><input className="input" value={form.phone} onChange={(e) => update({ phone: e.target.value })} /></Field>
                <Field label="Email"><input type="email" className="input" value={form.email} onChange={(e) => update({ email: e.target.value })} /></Field>
                <Field label="Address"><textarea rows={2} className="input resize-none" value={form.address} onChange={(e) => update({ address: e.target.value })} /></Field>
              </section>
            )}

            {activeTab === "branding" && (
              <>
                <section className="rounded-2xl p-5 border space-y-4" style={{ borderColor: "var(--color-border-light)", background: "var(--color-cream-50, #fff)" }}>
                  <h2 className="text-sm font-black uppercase tracking-wide" style={{ color: "var(--color-brown-900)" }}>Branding Images</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <ImagePicker
                      label="Logo"
                      preview={logoPreview}
                      onChange={(file) => {
                        setLogoFile(file);
                        setLogoPreview(file ? URL.createObjectURL(file) : null);
                      }}
                      onRemove={() => {
                        setLogoFile(null);
                        setLogoPreview(null);
                      }}
                    />
                    <ImagePicker
                      label="Cover Image"
                      preview={coverPreview}
                      onChange={(file) => {
                        setCoverFile(file);
                        setCoverPreview(file ? URL.createObjectURL(file) : null);
                      }}
                      onRemove={() => {
                        setCoverFile(null);
                        setCoverPreview(null);
                      }}
                    />
                  </div>
                </section>

                <section className="rounded-2xl p-5 border space-y-3" style={{ borderColor: "var(--color-border-light)", background: "var(--color-cream-50, #fff)" }}>
                  <h2 className="text-sm font-black uppercase tracking-wide mb-1" style={{ color: "var(--color-brown-900)" }}>Colors</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Primary Color">
                      <div className="flex items-center gap-2">
                        <input type="color" value={form.primaryColor} onChange={(e) => update({ primaryColor: e.target.value })} className="w-10 h-10 rounded cursor-pointer" />
                        <input className="input" value={form.primaryColor} onChange={(e) => update({ primaryColor: e.target.value })} />
                      </div>
                    </Field>
                    <Field label="Secondary Color">
                      <div className="flex items-center gap-2">
                        <input type="color" value={form.secondaryColor} onChange={(e) => update({ secondaryColor: e.target.value })} className="w-10 h-10 rounded cursor-pointer" />
                        <input className="input" value={form.secondaryColor} onChange={(e) => update({ secondaryColor: e.target.value })} />
                      </div>
                    </Field>
                    <Field label="Accent Color">
                      <div className="flex items-center gap-2">
                        <input type="color" value={form.accentColor} onChange={(e) => update({ accentColor: e.target.value })} className="w-10 h-10 rounded cursor-pointer" />
                        <input className="input" value={form.accentColor} onChange={(e) => update({ accentColor: e.target.value })} />
                      </div>
                    </Field>
                  </div>
                </section>
              </>
            )}

            {activeTab === "operations" && (
              <section className="rounded-2xl p-5 border space-y-3" style={{ borderColor: "var(--color-border-light)", background: "var(--color-cream-50, #fff)" }}>
                <h2 className="text-sm font-black uppercase tracking-wide mb-1" style={{ color: "var(--color-brown-900)" }}>Operations</h2>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Currency">
                    <select className="input" value={form.currency} onChange={(e) => update({ currency: e.target.value })}>
                      {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Time Zone">
                    <select className="input" value={form.timeZone} onChange={(e) => update({ timeZone: e.target.value })}>
                      {TIME_ZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                  </Field>
                  <Field label="Tax (%)">
                    <input type="number" min="0" max="100" step="0.1" className="input" value={form.taxPercent} onChange={(e) => update({ taxPercent: e.target.value })} />
                  </Field>
                  <Field label="Service Charge (%)">
                    <input type="number" min="0" max="100" step="0.1" className="input" value={form.serviceChargePercent} onChange={(e) => update({ serviceChargePercent: e.target.value })} />
                  </Field>
                </div>
              </section>
            )}

            {activeTab === "qr" && (
              <LinkOutCard
                icon={QrCode}
                title="QR Management Center"
                description="Preview, regenerate, and print secure QR codes for every table — individually or in bulk."
                href="/admin/qr-codes"
                cta="Open QR Management"
              />
            )}

            {activeTab === "staff" && (
              <LinkOutCard
                icon={Users}
                title="Staff & Invites"
                description="Manage accounts, send invite codes, and view pending/accepted staff invites."
                href="/admin/captains"
                cta="Open Staff & Invites"
              />
            )}

            {activeTab === "receipt" && (
              <section className="rounded-2xl p-5 border space-y-3" style={{ borderColor: "var(--color-border-light)", background: "var(--color-cream-50, #fff)" }}>
                <h2 className="text-sm font-black uppercase tracking-wide mb-1" style={{ color: "var(--color-brown-900)" }}>Receipt & Welcome Message</h2>
                <Field label="Receipt Footer (printed on bills)">
                  <textarea rows={2} className="input resize-none" value={form.receiptFooter} onChange={(e) => update({ receiptFooter: e.target.value })} placeholder="Thank you for dining with us!" />
                </Field>
                <Field label="Customer Welcome Message (shown on the table landing page)">
                  <textarea rows={3} className="input resize-none" value={form.welcomeMessage} onChange={(e) => update({ welcomeMessage: e.target.value })} placeholder="Welcome! Browse our menu and place your order anytime." />
                </Field>
              </section>
            )}

            {activeTab === "pwa" && <PwaSettingsPanel />}

            {activeTab === "danger" && (
              <section className="rounded-2xl p-5 border-2 space-y-4" style={{ borderColor: "#FCA5A5", background: "#FEF2F2" }}>
                <h2 className="text-sm font-black uppercase tracking-wide flex items-center gap-2" style={{ color: "#991B1B" }}>
                  <AlertTriangle size={16} /> Danger Zone
                </h2>
                <div className="rounded-xl p-4 border" style={{ borderColor: "#FCA5A5", background: "white" }}>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-sm font-bold" style={{ color: "var(--color-brown-900)" }}>
                      Restaurant is currently {restaurant?.isActive ? "Active" : "Disabled"}
                    </p>
                    <span
                      className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full"
                      style={{ background: restaurant?.isActive ? "#ECFDF5" : "#F3F4F6", color: restaurant?.isActive ? "#065F46" : "#6B7280" }}
                    >
                      {restaurant?.isActive ? "Live" : "Disabled"}
                    </span>
                  </div>
                  <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
                    Disabling hides your ordering pages from customers but keeps every table, order, and menu item intact — nothing is ever deleted. You can re-enable anytime.
                  </p>

                  {!confirmingDisable ? (
                    <button
                      onClick={() => setConfirmingDisable(true)}
                      className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-2"
                      style={{
                        borderColor: restaurant?.isActive ? "#DC2626" : "var(--color-success)",
                        color: restaurant?.isActive ? "#DC2626" : "var(--color-success)",
                        background: "white",
                      }}
                    >
                      <Power size={14} /> {restaurant?.isActive ? "Disable Restaurant" : "Re-enable Restaurant"}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-center" style={{ color: "#991B1B" }}>
                        {restaurant?.isActive
                          ? "Are you sure? Customers won't be able to order until you re-enable it."
                          : "Re-enable ordering for customers now?"}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmingDisable(false)}
                          className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border"
                          style={{ borderColor: "var(--color-border-light)", color: "var(--color-text-secondary)" }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleToggleActive}
                          disabled={togglingActive}
                          className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white"
                          style={{ background: restaurant?.isActive ? "#DC2626" : "var(--color-success)" }}
                        >
                          {togglingActive ? "Working..." : "Confirm"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {showSaveBar && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary w-full py-3.5 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <Save size={16} /> {saving ? "Saving..." : "Save Settings"}
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function LinkOutCard({ icon: Icon, title, description, href, cta }) {
  return (
    <section className="rounded-2xl p-6 border space-y-3 text-center" style={{ borderColor: "var(--color-border-light)", background: "var(--color-cream-50, #fff)" }}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto" style={{ background: "var(--color-cream-200)" }}>
        <Icon size={22} style={{ color: "var(--color-orange-500)" }} />
      </div>
      <h2 className="text-sm font-black uppercase tracking-wide" style={{ color: "var(--color-brown-900)" }}>{title}</h2>
      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{description}</p>
      <Link
        href={href}
        className="btn-primary inline-flex items-center gap-2 py-2.5 px-5 text-xs font-bold uppercase tracking-wider mt-1"
      >
        {cta} <ArrowRight size={14} />
      </Link>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ImagePicker({ label, preview, onChange, onRemove }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
        {label}
      </label>
      {preview ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt={label} className="w-full h-28 object-cover rounded-xl border" style={{ borderColor: "var(--color-border-light)" }} />
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center bg-white/90 shadow-sm"
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center gap-1.5 h-28 border-2 border-dashed rounded-xl cursor-pointer hover:bg-cream-100 transition-colors" style={{ borderColor: "var(--color-border-light)" }}>
          <ImageIcon size={22} style={{ color: "var(--color-text-muted)" }} />
          <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Upload</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && onChange(e.target.files[0])} />
        </label>
      )}
    </div>
  );
}
