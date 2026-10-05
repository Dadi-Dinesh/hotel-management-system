"use client";

/**
 * ServeSync Admin — one client's platform-level profile: contact, account
 * status, provisioned role logins (never passwords) and QR package state,
 * with credential / QR / status actions. Never shows the restaurant's
 * orders, menu, reviews or analytics.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Info, KeyRound, PauseCircle, PlayCircle, QrCode, Store, XCircle } from "lucide-react";
import api from "../../../lib/api";
import { PLATFORM_REFRESH_EVENT } from "../../../components/platform/PlatformShell";
import { CredentialsModal, QrPackageModal, StatusToggleModal } from "../../../components/platform/PlatformModals";
import { Button, ErrorState, InfoRow, LoadingState, Panel, StatusBadge, errorMessage, formatDate, timeAgo } from "../../../components/platform/PlatformUI";

const ROLE_LABELS = { ADMIN: "Restaurant Admin", CAPTAIN: "Captain", KITCHEN: "Kitchen" };
const QR_STATUS = {
  READY: { label: "Ready", status: "ACTIVE" },
  PARTIAL: { label: "Partially generated", status: "PENDING" },
  OPEN_MODE: { label: "Open mode (no secure token)", status: "NEUTRAL" },
  NOT_GENERATED: { label: "Not generated", status: "PENDING" },
};

export default function ClientDetailPage() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null); // "credentials" | "qr" | "status"

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get(`/platform/restaurants/${id}`);
      setClient(res.data.data);
    } catch (err) {
      setError(err.response?.status === 404 ? "This restaurant doesn't exist." : errorMessage(err, "Please try again."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    window.addEventListener(PLATFORM_REFRESH_EVENT, load);
    return () => window.removeEventListener(PLATFORM_REFRESH_EVENT, load);
  }, [load]);

  const back = (
    <Link href="/platform/restaurants" className="inline-flex items-center gap-1.5 text-sm font-semibold mb-4" style={{ color: "var(--ss-secondary)" }}>
      <ArrowLeft size={16} /> Restaurants / Clients
    </Link>
  );

  if (loading) return <LoadingState />;
  if (error || !client) {
    return (
      <>
        {back}
        <Panel>
          <ErrorState message={error} onRetry={error?.includes("doesn't exist") ? undefined : load} />
        </Panel>
      </>
    );
  }

  const c = client;
  const qrMeta = QR_STATUS[c.qr.status] || QR_STATUS.NOT_GENERATED;
  const allProvisioned = c.accounts.every((a) => a.provisioned);
  const location = [c.location.address, c.location.city, c.location.state, c.location.pincode].filter(Boolean).join(", ");

  return (
    <>
      {back}

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div className="flex items-start gap-3 min-w-0">
          {c.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.logo} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" style={{ border: "1px solid var(--ss-border)" }} />
          ) : (
            <span className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--ss-accent-tint)", color: "var(--ss-accent-dark)" }}>
              <Store size={22} />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold break-words" style={{ fontFamily: "var(--font-heading)", color: "var(--ss-primary)" }}>
              {c.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <StatusBadge status={c.status} />
              {c.isDemo && <StatusBadge status="DEMO" label="Demo restaurant" />}
              <span className="text-sm" style={{ color: "var(--ss-secondary)" }}>
                Client since {formatDate(c.joinedAt)}
              </span>
            </div>
          </div>
        </div>
        {!c.isDemo && (
          <div className="grid grid-cols-1 sm:grid-cols-3 md:flex gap-2 md:flex-shrink-0">
            <Button variant="primary" onClick={() => setModal("credentials")}>
              <KeyRound size={16} /> {c.credentials.lastIssuedAt ? "Resend Credentials" : "Send Credentials"}
            </Button>
            <Button onClick={() => setModal("qr")}>
              <QrCode size={16} /> Regenerate QR Package
            </Button>
            <Button variant={c.status === "ACTIVE" ? "danger" : "success"} onClick={() => setModal("status")}>
              {c.status === "ACTIVE" ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
              {c.status === "ACTIVE" ? "Suspend Client" : "Activate Client"}
            </Button>
          </div>
        )}
      </div>

      {c.isDemo && (
        <div className="flex items-start gap-2.5 mb-6 p-4 rounded-xl text-sm" style={{ background: "var(--ss-accent-tint)", border: "1px solid rgba(232,144,23,0.35)", color: "var(--ss-accent-dark)" }}>
          <Info size={16} className="flex-shrink-0 mt-0.5" />
          This is the ServeSync demo restaurant. Its logins, QR codes and status are protected so public demos keep working.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Panel title="Restaurant Information">
          <dl>
            <InfoRow label="Restaurant" value={c.name} />
            <InfoRow label="Restaurant type" value={c.cuisine} />
            <InfoRow label="Restaurant ID" value={c.id} mono />
            <InfoRow label="Public slug" value={c.slug} mono />
            <InfoRow label="Number of tables" value={c.qr.totalTables} />
            <InfoRow label="Location" value={location} />
          </dl>
        </Panel>

        <Panel title="Owner & Contact">
          <dl>
            <InfoRow label="Owner" value={c.owner.name} />
            <InfoRow label="Email" value={c.owner.email} />
            <InfoRow label="Phone" value={c.owner.phone} />
            <InfoRow label="WhatsApp" value={c.owner.whatsapp} />
          </dl>
        </Panel>

        <Panel title="Account">
          <dl>
            <InfoRow label="Account status" value={<StatusBadge status={c.status} />} />
            <InfoRow label="Registered" value={formatDate(c.registeredAt, true)} />
            <InfoRow label="Approved" value={c.approvedAt ? `${formatDate(c.approvedAt, true)}${c.approvedBy ? ` · ${c.approvedBy.name}` : ""}` : null} />
            <InfoRow label="Plan" value={c.plan ? `${c.plan.replace(/_/g, " ")} · ${c.subscriptionStatus}` : null} />
            <InfoRow label="Last activity" value={c.lastActivityAt ? `${timeAgo(c.lastActivityAt)} (last order)` : "No orders yet"} />
            {c.application && (
              <InfoRow
                label="Application"
                value={
                  <Link href={`/platform/applications/${c.application.id}`} style={{ color: "var(--ss-accent-dark)" }}>
                    View application →
                  </Link>
                }
              />
            )}
          </dl>
        </Panel>

        <Panel title="Access & Provisioning">
          <ul className="mb-3">
            {c.accounts.map((a) => (
              <li key={a.role} className="flex items-start gap-2.5 py-2.5 border-b last:border-b-0" style={{ borderColor: "var(--ss-border)" }}>
                {a.provisioned ? (
                  <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" style={{ color: "var(--ss-success)" }} />
                ) : (
                  <XCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: "var(--ss-secondary)" }} />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--ss-primary)" }}>
                    {ROLE_LABELS[a.role]}
                  </p>
                  <p className="text-xs break-all" style={{ color: "var(--ss-secondary)" }}>
                    {a.provisioned ? a.email : "Not provisioned yet — created on the next Send Credentials"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs" style={{ color: "var(--ss-secondary)" }}>
            {c.credentials.lastIssuedAt
              ? `Credentials last issued ${formatDate(c.credentials.lastIssuedAt, true)}.`
              : c.isDemo
                ? "Demo logins are managed by the seed data."
                : allProvisioned
                  ? "Logins exist but credentials haven't been sent to the owner yet."
                  : "Send Credentials to provision the missing logins."}{" "}
            Passwords are stored as secure hashes and are never displayed here.
          </p>
        </Panel>

        <Panel title="QR Information" className="lg:col-span-2">
          <dl className="grid grid-cols-1 md:grid-cols-2 md:gap-x-8">
            <InfoRow label="Table QRs generated" value={`${c.qr.securedTables} of ${c.qr.totalTables}`} />
            <InfoRow label="QR package status" value={<StatusBadge status={qrMeta.status} label={qrMeta.label} />} />
            <InfoRow label="Generated" value={formatDate(c.qr.lastGeneratedAt, true)} />
            <InfoRow label="Active tables" value={c.qr.activeTables} />
          </dl>
        </Panel>
      </div>

      <CredentialsModal open={modal === "credentials"} restaurant={c} onClose={() => setModal(null)} onIssued={load} />
      <QrPackageModal open={modal === "qr"} restaurant={c} onClose={() => setModal(null)} onGenerated={load} />
      {modal === "status" && <StatusToggleModal client={c} onClose={() => setModal(null)} onChanged={load} />}
    </>
  );
}
