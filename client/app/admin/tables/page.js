"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import { isAuthenticated, getUser } from "../../lib/auth";
import Navbar from "../../components/Navbar";
import toast from "react-hot-toast";

export default function TableManagementPage() {
  const router = useRouter();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated() || getUser()?.role !== "ADMIN") {
      router.push("/admin/login");
      return;
    }
    fetchTables();
  }, [router]);

  const fetchTables = async () => {
    try {
      const res = await api.get("/tables");
      setTables(res.data.data);
    } catch (error) {
      toast.error("Failed to load tables");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (table) => {
    try {
      await api.patch(`/tables/${table.id}`, { isActive: !table.isActive });
      toast.success(`Table ${table.code} ${!table.isActive ? "enabled" : "disabled"}`);
      fetchTables();
    } catch (error) {
      toast.error("Failed to update table");
    }
  };

  const handleCloseSession = async (sessionId, tableCode) => {
    if (!confirm(`Close the active session for table ${tableCode}?`)) return;
    try {
      await api.patch(`/sessions/${sessionId}/close`);
      toast.success(`Session for table ${tableCode} closed`);
      fetchTables();
    } catch (error) {
      toast.error("Failed to close session");
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--color-cream-50)" }}>
      <Navbar title="Table Management" subtitle="12 Tables" backHref="/admin/dashboard" />

      <main className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[1,2,3,4,5,6,7,8,9,10,11,12].map((i) => (
              <div key={i} className="skeleton h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 stagger-children">
            {tables.map((table) => {
              const hasSession = table.activeSession;
              const sessionStatus = hasSession?.status;

              return (
                <div
                  key={table.id}
                  className="card animate-fade-in text-center"
                  style={{
                    opacity: 0,
                    borderTop: `3px solid ${
                      !table.isActive
                        ? "var(--color-danger)"
                        : sessionStatus === "BILL_REQUESTED"
                        ? "var(--color-warning)"
                        : hasSession
                        ? "var(--color-success)"
                        : "var(--color-cream-200)"
                    }`,
                  }}
                >
                  <p
                    className="text-2xl font-extrabold mb-1"
                    style={{
                      fontFamily: "var(--font-heading)",
                      color: table.isActive
                        ? "var(--color-brown-900)"
                        : "var(--color-text-muted)",
                    }}
                  >
                    {table.code}
                  </p>
                  <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
                    {!table.isActive
                      ? "Disabled"
                      : sessionStatus === "BILL_REQUESTED"
                      ? "Bill Requested"
                      : hasSession
                      ? "Occupied"
                      : "Available"}
                  </p>

                  {/* Toggle */}
                  <button
                    onClick={() => handleToggle(table)}
                    className="w-full py-1.5 rounded-lg text-xs font-semibold transition-all mb-2"
                    style={{
                      background: table.isActive ? "#E8F5E9" : "#FFEBEE",
                      color: table.isActive ? "#2E7D32" : "#C62828",
                    }}
                  >
                    {table.isActive ? "Enabled" : "Disabled"} — Tap to toggle
                  </button>

                  {/* Close session */}
                  {hasSession && (
                    <button
                      onClick={() => handleCloseSession(hasSession.id, table.code)}
                      className="w-full py-1.5 rounded-lg text-xs font-semibold"
                      style={{
                        background: "var(--color-cream-100)",
                        color: "var(--color-orange-600)",
                        border: "1px solid var(--color-cream-200)",
                      }}
                    >
                      Close Session
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
