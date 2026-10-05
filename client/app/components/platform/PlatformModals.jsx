"use client";

/**
 * Approve / Reject / Send Credentials / QR Package dialogs for the
 * ServeSync Admin portal. Every action here hits the real API — nothing is
 * a front-end-only state change, and delivery is reported exactly as the
 * server reports it (never "sent" when no provider is configured).
 */
import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Copy, Download, Eye, EyeOff, KeyRound, Loader2, QrCode, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "../ui/Modal";
import api from "../../lib/api";
import { generateTablePostersPDF } from "../../lib/posterUtils";
import { generateClientPackagePDF } from "../../lib/qrKitGenerator";
import { Button, errorMessage, InfoRow } from "./PlatformUI";
import { PLATFORM_REFRESH_EVENT } from "./PlatformShell";

const ROLE_LABELS = { ADMIN: "Restaurant Admin", CAPTAIN: "Captain", KITCHEN: "Kitchen" };

const notifyRefresh = () => window.dispatchEvent(new CustomEvent(PLATFORM_REFRESH_EVENT, { detail: { type: "local" } }));

async function downloadPosters(restaurant, tables) {
  try {
    await generateTablePostersPDF({ restaurant, tables });
  } catch (error) {
    toast.error("Couldn't generate the QR poster PDF.");
  }
}

/* ─────────────────────────── Approve ─────────────────────────── */

