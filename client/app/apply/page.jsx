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
  AlertCircle,
} from "lucide-react";
import api from "../lib/api";
import { PLATFORM_NAME } from "../lib/branding";
import MarketingNav from "../components/marketing/MarketingNav";
import toast from "react-hot-toast";

const STEPS = [
  { key: "business", title: "Business Information", subtitle: "Basic details about your restaurant", icon: Store },
  { key: "owner", title: "Owner & Contact", subtitle: "Who should we contact for onboarding?", icon: User },
  { key: "location", title: "Restaurant Location", subtitle: "Physical address and postal code", icon: MapPin },
  { key: "branding", title: "Branding & Equipment", subtitle: "Logo, printer & optional POS details", icon: ImageIcon },
  { key: "review", title: "Review & Submit", subtitle: "Double-check your application before sending", icon: ClipboardCheck },
];

const CUISINE_PRESETS = [
  "Authentic Indian",
  "Chinese & Asian",
  "Multi Cuisine",
  "South Indian",
  "Cafe & Bakery",
  "Fast Food / Biryani",
];

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
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const shouldReduceMotion = useReducedMotion();

  const update = (patch) => {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      // Keep whatsapp in sync if "same as phone" is selected
      if (patch.phone !== undefined && prev.whatsappSameAsPhone) {
        next.whatsapp = patch.phone;
      }
      if (patch.whatsappSameAsPhone === true) {
        next.whatsapp = next.phone;
      }
      return next;
    });

    // Clear errors for edited fields
    setErrors((prev) => {
      const copy = { ...prev };
      for (const k of Object.keys(patch)) {
        delete copy[k];
      }
      return copy;
    });
  };

  const validateStep = (s) => {
    const stepErrors = {};

    switch (s) {
      case 0: // Business
        if (!form.restaurantName.trim() || form.restaurantName.trim().length < 2) {
          stepErrors.restaurantName = "Please enter a valid restaurant name (at least 2 characters).";
        }
        if (!form.cuisine.trim()) {
          stepErrors.cuisine = "Please select or type your cuisine type.";
        }
        if (form.tableCount < 1 || form.tableCount > 200) {
          stepErrors.tableCount = "Table count must be between 1 and 200.";
        }
        break;

      case 1: // Owner
        if (!form.ownerName.trim() || form.ownerName.trim().length < 2) {
          stepErrors.ownerName = "Please enter the owner's full name.";
        }
        if (!EMAIL_RE.test(form.email.trim())) {
          stepErrors.email = "Please provide a valid email address.";
        }
        const phoneDigits = form.phone.trim().replace(/[^0-9]/g, "");
        if (phoneDigits.length < 10) {
          stepErrors.phone = "Please enter a valid 10-digit phone number.";
        }
        const waValue = form.whatsappSameAsPhone ? form.phone : form.whatsapp;
        const waDigits = waValue.trim().replace(/[^0-9]/g, "");
        if (waDigits.length < 10) {
          stepErrors.whatsapp = "Please enter a valid 10-digit WhatsApp number.";
        }
        break;

      case 2: // Location
        if (!form.address.trim() || form.address.trim().length < 4) {
          stepErrors.address = "Please enter the complete street address.";
        }
        if (!form.city.trim()) {
          stepErrors.city = "Please enter your city.";
        }
        if (!form.state.trim()) {
          stepErrors.state = "Please enter your state.";
        }
        if (!form.pincode.trim() || form.pincode.trim().length < 4) {
          stepErrors.pincode = "Please enter a valid postal pincode.";
        }
        break;

      case 3: // Branding (optional)
        break;

      default:
        break;
    }

    setErrors(stepErrors);

    if (Object.keys(stepErrors).length > 0) {
      const firstKey = Object.keys(stepErrors)[0];
      toast.error(stepErrors[firstKey]);
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleStepJump = (targetStep) => {
    if (targetStep < step) {
      setErrors({});
      setStep(targetStep);
      return;
    }
    // If jumping forward, ensure current step is valid
    if (validateStep(step)) {
      setStep(targetStep);
    }
  };

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

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    // Validate all steps from 0 to 3
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
      toast.error(error.response?.data?.message || "Failed to submit your application. Please check your information and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success Screen ──
  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "var(--color-surface, #FFFDF7)" }}>
        <MarketingNav />
        <div className="flex-1 flex items-center justify-center px-4 py-12">
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
                <PlayCircle size={16} /> Explore Live Demo
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const currentStepDef = STEPS[step];
  const StepIcon = currentStepDef.icon;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-surface, #FFFDF7)" }}>
      {/* Canonical Marketing Navigation */}
      <MarketingNav />

      {/* Sub-Header Banner */}
      <div className="bg-cream-100 border-b py-2.5 px-4 text-center text-xs font-medium" style={{ borderColor: "var(--color-border-light)", color: "var(--color-brown-900)" }}>
        Already registered?{" "}
        <Link href="/application-status" className="font-bold underline text-orange-600 hover:text-orange-700">
          Track Your Application Status →
        </Link>
      </div>

      {/* Progress Indicator */}
      <div className="px-4 sm:px-6 pt-8 pb-4 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="font-bold uppercase tracking-widest text-orange-600">
            Step {step + 1} of {STEPS.length}
          </span>
          <span className="font-bold uppercase tracking-wider text-brown-900">
            {currentStepDef.title}
          </span>
        </div>

        {/* Step clickable segments */}
        <div className="grid grid-cols-5 gap-2" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={STEPS.length}>
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              type="button"
              onClick={() => handleStepJump(i)}
              className="h-2 rounded-full transition-all duration-300 w-full"
              style={{
                background: i <= step ? "var(--color-orange-500, #E8891C)" : "var(--color-cream-200, #EBE5D8)",
                cursor: i <= step ? "pointer" : "default",
              }}
              title={`Step ${i + 1}: ${s.title}`}
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
              transition={{ duration: 0.2 }}
              className="rounded-3xl border p-6 sm:p-10 shadow-sm bg-white"
              style={{ borderColor: "var(--color-border-light)" }}
            >
              {/* Step Header */}
              <div className="flex items-center gap-3.5 mb-6 pb-5 border-b" style={{ borderColor: "var(--color-border-light)" }}>
                <span className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-cream-100 text-orange-500">
                  <StepIcon size={24} />
                </span>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-brown-900" style={{ fontFamily: "var(--font-heading)" }}>
                    {currentStepDef.title}
                  </h2>
                  <p className="text-xs text-neutral-500">
                    {currentStepDef.subtitle}
                  </p>
                </div>
              </div>

              {/* Form Content */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (step === STEPS.length - 1) {
                    handleSubmit(e);
                  } else {
                    handleNext();
                  }
                }}
              >
                {/* ── STEP 1: BUSINESS ── */}
                {step === 0 && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-brown-900">
                        Restaurant Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        autoFocus
                        className={`input text-base font-semibold ${errors.restaurantName ? "border-red-500 bg-red-50/20 ring-1 ring-red-400" : ""}`}
                        placeholder="e.g. Royal Grand Kitchen & Dhaba"
                        value={form.restaurantName}
                        onChange={(e) => update({ restaurantName: e.target.value })}
                      />
                      {errors.restaurantName && (
                        <p className="text-xs text-red-600 font-medium mt-1.5 flex items-center gap-1">
                          <AlertCircle size={13} /> {errors.restaurantName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-brown-900">
                        Cuisine Type <span className="text-red-500">*</span>
                      </label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {CUISINE_PRESETS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => update({ cuisine: c })}
                            className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all"
                            style={{
                              borderColor: form.cuisine === c ? "var(--color-orange-500)" : "var(--color-border-light)",
                              background: form.cuisine === c ? "var(--color-orange-500)" : "#fff",
                              color: form.cuisine === c ? "#fff" : "var(--color-brown-900)",
                            }}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                      <input
                        className={`input text-sm ${errors.cuisine ? "border-red-500 bg-red-50/20 ring-1 ring-red-400" : ""}`}
                        placeholder="Or specify custom cuisine (e.g. Coastal Seafood, Continental)"
                        value={form.cuisine}
                        onChange={(e) => update({ cuisine: e.target.value })}
                      />
                      {errors.cuisine && (
                        <p className="text-xs text-red-600 font-medium mt-1.5 flex items-center gap-1">
                          <AlertCircle size={13} /> {errors.cuisine}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-brown-900">
                        Table Count <span className="text-red-500">*</span>
                      </label>
                      <p className="text-xs text-neutral-500 mb-3">
                        We automatically generate unique QR codes and print-ready digital stands for each table.
                      </p>
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => update({ tableCount: Math.max(1, form.tableCount - 1) })}
                          className="w-12 h-12 rounded-2xl border-2 text-2xl font-black flex items-center justify-center transition-all hover:bg-cream-100 active:scale-95 text-brown-900 border-brown-900"
                        >
                          −
                        </button>
                        <div className="text-center w-28">
                          <input
                            type="number"
                            min="1"
                            max="200"
                            value={form.tableCount}
                            onChange={(e) => update({ tableCount: Math.max(1, Math.min(200, parseInt(e.target.value, 10) || 1)) })}
                            className="w-full text-center text-3xl font-black text-orange-600 border rounded-2xl py-1.5 bg-cream-50"
                            style={{ fontFamily: "var(--font-heading)" }}
                          />
                          <p className="text-[10px] uppercase font-bold text-neutral-400 mt-1">Tables</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => update({ tableCount: Math.min(200, form.tableCount + 1) })}
                          className="w-12 h-12 rounded-2xl border-2 text-2xl font-black flex items-center justify-center transition-all hover:bg-cream-100 active:scale-95 text-brown-900 border-brown-900"
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
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-brown-900">
                        Owner Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        autoFocus
                        className={`input ${errors.ownerName ? "border-red-500 bg-red-50/20 ring-1 ring-red-400" : ""}`}
                        placeholder="Full Name (e.g. Ramesh Kumar)"
                        value={form.ownerName}
                        onChange={(e) => update({ ownerName: e.target.value })}
                      />
                      {errors.ownerName && (
                        <p className="text-xs text-red-600 font-medium mt-1.5 flex items-center gap-1">
                          <AlertCircle size={13} /> {errors.ownerName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-brown-900">
                        Business Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        className={`input ${errors.email ? "border-red-500 bg-red-50/20 ring-1 ring-red-400" : ""}`}
                        placeholder="owner@restaurant.com"
                        value={form.email}
                        onChange={(e) => update({ email: e.target.value })}
                      />
                      {errors.email ? (
                        <p className="text-xs text-red-600 font-medium mt-1.5 flex items-center gap-1">
                          <AlertCircle size={13} /> {errors.email}
                        </p>
                      ) : (
                        <p className="text-[11px] text-neutral-500 mt-1">
                          This email will be used to log in to your Restaurant Admin Dashboard after approval.
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-brown-900">
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          className={`input ${errors.phone ? "border-red-500 bg-red-50/20 ring-1 ring-red-400" : ""}`}
                          placeholder="e.g. 9876543210"
                          value={form.phone}
                          onChange={(e) => update({ phone: e.target.value })}
                        />
                        {errors.phone && (
                          <p className="text-xs text-red-600 font-medium mt-1.5 flex items-center gap-1">
                            <AlertCircle size={13} /> {errors.phone}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-brown-900">
                          WhatsApp Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          disabled={form.whatsappSameAsPhone}
                          className={`input ${form.whatsappSameAsPhone ? "opacity-75 bg-cream-50" : ""} ${errors.whatsapp ? "border-red-500 bg-red-50/20 ring-1 ring-red-400" : ""}`}
                          placeholder="WhatsApp Number"
                          value={form.whatsappSameAsPhone ? form.phone : form.whatsapp}
                          onChange={(e) => update({ whatsapp: e.target.value })}
                        />
                        {errors.whatsapp && !form.whatsappSameAsPhone && (
                          <p className="text-xs text-red-600 font-medium mt-1.5 flex items-center gap-1">
                            <AlertCircle size={13} /> {errors.whatsapp}
                          </p>
                        )}
                        <label className="flex items-center gap-2 mt-2 text-xs font-bold text-neutral-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.whatsappSameAsPhone}
                            onChange={(e) => update({ whatsappSameAsPhone: e.target.checked })}
                            className="w-4 h-4 rounded text-orange-500 cursor-pointer"
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
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-brown-900">
                        Restaurant Street Address <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        autoFocus
                        rows={3}
                        className={`input resize-none ${errors.address ? "border-red-500 bg-red-50/20 ring-1 ring-red-400" : ""}`}
                        placeholder="Shop/Building No., Street, Landmark, Area"
                        value={form.address}
                        onChange={(e) => update({ address: e.target.value })}
                      />
                      {errors.address && (
                        <p className="text-xs text-red-600 font-medium mt-1.5 flex items-center gap-1">
                          <AlertCircle size={13} /> {errors.address}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-brown-900">
                          City <span className="text-red-500">*</span>
                        </label>
                        <input
                          className={`input ${errors.city ? "border-red-500 bg-red-50/20 ring-1 ring-red-400" : ""}`}
                          placeholder="e.g. Visakhapatnam"
                          value={form.city}
                          onChange={(e) => update({ city: e.target.value })}
                        />
                        {errors.city && (
                          <p className="text-xs text-red-600 font-medium mt-1.5 flex items-center gap-1">
                            <AlertCircle size={13} /> {errors.city}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-brown-900">
                          State <span className="text-red-500">*</span>
                        </label>
                        <input
                          className={`input ${errors.state ? "border-red-500 bg-red-50/20 ring-1 ring-red-400" : ""}`}
                          placeholder="e.g. Andhra Pradesh"
                          value={form.state}
                          onChange={(e) => update({ state: e.target.value })}
                        />
                        {errors.state && (
                          <p className="text-xs text-red-600 font-medium mt-1.5 flex items-center gap-1">
                            <AlertCircle size={13} /> {errors.state}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-brown-900">
                          Pincode <span className="text-red-500">*</span>
                        </label>
                        <input
                          className={`input ${errors.pincode ? "border-red-500 bg-red-50/20 ring-1 ring-red-400" : ""}`}
                          placeholder="e.g. 530016"
                          value={form.pincode}
                          onChange={(e) => update({ pincode: e.target.value })}
                        />
                        {errors.pincode && (
                          <p className="text-xs text-red-600 font-medium mt-1.5 flex items-center gap-1">
                            <AlertCircle size={13} /> {errors.pincode}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP 4: BRANDING & ADDITIONAL ── */}
                {step === 3 && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-brown-900">
                        Restaurant Logo <span className="text-neutral-400 font-normal">(Optional)</span>
                      </label>
                      <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl py-8 px-4 cursor-pointer transition-colors hover:bg-cream-50" style={{ borderColor: "var(--color-border-light)" }}>
                        {form.logoPreview ? (
                          <div className="flex flex-col items-center gap-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={form.logoPreview} alt="Logo preview" className="w-24 h-24 rounded-2xl object-cover border-2 shadow-sm border-brown-900" />
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
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 text-brown-900">
                          <Printer size={13} /> Thermal Printer Model <span className="text-neutral-400 font-normal">(Optional)</span>
                        </label>
                        <input
                          className="input text-sm"
                          placeholder="e.g. Epson TM-T82X, TVS RP-3200"
                          value={form.printerModel}
                          onChange={(e) => update({ printerModel: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 text-brown-900">
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
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 text-brown-900">
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
                    <div className="rounded-2xl p-5 border space-y-4 bg-cream-100 border-neutral-200">
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
                    className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl border disabled:opacity-30 transition-all hover:bg-cream-100 text-brown-900"
                    style={{ borderColor: "var(--color-border-light)" }}
                  >
                    <ArrowLeft size={14} /> Back
                  </button>

                  {step === STEPS.length - 1 ? (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={submitting}
                      className="btn-primary flex items-center gap-2 px-7 py-3 text-sm font-bold uppercase tracking-wider shadow-md hover:shadow-lg disabled:opacity-50"
                    >
                      {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                      {submitting ? "Submitting Application..." : "Submit Application"}
                    </motion.button>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      className="btn-primary flex items-center gap-2 px-7 py-3 text-xs font-bold uppercase tracking-wider shadow-sm hover:shadow"
                    >
                      Continue <ArrowRight size={14} />
                    </motion.button>
                  )}
                </div>
              </form>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
