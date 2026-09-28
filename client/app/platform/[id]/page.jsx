"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  Store,
  User,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  ChefHat,
  Sliders,
  FileText,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Loader2,
  Download,
  PartyPopper,
  RefreshCw,
  Printer,
  CreditCard,
} from "lucide-react";
import api from "../../lib/api";
import Navbar from "../../components/Navbar";
import { generateWelcomeKit } from "../../lib/qrKitGenerator";
import toast from "react-hot-toast";

const STATUS_META = {
  PENDING: { label: "Pending", color: "#B45309", bg: "#FEF3C7" },
  APPROVED: { label: "Approved", color: "#065F46", bg: "#ECFDF5" },
  REJECTED: { label: "Rejected", color: "#991B1B", bg: "#FEF2F2" },
};

export default function ApplicationDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [approvalResult, setApprovalResult] = useState(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showInfoForm, setShowInfoForm] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");

  const fetchApplication = useCallback(async () => {
    try {
      const res = await api.get(`/platform/applications/${id}`);
      setApplication(res.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load application.");
      router.push("/platform");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchApplication();
  }, [fetchApplication]);

  const handleApprove = async () => {
    if (!window.confirm(`Approve "${application.restaurantName}"? This creates their restaurant, admin account, and ${application.tableCount} tables immediately.`)) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.post(`/platform/applications/${id}/approve`);
      setApprovalResult(res.data.data);
      toast.success(`${res.data.data.restaurant.name} approved!`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to approve application.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason.");
      return;
    }
    setActionLoading(true);
    try {
      await api.post(`/platform/applications/${id}/reject`, { rejectionReason: rejectionReason.trim() });
      toast.success("Application rejected.");
      fetchApplication();
      setShowRejectForm(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reject application.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestInfo = async () => {
    if (!infoMessage.trim()) {
      toast.error("Please write a message.");
      return;
    }
    setActionLoading(true);
    try {
      await api.post(`/platform/applications/${id}/request-info`, { message: infoMessage.trim() });
      toast.success("Request sent to the applicant.");
      setShowInfoForm(false);
      setInfoMessage("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send request.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadKit = async () => {
    if (!approvalResult) return;
    try {
      await generateWelcomeKit({
        restaurant: approvalResult.restaurant,
        tables: approvalResult.tables,
        adminEmail: approvalResult.admin.email,
        tempPassword: approvalResult.admin.tempPassword,
        dashboardUrl: approvalResult.dashboardUrl,
      });
    } catch (error) {
      toast.error("Failed to generate the Welcome Kit — you can retry.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--color-orange-500)" }} />
      </div>
    );
  }
  if (!application) return null;

  const status = STATUS_META[application.status];

  return (
    <div className="min-h-screen" style={{ background: "var(--color-surface, #FFFDF7)" }}>
      <Navbar title={application.restaurantName} subtitle="Application Review" backHref="/platform" />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Approval celebration */}
        {approvalResult && (
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border p-6 text-center"
            style={{ borderColor: "#A7F3D0", background: "#ECFDF5" }}
          >
            <PartyPopper size={32} className="mx-auto mb-2" style={{ color: "#065F46" }} />
            <p className="font-black text-lg mb-1" style={{ color: "#065F46" }}>Restaurant Provisioned!</p>
            <p className="text-xs mb-4" style={{ color: "#065F46" }}>
              {approvalResult.tables.length} tables created with secure QR codes. Login details sent to {approvalResult.admin.email}.
            </p>
            <button
              onClick={handleDownloadKit}
              className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
            >
              <Download size={14} /> Download Welcome Kit
            </button>
          </motion.div>
        )}

        {/* Status badge + header */}
        <div className="rounded-2xl border p-5 flex items-center justify-between" style={{ borderColor: "var(--color-border-light)", background: "#fff" }}>
          <div className="flex items-center gap-3">
            {application.logo ? (
              <Image src={application.logo} alt={application.restaurantName} width={56} height={56} className="w-14 h-14 rounded-xl object-cover border" style={{ borderColor: "var(--color-border-light)" }} />
            ) : (
              <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: "var(--color-cream-100)", color: "var(--color-orange-500)" }}>
                <Store size={24} />
              </div>
            )}
            <div>
              <p className="font-black text-lg" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>{application.restaurantName}</p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{new Date(application.createdAt).toLocaleString()}</p>
            </div>
          </div>
          <span className="text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full" style={{ background: status.bg, color: status.color }}>
            {status.label}
          </span>
        </div>

        {/* Details */}
        <div className="rounded-2xl border p-5 grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ borderColor: "var(--color-border-light)", background: "#fff" }}>
          <DetailRow icon={User} label="Owner" value={application.ownerName} />
          <DetailRow icon={Mail} label="Email" value={application.email} />
          <DetailRow icon={Phone} label="Phone" value={application.phone} />
          <DetailRow icon={MessageCircle} label="WhatsApp" value={application.whatsapp} />
          <DetailRow icon={MapPin} label="Address" value={`${application.address}, ${application.city}, ${application.state} ${application.pincode}`} full />
          <DetailRow icon={ChefHat} label="Cuisine" value={application.cuisine} />
          <DetailRow icon={Sliders} label="Tables" value={String(application.tableCount)} />
          {application.printerModel && <DetailRow icon={Printer} label="Printer Model" value={application.printerModel} />}
          {application.existingPos && <DetailRow icon={CreditCard} label="Existing POS" value={application.existingPos} />}
          {application.notes && <DetailRow icon={FileText} label="Notes" value={application.notes} full />}
        </div>

        {application.status === "REJECTED" && application.rejectionReason && (
          <div className="rounded-2xl border p-5" style={{ borderColor: "#FECACA", background: "#FEF2F2" }}>
            <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "#991B1B" }}>Rejection Reason</p>
            <p className="text-sm" style={{ color: "#991B1B" }}>{application.rejectionReason}</p>
          </div>
        )}

        {/* Actions — only for PENDING, and only before this session already approved it */}
        {application.status === "PENDING" && !approvalResult && (
          <div className="rounded-2xl border p-5 space-y-3" style={{ borderColor: "var(--color-border-light)", background: "#fff" }}>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="btn-primary flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Approve
              </button>
              <button
                onClick={() => setShowRejectForm((v) => !v)}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider border rounded-lg"
                style={{ borderColor: "#991B1B", color: "#991B1B" }}
              >
                <XCircle size={14} /> Reject
              </button>
              <button
                onClick={() => setShowInfoForm((v) => !v)}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider border rounded-lg"
                style={{ borderColor: "var(--color-border-light)", color: "var(--color-brown-900)" }}
              >
                <HelpCircle size={14} /> Request More Information
              </button>
            </div>

            {showRejectForm && (
              <div className="pt-2 space-y-2">
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="Reason for rejection (required, sent to the applicant)"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
                <button onClick={handleReject} disabled={actionLoading} className="btn-primary px-4 py-2 text-xs font-bold uppercase tracking-wider">
                  Confirm Rejection
                </button>
              </div>
            )}

            {showInfoForm && (
              <div className="pt-2 space-y-2">
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="What additional information do you need?"
                  value={infoMessage}
                  onChange={(e) => setInfoMessage(e.target.value)}
                />
                <button onClick={handleRequestInfo} disabled={actionLoading} className="btn-primary px-4 py-2 text-xs font-bold uppercase tracking-wider">
                  Send Request
                </button>
              </div>
            )}
          </div>
        )}

        {/* WhatsApp outbox for this application */}
        {application.whatsappMessages?.length > 0 && (
          <div className="rounded-2xl border p-5" style={{ borderColor: "var(--color-border-light)", background: "#fff" }}>
            <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "var(--color-text-muted)" }}>WhatsApp Messages</p>
            <div className="space-y-2">
              {application.whatsappMessages.map((msg) => (
                <WhatsAppRow key={msg.id} message={msg} onResend={fetchApplication} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, full }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--color-text-muted)" }}>
        <Icon size={12} /> {label}
      </p>
      <p className="text-sm" style={{ color: "var(--color-brown-900)" }}>{value || "—"}</p>
    </div>
  );
}

function WhatsAppRow({ message, onResend }) {
  const [resending, setResending] = useState(false);
  const badgeColor = message.status === "SENT" ? "#065F46" : message.status === "FAILED" ? "#991B1B" : "#B45309";
  const badgeBg = message.status === "SENT" ? "#ECFDF5" : message.status === "FAILED" ? "#FEF2F2" : "#FEF3C7";

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post(`/platform/whatsapp-messages/${message.id}/resend`);
      toast.success("Resend attempted.");
      onResend?.();
    } catch (error) {
      toast.error(error.response?.data?.message || "Resend failed.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <div className="min-w-0">
        <p className="truncate" style={{ color: "var(--color-brown-900)" }}>{message.message.split("\n")[0]}</p>
        <p style={{ color: "var(--color-text-muted)" }}>to {message.to}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="font-bold uppercase tracking-wide px-2 py-1 rounded-full" style={{ background: badgeBg, color: badgeColor }}>
          {message.status}
        </span>
        {message.status !== "SENT" && (
          <button onClick={handleResend} disabled={resending} className="p-1.5 rounded-lg border" style={{ borderColor: "var(--color-border-light)" }} aria-label="Resend">
            {resending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          </button>
        )}
      </div>
    </div>
  );
}
