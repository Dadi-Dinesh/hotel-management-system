"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  UtensilsCrossed,
  Phone,
  MapPin,
  Image as ImageIcon,
  Palette,
  Sliders,
  QrCode,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Rocket,
  ChefHat,
} from "lucide-react";
import api from "../lib/api";
import { setAuth } from "../lib/auth";
import { PLATFORM_NAME } from "../lib/branding";
import { generateTablePostersPDF, generateQRDataUrl } from "../lib/posterUtils";
import toast from "react-hot-toast";

const STEPS = [
  { key: "welcome", title: "Welcome", icon: Rocket },
  { key: "details", title: "Restaurant Details", icon: UtensilsCrossed },
  { key: "cuisine", title: "Cuisine", icon: ChefHat },
  { key: "address", title: "Address", icon: MapPin },
  { key: "phone", title: "Phone", icon: Phone },
  { key: "logo", title: "Logo Upload", icon: ImageIcon },
  { key: "color", title: "Brand Colors", icon: Palette },
  { key: "tables", title: "Table Count", icon: Sliders },
  { key: "qr", title: "QR Generation", icon: QrCode },
];

const COLOR_PRESETS = ["#E8891C", "#C62828", "#2E7D32", "#1565C0", "#6A1B9A", "#00838F"];

const emptyForm = {
  name: "",
  cuisine: "",
  phone: "",
  address: "",
  logoFile: null,
  logoPreview: null,
  primaryColor: "#E8891C",
  tableCount: 8,
  adminName: "",
  adminEmail: "",
  adminPassword: "",
};

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState(null);
  const [downloadingPosters, setDownloadingPosters] = useState(false);
  const [previewQr, setPreviewQr] = useState(null);

  const isQrStep = STEPS[step].key === "qr";

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const canAdvance = () => {
    switch (STEPS[step].key) {
      case "details":
        return form.name.trim().length > 1 && form.adminName.trim() && form.adminEmail.trim() && form.adminPassword.length >= 6;
      case "tables":
        return form.tableCount >= 1 && form.tableCount <= 50;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (!canAdvance()) {
      toast.error("Please complete this step before continuing.");
      return;
    }
    const next = Math.min(step + 1, STEPS.length - 1);
    setStep(next);
    if (STEPS[next].key === "qr" && !previewQr) {
      // Preview only — the real per-table secure token is issued at creation.
      const url = `${window.location.origin}/restaurant/your-slug/table/T01`;
      generateQRDataUrl(url).then(setPreviewQr).catch(() => {});
    }
  };
  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    update({ logoFile: file, logoPreview: URL.createObjectURL(file) });
  };

  const fireConfetti = async () => {
    try {
      const { default: confetti } = await import("canvas-confetti");
      const colors = [form.primaryColor, "#E8891C", "#3D2710"];
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors });
      setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 }, colors }), 200);
      setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 }, colors }), 200);
    } catch (e) {
      // Confetti is a pure delight-add — never block the success screen on it.
    }
  };

  const handleCreate = async () => {
    if (!canAdvance()) {
      toast.error("Please go back and fill in every required field.");
      return;
    }
    setCreating(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("cuisine", form.cuisine);
      fd.append("phone", form.phone);
      fd.append("address", form.address);
      fd.append("primaryColor", form.primaryColor);
      fd.append("tableCount", String(form.tableCount));
      fd.append("adminName", form.adminName);
      fd.append("adminEmail", form.adminEmail);
      fd.append("adminPassword", form.adminPassword);
      if (form.logoFile) fd.append("logo", form.logoFile);

      const res = await api.post("/restaurants", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const { token, user, restaurant, tables } = res.data.data;

      setAuth(token, user, restaurant);
      setResult({ restaurant, tables });
      toast.success(`${restaurant.name} is ready!`);
      fireConfetti();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create your restaurant");
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadPosters = async () => {
    if (!result) return;
    setDownloadingPosters(true);
    try {
      await generateTablePostersPDF({ restaurant: result.restaurant, tables: result.tables });
    } catch (error) {
      toast.error("Failed to generate QR posters — you can retry from Table Management.");
    } finally {
      setDownloadingPosters(false);
    }
  };

  // ── Success Celebration screen ──
  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--color-surface)" }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "#ECFDF5", color: "#065F46" }}
          >
            <CheckCircle2 size={40} />
          </motion.div>
          <h1 className="text-2xl font-black uppercase tracking-wide mb-2" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
            Your restaurant is ready!
          </h1>
          <p className="text-sm mb-1 font-bold" style={{ color: "var(--color-brown-900)" }}>{result.restaurant.name}</p>
          <p className="text-sm mb-8" style={{ color: "var(--color-text-muted)" }}>
            {result.tables.length} tables created with secure QR codes ready to print. Your 14-day free trial has started.
          </p>
          <div className="space-y-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleDownloadPosters}
              disabled={downloadingPosters}
              className="btn-secondary w-full py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <QrCode size={16} /> {downloadingPosters ? "Generating..." : "Download QR Code Posters"}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push("/admin/dashboard")}
              className="btn-primary w-full py-3 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2"
            >
              Open Dashboard <ArrowRight size={16} />
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-surface)" }}>
      {/* Progress header */}
      <div className="px-6 pt-8 pb-4 max-w-lg mx-auto w-full">
        <p className="text-xs font-bold uppercase tracking-widest text-center mb-3" style={{ color: "var(--color-text-muted)" }}>
          Set Up Your Restaurant on {PLATFORM_NAME}
        </p>
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className="flex-1 h-1.5 rounded-full transition-colors duration-300"
              style={{ background: i <= step ? "var(--color-orange-500)" : "var(--color-cream-200)" }}
            />
          ))}
        </div>
        <p className="text-center text-[11px] font-bold uppercase tracking-wider mt-2" style={{ color: "var(--color-brown-900)" }}>
          Step {step + 1} of {STEPS.length} — {STEPS[step].title}
        </p>
      </div>

      <main className="flex-1 flex items-start justify-center px-6 pb-10">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            <motion.div
              key={STEPS[step].key}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl border p-6 sm:p-8"
              style={{ borderColor: "var(--color-border-light)", background: "var(--color-cream-50, #fff)" }}
            >
              {STEPS[step].key === "welcome" && (
                <StepShell icon={Rocket} title={`Welcome to ${PLATFORM_NAME}`} subtitle="Let's get your restaurant online in a couple of minutes — QR ordering, kitchen display, and a full admin dashboard, all set up automatically.">
                  <div className="rounded-xl p-4 text-xs space-y-1.5" style={{ background: "var(--color-cream-100)", color: "var(--color-text-secondary)" }}>
                    <p>✓ Secure, per-table QR codes generated for you</p>
                    <p>✓ Your own branded customer ordering page</p>
                    <p>✓ 14-day free trial — no card required</p>
                  </div>
                </StepShell>
              )}

              {STEPS[step].key === "details" && (
                <StepShell icon={UtensilsCrossed} title="Tell us about your restaurant" subtitle="This creates your admin account and logs you straight in.">
                  <div className="space-y-3">
                    <input
                      autoFocus
                      className="input text-base font-bold"
                      placeholder="Restaurant name, e.g. Spice Garden"
                      value={form.name}
                      onChange={(e) => update({ name: e.target.value })}
                    />
                    <input className="input" placeholder="Your name" value={form.adminName} onChange={(e) => update({ adminName: e.target.value })} />
                    <input type="email" className="input" placeholder="you@restaurant.com" value={form.adminEmail} onChange={(e) => update({ adminEmail: e.target.value })} />
                    <input type="password" className="input" placeholder="Password (min. 6 characters)" value={form.adminPassword} onChange={(e) => update({ adminPassword: e.target.value })} minLength={6} />
                  </div>
                </StepShell>
              )}

              {STEPS[step].key === "cuisine" && (
                <StepShell icon={ChefHat} title="What cuisine do you serve?" subtitle="Optional — shown on your customer menu page">
                  <input
                    autoFocus
                    className="input text-lg font-bold"
                    placeholder="e.g. North Indian, Italian, Multi-cuisine"
                    value={form.cuisine}
                    onChange={(e) => update({ cuisine: e.target.value })}
                  />
                </StepShell>
              )}

              {STEPS[step].key === "address" && (
                <StepShell icon={MapPin} title="Where are you located?" subtitle="Optional — you can add this later from Settings">
                  <textarea
                    autoFocus
                    rows={3}
                    className="input text-base resize-none"
                    placeholder="Street, city, state"
                    value={form.address}
                    onChange={(e) => update({ address: e.target.value })}
                  />
                </StepShell>
              )}

              {STEPS[step].key === "phone" && (
                <StepShell icon={Phone} title="Contact phone number" subtitle="Optional — you can add this later from Settings">
                  <input
                    autoFocus
                    type="tel"
                    className="input text-lg font-bold"
                    placeholder="e.g. 98765 43210"
                    value={form.phone}
                    onChange={(e) => update({ phone: e.target.value })}
                  />
                </StepShell>
              )}

              {STEPS[step].key === "logo" && (
                <StepShell icon={ImageIcon} title="Upload your logo" subtitle="Optional — you can add this later from Settings">
                  <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-10 cursor-pointer transition-colors hover:bg-cream-100" style={{ borderColor: "var(--color-border-light)" }}>
                    {form.logoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.logoPreview} alt="Logo preview" className="w-24 h-24 rounded-full object-cover border-2" style={{ borderColor: "var(--color-brown-900)" }} />
                    ) : (
                      <>
                        <ImageIcon size={32} style={{ color: "var(--color-text-muted)" }} />
                        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                          Click to upload
                        </span>
                      </>
                    )}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoChange} />
                  </label>
                </StepShell>
              )}

              {STEPS[step].key === "color" && (
                <StepShell icon={Palette} title="Pick a brand color">
                  <div className="grid grid-cols-6 gap-3">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        onClick={() => update({ primaryColor: c })}
                        className="aspect-square rounded-full border-4 transition-transform hover:scale-110"
                        style={{ background: c, borderColor: form.primaryColor === c ? "var(--color-brown-900)" : "transparent" }}
                        aria-label={c}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={form.primaryColor}
                    onChange={(e) => update({ primaryColor: e.target.value })}
                    className="mt-4 w-full h-10 rounded-lg cursor-pointer"
                  />
                </StepShell>
              )}

              {STEPS[step].key === "tables" && (
                <StepShell icon={Sliders} title="How many tables do you have?" subtitle="We'll auto-create T01 through TNN with secure QR codes ready to print">
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => update({ tableCount: Math.max(1, form.tableCount - 1) })}
                      className="w-12 h-12 rounded-full border-2 text-xl font-black flex items-center justify-center"
                      style={{ borderColor: "var(--color-brown-900)", color: "var(--color-brown-900)" }}
                    >
                      −
                    </button>
                    <span className="text-4xl font-black w-20 text-center" style={{ fontFamily: "var(--font-heading)", color: "var(--color-orange-500)" }}>
                      {form.tableCount}
                    </span>
                    <button
                      onClick={() => update({ tableCount: Math.min(50, form.tableCount + 1) })}
                      className="w-12 h-12 rounded-full border-2 text-xl font-black flex items-center justify-center"
                      style={{ borderColor: "var(--color-brown-900)", color: "var(--color-brown-900)" }}
                    >
                      +
                    </button>
                  </div>
                </StepShell>
              )}

              {STEPS[step].key === "qr" && (
                <StepShell icon={QrCode} title="Your QR codes are ready to generate" subtitle="A unique, secure QR code is created for every table the moment you confirm — here's a preview of what customers will scan.">
                  <div className="flex flex-col items-center gap-4">
                    {previewQr ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previewQr} alt="QR code preview" className="w-36 h-36 rounded-lg border-2" style={{ borderColor: "var(--color-brown-900)" }} />
                    ) : (
                      <div className="w-36 h-36 rounded-lg animate-pulse" style={{ background: "var(--color-cream-200)" }} />
                    )}
                    <p className="text-[10px] font-bold uppercase tracking-wide text-center" style={{ color: "var(--color-text-muted)" }}>
                      Sample layout — Table T01 · your real codes are unique per table
                    </p>
                  </div>
                  <div className="mt-5 p-3 rounded-lg text-xs space-y-1" style={{ background: "var(--color-cream-100)", color: "var(--color-text-secondary)" }}>
                    <p><strong>{form.name || "—"}</strong> · {form.cuisine || "No cuisine set"}</p>
                    <p>{form.tableCount} tables · Brand color <span className="inline-block w-3 h-3 rounded-full align-middle" style={{ background: form.primaryColor }} /></p>
                    <p>14-day free trial starts immediately</p>
                  </div>
                </StepShell>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Nav buttons */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={handleBack}
              disabled={step === 0}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-lg disabled:opacity-30"
              style={{ color: "var(--color-brown-900)" }}
            >
              <ArrowLeft size={14} /> Back
            </button>

            {isQrStep ? (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleCreate}
                disabled={creating}
                className="btn-primary flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-wider"
              >
                {creating ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {creating ? "Creating..." : "Create Restaurant"}
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleNext}
                className="btn-primary flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-wider"
              >
                Next <ArrowRight size={16} />
              </motion.button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StepShell({ icon: Icon, title, subtitle, children }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--color-cream-100)", color: "var(--color-orange-500)" }}>
          <Icon size={18} />
        </span>
        <h2 className="text-lg font-black" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
          {title}
        </h2>
      </div>
      {subtitle && <p className="text-xs mb-4 ml-13" style={{ color: "var(--color-text-muted)" }}>{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}
