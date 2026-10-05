"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Store, XCircle } from "lucide-react";
import api from "../../../lib/api";
import { PLATFORM_REFRESH_EVENT } from "../../../components/platform/PlatformShell";
import { ApproveModal, RejectModal } from "../../../components/platform/PlatformModals";
import { Button, ErrorState, InfoRow, LoadingState, Panel, StatusBadge, errorMessage, formatDate } from "../../../components/platform/PlatformUI";

export default function ApplicationDetailPage() {
  const { id } = useParams();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null); // "approve" | "reject" | null

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get(`/platform/applications/${id}`);
      setApplication(res.data.data);
    } catch (err) {
      setError(err.response?.status === 404 ? "This application doesn't exist." : errorMessage(err, "Please try again."));
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
    <Link href="/platform/applications" className="inline-flex items-center gap-1.5 text-sm font-semibold mb-4" style={{ color: "var(--ss-secondary)" }}>
      <ArrowLeft size={16} /> Applications
    </Link>
  );

  if (loading) return <LoadingState />;
  if (error || !application) {
    return (
      <>
        {back}
        <Panel>
          <ErrorState message={error} onRetry={error?.includes("doesn't exist") ? undefined : load} />
        </Panel>
      </>
    );
  }

  const a = application;
  const isPending = a.status === "PENDING";

  return (
    <div className={isPending ? "pb-24 lg:pb-0" : ""}>
      {back}

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="flex items-start gap-3 min-w-0">
          {a.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.logo} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" style={{ border: "1px solid var(--ss-border)" }} />
          ) : (
            <span className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--ss-accent-tint)", color: "var(--ss-accent-dark)" }}>
              <Store size={22} />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold break-words" style={{ fontFamily: "var(--font-heading)", color: "var(--ss-primary)" }}>
              {a.restaurantName}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <StatusBadge status={a.status} />
              <span className="text-sm" style={{ color: "var(--ss-secondary)" }}>
                Submitted {formatDate(a.createdAt, true)}
              </span>
            </div>
          </div>
        </div>
        {isPending && (
          <div className="hidden lg:flex gap-2 flex-shrink-0">
            <Button variant="danger" onClick={() => setModal("reject")}>
              <XCircle size={16} /> Reject Application
            </Button>
            <Button variant="success" onClick={() => setModal("approve")}>
              <CheckCircle2 size={16} /> Approve Application
            </Button>
          </div>
        )}
        {a.status === "APPROVED" && a.restaurant && (
          <Link
            href={`/platform/restaurants/${a.restaurant.id}`}
            className="self-start text-sm font-semibold px-4 py-2.5 rounded-xl"
            style={{ background: "var(--ss-primary)", color: "#FFFDF8" }}
          >
            Open client profile →
          </Link>
        )}
      </div>

      {a.status === "REJECTED" && (
        <div className="mb-6 p-4 rounded-xl text-sm" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B" }}>
          <p className="font-semibold">Rejected {formatDate(a.rejectedAt, true)}{a.rejectedBy ? ` by ${a.rejectedBy.name}` : ""}</p>
          <p className="mt-1">{a.rejectionReason || "No reason was given."}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Panel title="Restaurant Information" className="lg:row-span-2">
          <dl>
            <InfoRow label="Restaurant name" value={a.restaurantName} />
            <InfoRow label="Restaurant type" value={a.cuisine} />
            <InfoRow label="Address" value={a.address} />
            <InfoRow label="City" value={a.city} />
            <InfoRow label="State" value={a.state} />
            <InfoRow label="Pincode" value={a.pincode} />
            <InfoRow label="Number of tables" value={a.tableCount} />
            <InfoRow label="Printer model" value={a.printerModel} />
            <InfoRow label="Existing POS" value={a.existingPos} />
            <InfoRow label="Notes" value={a.notes} />
          </dl>
        </Panel>

        <Panel title="Owner Information">
          <dl>
            <InfoRow label="Owner name" value={a.ownerName} />
            <InfoRow label="Phone number" value={a.phone} />
            <InfoRow label="WhatsApp" value={a.whatsapp} />
            <InfoRow label="Email" value={a.email} />
          </dl>
        </Panel>

        <Panel title="Account Information">
          <dl>
            <InfoRow label="Application ID" value={a.id} mono />
            <InfoRow label="Submitted" value={formatDate(a.createdAt, true)} />
            <InfoRow label="Current status" value={<StatusBadge status={a.status} />} />
            {a.status === "APPROVED" && <InfoRow label="Approved" value={`${formatDate(a.approvedAt, true)}${a.approvedBy ? ` · ${a.approvedBy.name}` : ""}`} />}
            {a.status === "APPROVED" && <InfoRow label="Restaurant ID" value={a.restaurant?.id} mono />}
          </dl>
        </Panel>
      </div>

      {/* Mobile sticky action bar */}
      {isPending && (
        <div
          className="lg:hidden fixed bottom-0 inset-x-0 z-30 p-3 grid grid-cols-2 gap-2 border-t"
          style={{ background: "var(--ss-surface)", borderColor: "var(--ss-border)", paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <Button variant="danger" onClick={() => setModal("reject")}>
            <XCircle size={16} /> Reject
          </Button>
          <Button variant="success" onClick={() => setModal("approve")}>
            <CheckCircle2 size={16} /> Approve
          </Button>
        </div>
      )}

      <ApproveModal application={a} open={modal === "approve"} onClose={() => setModal(null)} onApproved={load} />
      <RejectModal application={a} open={modal === "reject"} onClose={() => setModal(null)} onRejected={load} />
    </div>
  );
}
