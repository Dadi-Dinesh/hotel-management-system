"use client";

/** ServeSync Admin — account and delivery-integration status (read-only, real values). */
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import api from "../../lib/api";
import { clearAuth } from "../../lib/auth";
import { Button, ErrorState, InfoRow, LoadingState, PageHeader, Panel, StatusBadge, errorMessage } from "../../components/platform/PlatformUI";

export default function PlatformSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get("/platform/settings");
      setSettings(res.data.data);
    } catch (err) {
      setError(errorMessage(err, "Please check your connection and try again."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const logout = () => {
    clearAuth();
    router.push("/login");
  };

  return (
    <>
      <PageHeader title="Settings" description="Your ServeSync Admin account and platform delivery channels." />
      {loading ? (
        <LoadingState />
      ) : error ? (
        <Panel>
          <ErrorState message={error} onRetry={load} />
        </Panel>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Panel title="Account">
            <dl className="mb-4">
              <InfoRow label="Name" value={settings.account.name} />
              <InfoRow label="Email" value={settings.account.email} />
              <InfoRow label="Role" value="ServeSync Admin" />
            </dl>
            <Button variant="danger" onClick={logout}>
              <LogOut size={16} /> Log out
            </Button>
          </Panel>

          <Panel title="Delivery Channels">
            <dl className="mb-3">
              <InfoRow
                label="Email"
                value={<StatusBadge status={settings.integrations.email.configured ? "ACTIVE" : "PENDING"} label={settings.integrations.email.configured ? "Configured" : "Integration pending"} />}
              />
              <InfoRow
                label="WhatsApp"
                value={
                  <StatusBadge
                    status={settings.integrations.whatsapp.configured ? "ACTIVE" : "PENDING"}
                    label={settings.integrations.whatsapp.configured ? `Configured (${settings.integrations.whatsapp.provider})` : "Integration pending"}
                  />
                }
              />
              <InfoRow label="Undelivered WhatsApp messages" value={settings.integrations.whatsapp.pendingMessages} />
            </dl>
            <p className="text-xs" style={{ color: "var(--ss-secondary)" }}>
              Until a provider is configured on the server, credentials are never reported as sent — use “Download access PDF” after sending credentials to hand them over
              securely.
            </p>
          </Panel>
        </div>
      )}
    </>
  );
}