export function ApproveModal({ application, open, onClose, onApproved }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [credentialsOpen, setCredentialsOpen] = useState(false);

  const close = () => {
    if (loading) return;
    setResult(null);
    onClose();
  };

  const approve = async () => {
    setLoading(true);
    try {
      const res = await api.post(`/platform/applications/${application.id}/approve`);
      setResult(res.data.data);
      toast.success("Restaurant approved.");
      notifyRefresh();
      onApproved?.(res.data.data);
    } catch (error) {
      toast.error(errorMessage(error, "Failed to approve application."));
    } finally {
      setLoading(false);
    }
  };

  if (!application) return null;

  return (
    <>
      <Modal open={open && !credentialsOpen} onClose={close} title={result ? "Restaurant approved" : "Approve Restaurant?"} maxWidth="max-w-lg">
        {!result ? (
          <>
            <dl className="mb-4">
              <InfoRow label="Restaurant" value={application.restaurantName} />
              <InfoRow label="Owner" value={application.ownerName} />
              <InfoRow label="Email" value={application.email} />
              <InfoRow label="Phone" value={application.phone} />
              <InfoRow label="Tables" value={application.tableCount} />
            </dl>
            <p className="text-sm mb-5" style={{ color: "var(--ss-secondary)" }}>
              This creates the restaurant&apos;s ServeSync client account, its Restaurant Admin, Captain and Kitchen logins, and {application.tableCount} table QR
              code{application.tableCount === 1 ? "" : "s"}.
            </p>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button onClick={close} disabled={loading}>
                Cancel
              </Button>
              <Button variant="success" onClick={approve} disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {loading ? "Approving…" : "Approve Application"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start gap-3 p-4 rounded-xl mb-4" style={{ background: "#ECFDF5", border: "1px solid #A7F3D0" }}>
              <CheckCircle2 size={20} className="flex-shrink-0 mt-0.5" style={{ color: "var(--ss-success)" }} />
              <p className="text-sm font-medium" style={{ color: "#065F46" }}>
                Restaurant approved successfully. Credentials and QR package are ready to be sent.
              </p>
            </div>
            <dl className="mb-5">
              {result.accounts.map((a) => (
                <InfoRow key={a.role} label={`${ROLE_LABELS[a.role]} login`} value={a.email} />
              ))}
              <InfoRow label="Table QR codes" value={`${result.tables.length} generated`} />
            </dl>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button variant="primary" onClick={() => setCredentialsOpen(true)}>
                <KeyRound size={16} /> Send Credentials
              </Button>
              <Button onClick={() => downloadPosters(result.restaurant, result.tables)}>
                <Download size={16} /> Download QR package
              </Button>
              <Link
                href={`/platform/restaurants/${result.restaurant.id}`}
                className="sm:col-span-2 text-center text-sm font-semibold py-2"
                style={{ color: "var(--ss-accent-dark)" }}
              >
                View client profile →
              </Link>
            </div>
          </>
        )}
      </Modal>
      {result && (
        <CredentialsModal
          open={credentialsOpen}
          restaurant={result.restaurant}
          tables={result.tables}
          onClose={() => setCredentialsOpen(false)}
        />
      )}
    </>
  );
}

/* ─────────────────────────── Reject ─────────────────────────── */

export function RejectModal({ application, open, onClose, onRejected }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const reject = async () => {
    setLoading(true);
    try {
      const res = await api.post(`/platform/applications/${application.id}/reject`, { rejectionReason: reason.trim() });
      toast.success("Application rejected.");
      setReason("");
      notifyRefresh();
      onRejected?.(res.data.data);
      onClose();
    } catch (error) {
      toast.error(errorMessage(error, "Failed to reject application."));
    } finally {
      setLoading(false);
    }
  };

  if (!application) return null;

  return (
    <Modal open={open} onClose={() => !loading && onClose()} title="Reject Restaurant Application" maxWidth="max-w-lg">
      <p className="text-sm mb-4" style={{ color: "var(--ss-secondary)" }}>
        <strong style={{ color: "var(--ss-primary)" }}>{application.restaurantName}</strong> — {application.ownerName}. The application is kept on record and stays
        viewable under Rejected.
      </p>
      <label htmlFor="rejection-reason" className="block text-sm font-semibold mb-1.5" style={{ color: "var(--ss-primary)" }}>
        Rejection reason <span style={{ color: "var(--ss-secondary)", fontWeight: 400 }}>(optional)</span>
      </label>
      <textarea
        id="rejection-reason"
        rows={4}
        maxLength={1000}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. We couldn't verify the restaurant's business details."
        className="w-full rounded-xl px-3 py-2.5 text-sm resize-y focus:outline-none focus:ring-2"
        style={{ background: "var(--ss-bg)", border: "1px solid var(--ss-border)", color: "var(--ss-primary)", "--tw-ring-color": "var(--ss-focus-ring)" }}
      />
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-5">
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="dangerSolid" onClick={reject} disabled={loading}>
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Rejecting…" : "Reject Application"}
        </Button>
      </div>
    </Modal>
  );
}

/* ─────────────────────── Send Credentials ─────────────────────── */

const DELIVERY_TEXT = {
  SENT: { text: "Sent", ok: true },
  QUEUED: { text: "Queued — no WhatsApp provider configured yet (message contains login IDs only)", ok: false },
  FAILED: { text: "Delivery failed", ok: false },
  NOT_CONFIGURED: { text: "Not sent — email delivery is not configured yet", ok: false },
  NO_NUMBER: { text: "No WhatsApp number on file", ok: false },
};

function DeliveryRow({ channel, info }) {
  const meta = DELIVERY_TEXT[info.status] || { text: info.status, ok: false };
  return (
    <div className="flex items-start gap-2.5 py-2">
      {meta.ok ? (
        <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" style={{ color: "var(--ss-success)" }} />
      ) : (
        <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" style={{ color: "var(--ss-warning)" }} />
      )}
      <p className="text-sm" style={{ color: "var(--ss-primary)" }}>
        <strong>{channel}</strong>
        {info.to ? ` (${info.to})` : ""}: {meta.text}
      </p>
    </div>
  );
}

export function CredentialsModal({ open, restaurant, tables = [], onClose, onIssued }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [revealed, setRevealed] = useState(false);

  const close = () => {
    if (loading) return;
    setResult(null);
    setRevealed(false);
    onClose();
  };

  const issue = async () => {
    setLoading(true);
    try {
      const res = await api.post(`/platform/restaurants/${restaurant.id}/credentials`);
      setResult(res.data.data);
      notifyRefresh();
      onIssued?.(res.data.data);
    } catch (error) {
      toast.error(errorMessage(error, "Failed to generate credentials."));
    } finally {
      setLoading(false);
    }
  };

  const copyAll = async () => {
    const text = [
      `${result.restaurant.name} — ServeSync logins`,
      ...result.accounts.map((a) => `${ROLE_LABELS[a.role]}: ${a.email} / ${a.tempPassword}`),
      `Sign in: ${result.loginUrl}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard.");
    } catch {
      toast.error("Clipboard is unavailable in this browser.");
    }
  };

  const downloadPackage = async () => {
    try {
      await generateClientPackagePDF({ restaurant: { ...restaurant, ...result.restaurant }, accounts: result.accounts, loginUrl: result.loginUrl, tables });
    } catch {
      toast.error("Couldn't generate the access PDF.");
    }
  };

  if (!restaurant) return null;

  return (
    <Modal open={open} onClose={close} title="Send Credentials" maxWidth="max-w-lg">
      {!result ? (
        <>
          <p className="text-sm mb-3" style={{ color: "var(--ss-primary)" }}>
            Issue fresh temporary passwords for <strong>{restaurant.name}</strong>&apos;s Restaurant Admin, Captain and Kitchen logins, and deliver them through the
            configured channels.
          </p>
          <div className="flex items-start gap-2.5 p-3 rounded-xl mb-5 text-sm" style={{ background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E" }}>
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            Any current passwords for these three logins stop working immediately. Staff accounts the restaurant invited itself are not affected.
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button onClick={close} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={issue} disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
              {loading ? "Generating…" : "Generate & send"}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "var(--ss-secondary)" }}>
              Delivery
            </p>
            <DeliveryRow channel="Email" info={result.delivery.email} />
            <DeliveryRow channel="WhatsApp" info={result.delivery.whatsapp} />
          </div>

          <div className="rounded-xl p-3 sm:p-4 mb-4" style={{ background: "var(--ss-bg)", border: "1px solid var(--ss-border)" }}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--ss-secondary)" }}>
                Temporary credentials · shown once
              </p>
              <button onClick={() => setRevealed((r) => !r)} className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--ss-accent-dark)" }}>
                {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
                {revealed ? "Hide" : "Reveal"}
              </button>
            </div>
            <ul className="space-y-2.5">
              {result.accounts.map((a) => (
                <li key={a.role} className="text-sm min-w-0">
                  <p className="font-semibold" style={{ color: "var(--ss-primary)" }}>
                    {ROLE_LABELS[a.role]}
                  </p>
                  <p className="break-all" style={{ color: "var(--ss-secondary)" }}>
                    {a.email} · <span className="font-mono">{revealed ? a.tempPassword : "••••••••••••"}</span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs mb-4" style={{ color: "var(--ss-secondary)" }}>
            Passwords are stored only as secure hashes and can&apos;t be shown again. Share them with the owner securely, or reissue later.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button variant="primary" onClick={downloadPackage}>
              <Download size={16} /> Download access PDF
            </Button>
            <Button onClick={copyAll}>
              <Copy size={16} /> Copy all
            </Button>
            <Button className="sm:col-span-2" onClick={close}>
              Done
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}

/* ─────────────────────── QR package ─────────────────────── */

export function QrPackageModal({ open, restaurant, onClose, onGenerated }) {
  const [loading, setLoading] = useState(false);

  const regenerate = async () => {
    setLoading(true);
    try {
      const res = await api.post(`/platform/restaurants/${restaurant.id}/qr-package`);
      const { restaurant: r, tables } = res.data.data;
      toast.success(res.data.message);
      notifyRefresh();
      onGenerated?.(res.data.data);
      await downloadPosters({ ...restaurant, ...r }, tables);
      onClose();
    } catch (error) {
      toast.error(errorMessage(error, "Failed to regenerate QR package."));
    } finally {
      setLoading(false);
    }
  };

  if (!restaurant) return null;

  return (
    <Modal open={open} onClose={() => !loading && onClose()} title="Regenerate QR Package" maxWidth="max-w-lg">
      <p className="text-sm mb-3" style={{ color: "var(--ss-primary)" }}>
        Generates new secure QR codes for every table at <strong>{restaurant.name}</strong> and downloads the printable poster PDF.
      </p>
      <div className="flex items-start gap-2.5 p-3 rounded-xl mb-5 text-sm" style={{ background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E" }}>
        <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
        Previously printed QR codes for this restaurant will stop working.
      </div>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="primary" onClick={regenerate} disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
          {loading ? "Generating…" : "Regenerate & download"}
        </Button>
      </div>
    </Modal>
  );
}

/* ─────────────────────── Suspend / Activate ─────────────────────── */

export function StatusToggleModal({ client, onClose, onChanged }) {
  const [loading, setLoading] = useState(false);
  if (!client) return null;
  const suspending = client.status === "ACTIVE";

  const submit = async () => {
    setLoading(true);
    try {
      const res = await api.patch(`/platform/restaurants/${client.id}/status`, { status: suspending ? "SUSPENDED" : "ACTIVE" });
      toast.success(res.data.message);
      onChanged?.(res.data.data);
      notifyRefresh();
      onClose();
    } catch (error) {
      toast.error(errorMessage(error, "Failed to update status."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open onClose={() => !loading && onClose()} title={suspending ? "Suspend client?" : "Activate client?"}>
      <p className="text-sm mb-5" style={{ color: "var(--ss-primary)" }}>
        {suspending ? (
          <>
            <strong>{client.name}</strong>&apos;s staff will be signed out of ServeSync and its customer QR menu will stop working until it&apos;s activated again. No data
            is deleted.
          </>
        ) : (
          <>
            <strong>{client.name}</strong>&apos;s staff logins and customer QR ordering will work again.
          </>
        )}
      </p>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant={suspending ? "dangerSolid" : "success"} onClick={submit} disabled={loading}>
          {loading ? "Saving…" : suspending ? "Suspend" : "Activate"}
        </Button>
      </div>
    </Modal>
  );
}
