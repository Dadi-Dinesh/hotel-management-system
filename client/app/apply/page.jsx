"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Store,
  User,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  Building2,
  ChefHat,
  Sliders,
  Image as ImageIcon,
  Printer,
  CreditCard,
  FileText,
  ClipboardCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  PartyPopper,
  PlayCircle,
  HelpCircle,
} from "lucide-react";
import api from "../lib/api";
import { PLATFORM_NAME } from "../lib/branding";
import toast from "react-hot-toast";

const STEPS = [
  { key: "business", title: "Business Information", subtitle: "Basic details about your restaurant", icon: Store },
  { key: "owner", title: "Owner & Contact", subtitle: "Who should we contact for onboarding?", icon: User },
  { key: "location", title: "Restaurant Location", subtitle: "Physical address and postal code", icon: MapPin },
  { key: "branding", title: "Branding & Equipment", subtitle: "Logo, printer & optional POS details", icon: ImageIcon },
  { key: "review", title: "Review & Submit", subtitle: "Double-check your application before sending", icon: ClipboardCheck },
];

const CUISINE_PRESETS = ["Authentic Indian", "Chinese & Asian", "Multi Cuisine", "South Indian", "Cafe & Bakery", "Fast Food / Biryani"];

const emptyForm = {
  // Business
  restaurantName: "",
  cuisine: "",
  tableCount: 8,

  // Owner
  ownerName: "",
  email: "",
  phone: "",
  whatsapp: "",
  whatsappSameAsPhone: true,

  // Location
  address: "",
  city: "",
  state: "",
  pincode: "",

  // Branding & Additional
  logoFile: null,
  logoPreview: null,
  printerModel: "",
  existingPos: "",
  notes: "",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ApplyPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const shouldReduceMotion = useReducedMotion();

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const validateStep = (s) => {
    switch (s) {
      case 0: // Business
        if (!form.restaurantName.trim() || form.restaurantName.trim().length < 2) {
          toast.error("Please enter a valid restaurant name.");
          return false;
        }
        if (!form.cuisine.trim()) {
          toast.error("Please select or specify a cuisine type.");
          return false;
        }
        if (form.tableCount < 1 || form.tableCount > 200) {
          toast.error("Table count must be between 1 and 200.");
          return false;
        }
        return true;

      case 1: // Owner
        if (!form.ownerName.trim() || form.ownerName.trim().length < 2) {
          toast.error("Please enter the owner's full name.");
          return false;
        }
        if (!EMAIL_RE.test(form.email.trim())) {
          toast.error("Please provide a valid email address.");
          return false;
        }
        if (form.phone.trim().replace(/[^0-9]/g, "").length < 10) {
          toast.error("Please enter a valid 10-digit phone number.");
          return false;
        }
        const wa = (form.whatsappSameAsPhone ? form.phone : form.whatsapp).trim().replace(/[^0-9]/g, "");
        if (wa.length < 10) {
          toast.error("Please enter a valid WhatsApp number.");
          return false;
        }
        return true;

      case 2: // Location
        if (!form.address.trim() || form.address.trim().length < 4) {
          toast.error("Please enter the restaurant street address.");
          return false;
        }
        if (!form.city.trim()) {
          toast.error("Please enter your city.");
          return false;
        }
        if (!form.state.trim()) {
          toast.error("Please enter your state.");
          return false;
        }
        if (!form.pincode.trim() || form.pincode.trim().length < 4) {
          toast.error("Please enter a valid pincode.");
          return false;
        }
        return true;

      case 3: // Branding & Additional (optional)
        return true;

      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo file size must be under 5MB.");
      return;
    }
    update({ logoFile: file, logoPreview: URL.createObjectURL(file) });
  };

  const fireConfetti = async () => {
    try {
      const { default: confetti } = await import("canvas-confetti");
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ["#E8891C", "#3D2710", "#0EA5E9"] });
    } catch (e) {}
  };

  const handleSubmit = async () => {
    for (let i = 0; i < 4; i++) {
      if (!validateStep(i)) {
        setStep(i);
        return;
      }
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("restaurantName", form.restaurantName.trim());
      fd.append("cuisine", form.cuisine.trim());
      fd.append("tableCount", String(form.tableCount));
      fd.append("ownerName", form.ownerName.trim());
      fd.append("email", form.email.trim().toLowerCase());
      fd.append("phone", form.phone.trim());
      fd.append("whatsapp", (form.whatsappSameAsPhone ? form.phone : form.whatsapp).trim());
      fd.append("address", form.address.trim());
      fd.append("city", form.city.trim());
      fd.append("state", form.state.trim());
      fd.append("pincode", form.pincode.trim());
      if (form.printerModel.trim()) fd.append("printerModel", form.printerModel.trim());
      if (form.existingPos.trim()) fd.append("existingPos", form.existingPos.trim());
      if (form.notes.trim()) fd.append("notes", form.notes.trim());
      if (form.logoFile) fd.append("logo", form.logoFile);

      const res = await api.post("/applications", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSubmitted(res.data.data);
      fireConfetti();
      toast.success("Application submitted successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit your application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success Screen ──
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: "var(--color-surface, #FFFDF7)" }}>
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg text-center bg-white rounded-3xl border p-8 sm:p-10 shadow-sm"
          style={{ borderColor: "var(--color-border-light)" }}
        >
          <motion.div
            initial={shouldReduceMotion ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 240, damping: 18, delay: 0.1 }}
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "#ECFDF5", color: "#065F46" }}
          >
            <PartyPopper size={38} />
          </motion.div>

          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mb-2" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
            Application Submitted!
          </h1>
          <p className="text-sm font-bold mb-3" style={{ color: "var(--color-orange-600)" }}>
            {submitted.restaurantName}
          </p>
          <p className="text-sm mb-6 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            Thank you for applying to {PLATFORM_NAME}. Our platform team is reviewing your restaurant application.
            Upon approval, your login credentials, dashboard link, and complete QR Kit will be dispatched to <strong>{submitted.email}</strong> and WhatsApp.
          </p>

          <div className="rounded-2xl p-4 mb-6 text-left text-xs space-y-1.5" style={{ background: "var(--color-cream-100)", border: "1px solid var(--color-border-light)" }}>
            <p className="font-bold text-brown-900 uppercase tracking-wider text-[11px] mb-1">Application Summary</p>
            <p><span className="text-neutral-500">Owner:</span> {submitted.ownerName}</p>
            <p><span className="text-neutral-500">Contact:</span> {submitted.phone} | {submitted.email}</p>
            <p><span className="text-neutral-500">Tables Requested:</span> {submitted.tableCount} tables</p>
            <p><span className="text-neutral-500">Status:</span> <strong className="text-amber-700 uppercase">Under Review</strong></p>
          </div>

          <div className="space-y-3">
            <Link
              href="/application-status"
              className="btn-primary w-full py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <ClipboardCheck size={16} /> Check Application Status
            </Link>
            <Link
              href="/demo"
              className="inline-flex w-full items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider border rounded-xl"
              style={{ borderColor: "var(--color-border-light)", color: "var(--color-brown-900)" }}
            >
              <PlayCircle size={16} /> Explore Live Demo (Sree Nookambika Dhaba)
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const currentStepDef = STEPS[step];
  const StepIcon = currentStepDef.icon;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-surface, #FFFDF7)" }}>
      {/* Top Header */}
      <header className="px-6 py-6 border-b" style={{ borderColor: "var(--color-border-light)", background: "#fff" }}>
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-black text-lg uppercase tracking-widest flex items-center gap-2" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: "var(--color-brown-900)", color: "var(--color-orange-500)" }}>
              S
            </span>
            {PLATFORM_NAME}
          </Link>
          <Link href="/application-status" className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-orange-600)" }}>
            Check Existing Status →
          </Link>
        </div>
      </header>

      {/* Progress Indicator */}
      <div className="px-6 pt-8 pb-4 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="font-bold uppercase tracking-widest" style={{ color: "var(--color-orange-600)" }}>
            Step {step + 1} of {STEPS.length}
          </span>
          <span className="font-bold uppercase tracking-wider" style={{ color: "var(--color-brown-900)" }}>
            {currentStepDef.title}
          </span>
        </div>

        <div className="flex items-center gap-2" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={STEPS.length}>
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className="flex-1 h-2 rounded-full transition-all duration-300"
              style={{
                background: i <= step ? "var(--color-orange-500)" : "var(--color-cream-200)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Main Form Body */}
      <main className="flex-1 flex items-start justify-center px-4 sm:px-6 pb-14">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStepDef.key}
              initial={shouldReduceMotion ? false : { opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="rounded-3xl border p-6 sm:p-10 shadow-sm bg-white"
              style={{ borderColor: "var(--color-border-light)" }}
            >
              {/* Step Header */}
              <div className="flex items-center gap-3.5 mb-6 pb-5 border-b" style={{ borderColor: "var(--color-border-light)" }}>
                <span className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--color-cream-100)", color: "var(--color-orange-500)" }}>
                  <StepIcon size={24} />
                </span>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
                    {currentStepDef.title}
                  </h2>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {currentStepDef.subtitle}
                  </p>
                </div>
              </div>

              {/* ── STEP 1: BUSINESS ── */}
              {step === 0 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-brown-900)" }}>
                      Restaurant Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      autoFocus
                      className="input text-base font-semibold"
                      placeholder="e.g. Royal Grand Kitchen & Dhaba"
                      value={form.restaurantName}
                      onChange={(e) => update({ restaurantName: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-brown-900)" }}>
                      Cuisine Type <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {CUISINE_PRESETS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => update({ cuisine: c })}
                          className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-colors"
                          style={{
                            borderColor: form.cuisine === c ? "var(--color-orange-500)" : "var(--color-border-light)",
                            background: form.cuisine === c ? "var(--color-orange-500)" : "transparent",
                            color: form.cuisine === c ? "#fff" : "var(--color-brown-900)",
                          }}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                    <input
                      className="input text-sm"
                      placeholder="Or specify custom cuisine (e.g. Coastal Seafood, Continental)"
                      value={form.cuisine}
                      onChange={(e) => update({ cuisine: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-brown-900)" }}>
                      Table Count <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-neutral-500 mb-3">
                      We will automatically generate unique QR codes and print-ready posters for each table.
                    </p>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => update({ tableCount: Math.max(1, form.tableCount - 1) })}
                        className="w-12 h-12 rounded-2xl border-2 text-2xl font-black flex items-center justify-center transition-all hover:bg-cream-100"
                        style={{ borderColor: "var(--color-brown-900)", color: "var(--color-brown-900)" }}
                      >
                        −
                      </button>
                      <div className="text-center w-24">
                        <span className="text-4xl font-black" style={{ fontFamily: "var(--font-heading)", color: "var(--color-orange-500)" }}>
                          {form.tableCount}
                        </span>
                        <p className="text-[10px] uppercase font-bold text-neutral-400">Tables</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => update({ tableCount: Math.min(200, form.tableCount + 1) })}
                        className="w-12 h-12 rounded-2xl border-2 text-2xl font-black flex items-center justify-center transition-all hover:bg-cream-100"
                        style={{ borderColor: "var(--color-brown-900)", color: "var(--color-brown-900)" }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 2: OWNER ── */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-brown-900)" }}>
                      Owner Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      autoFocus
                      className="input"
                      placeholder="Full Name (e.g. Ramesh Kumar)"
                      value={form.ownerName}
                      onChange={(e) => update({ ownerName: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-brown-900)" }}>
                      Business Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      className="input"
                      placeholder="owner@restaurant.com"
                      value={form.email}
                      onChange={(e) => update({ email: e.target.value })}
                    />
                    <p className="text-[11px] text-neutral-500 mt-1">
                      This email will be used to log in to your Restaurant Admin Dashboard after approval.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-brown-900)" }}>
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        className="input"
                        placeholder="e.g. 9876543210"
                        value={form.phone}
                        onChange={(e) => update({ phone: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-brown-900)" }}>
                        WhatsApp Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        disabled={form.whatsappSameAsPhone}
                        className={`input ${form.whatsappSameAsPhone ? "opacity-60 bg-cream-50" : ""}`}
                        placeholder="WhatsApp Number"
                        value={form.whatsappSameAsPhone ? form.phone : form.whatsapp}
                        onChange={(e) => update({ whatsapp: e.target.value })}
                      />
                      <label className="flex items-center gap-2 mt-2 text-xs font-bold text-neutral-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.whatsappSameAsPhone}
                          onChange={(e) => update({ whatsappSameAsPhone: e.target.checked })}
                          className="w-4 h-4 rounded text-orange-500"
                        />
                        Same as Phone Number
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 3: LOCATION ── */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-brown-900)" }}>
                      Restaurant Street Address <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      autoFocus
                      rows={3}
                      className="input resize-none"
                      placeholder="Shop/Building No., Street, Landmark, Area"
                      value={form.address}
                      onChange={(e) => update({ address: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-brown-900)" }}>
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        className="input"
                        placeholder="e.g. Visakhapatnam"
                        value={form.city}
                        onChange={(e) => update({ city: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-brown-900)" }}>
                        State <span className="text-red-500">*</span>
                      </label>
                      <input
                        className="input"
                        placeholder="e.g. Andhra Pradesh"
                        value={form.state}
                        onChange={(e) => update({ state: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-brown-900)" }}>
                        Pincode <span className="text-red-500">*</span>
                      </label>
                      <input
                        className="input"
                        placeholder="e.g. 530016"
                        value={form.pincode}
                        onChange={(e) => update({ pincode: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 4: BRANDING & ADDITIONAL ── */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-brown-900)" }}>
                      Restaurant Logo <span className="text-neutral-400 font-normal">(Optional)</span>
                    </label>
                    <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl py-8 px-4 cursor-pointer transition-colors hover:bg-cream-50" style={{ borderColor: "var(--color-border-light)" }}>
                      {form.logoPreview ? (
                        <div className="flex flex-col items-center gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={form.logoPreview} alt="Logo preview" className="w-24 h-24 rounded-2xl object-cover border-2 shadow-sm" style={{ borderColor: "var(--color-brown-900)" }} />
                          <span className="text-xs font-bold text-orange-600 underline">Change Image</span>
                        </div>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-cream-100 text-orange-500">
                            <ImageIcon size={24} />
                          </div>
                          <div className="text-center">
                            <span className="text-xs font-bold uppercase tracking-wide text-brown-900">Click to upload logo</span>
                            <p className="text-[11px] text-neutral-400">PNG, JPG, or WebP up to 5MB</p>
                          </div>
                        </>
                      )}
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoChange} />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: "var(--color-brown-900)" }}>
                        <Printer size={13} /> Printer Model <span className="text-neutral-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        className="input text-sm"
                        placeholder="e.g. Epson TM-T82X, TVS RP-3200"
                        value={form.printerModel}
                        onChange={(e) => update({ printerModel: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: "var(--color-brown-900)" }}>
                        <CreditCard size={13} /> Existing POS System <span className="text-neutral-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        className="input text-sm"
                        placeholder="e.g. Petpooja, Posist, Manual Book"
                        value={form.existingPos}
                        onChange={(e) => update({ existingPos: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: "var(--color-brown-900)" }}>
                      <FileText size={13} /> Additional Notes & Requests <span className="text-neutral-400 font-normal">(Optional)</span>
                    </label>
                    <textarea
                      rows={3}
                      className="input resize-none text-sm"
                      placeholder="Any specific requirements, target launch date, or questions for our team"
                      value={form.notes}
                      onChange={(e) => update({ notes: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* ── STEP 5: REVIEW & SUBMIT ── */}
              {step === 4 && (
                <div className="space-y-6">
                  <div className="rounded-2xl p-5 border space-y-4" style={{ borderColor: "var(--color-border-light)", background: "var(--color-cream-100)" }}>
                    <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                      <div>
                        <p className="font-black text-base text-brown-900">{form.restaurantName}</p>
                        <p className="text-xs text-neutral-500">{form.cuisine} • {form.tableCount} Tables</p>
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-orange-100 text-orange-700">
                        Ready to Submit
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="font-bold text-neutral-400 uppercase text-[10px]">Owner</p>
                        <p className="font-semibold text-brown-900">{form.ownerName}</p>
                      </div>
                      <div>
                        <p className="font-bold text-neutral-400 uppercase text-[10px]">Email (Login)</p>
                        <p className="font-semibold text-brown-900">{form.email}</p>
                      </div>
                      <div>
                        <p className="font-bold text-neutral-400 uppercase text-[10px]">Phone & WhatsApp</p>
                        <p className="font-semibold text-brown-900">{form.phone}</p>
                      </div>
                      <div>
                        <p className="font-bold text-neutral-400 uppercase text-[10px]">Location</p>
                        <p className="font-semibold text-brown-900">{form.city}, {form.state} {form.pincode}</p>
                      </div>
                    </div>

                    {(form.printerModel || form.existingPos || form.notes) && (
                      <div className="pt-3 border-t border-stone-200 text-xs space-y-1">
                        {form.printerModel && <p><span className="font-bold text-neutral-500">Printer:</span> {form.printerModel}</p>}
                        {form.existingPos && <p><span className="font-bold text-neutral-500">Existing POS:</span> {form.existingPos}</p>}
                        {form.notes && <p><span className="font-bold text-neutral-500">Notes:</span> {form.notes}</p>}
                      </div>
                    )}
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-950">
                    <CheckCircle2 size={18} className="text-orange-600 flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      By submitting this registration, our Platform Team will review your application. Upon approval, your restaurant instance, tables, QR codes, and temporary login credentials will be automatically provisioned.
                    </p>
                  </div>
                </div>
              )}

              {/* Form Navigation Controls */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t" style={{ borderColor: "var(--color-border-light)" }}>
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={step === 0}
                  className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl border disabled:opacity-30 transition-all hover:bg-cream-100"
                  style={{ borderColor: "var(--color-border-light)", color: "var(--color-brown-900)" }}
                >
                  <ArrowLeft size={14} /> Back
                </button>

                {step === STEPS.length - 1 ? (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="btn-primary flex items-center gap-2 px-7 py-3 text-sm font-bold uppercase tracking-wider shadow-md"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    {submitting ? "Submitting Application..." : "Submit Application"}
                  </motion.button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={handleNext}
                    className="btn-primary flex items-center gap-2 px-7 py-3 text-xs font-bold uppercase tracking-wider"
                  >
                    Continue <ArrowRight size={14} />
                  </motion.button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
