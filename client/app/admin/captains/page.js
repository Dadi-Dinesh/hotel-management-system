"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  Trash2,
  X,
  Save,
  ShieldCheck,
  UserCheck,
  Users,
  BarChart3,
  Mail,
  ChefHat,
  Briefcase,
  Copy,
  Check,
  Send,
  Clock,
  QrCode as QrCodeIcon,
} from "lucide-react";
import api from "../../lib/api";
import { isAuthenticated, getUser } from "../../lib/auth";
import { useRestaurant } from "../../components/RestaurantContext";
import Navbar from "../../components/Navbar";
import AnalyticsTable from "../../components/admin/AnalyticsTable";
import EmptyState from "../../components/EmptyState";
import QRCodeGenerator from "../../components/QRCodeGenerator";
import toast from "react-hot-toast";

const ROLE_OPTIONS = [
  { key: "CAPTAIN", label: "Captain", icon: UserCheck },
  { key: "MANAGER", label: "Manager", icon: Briefcase },
  { key: "KITCHEN", label: "Kitchen", icon: ChefHat },
  { key: "ADMIN", label: "Admin", icon: ShieldCheck },
];

const INVITE_STATUS_STYLES = {
  PENDING: { bg: "#EFF6FF", color: "#1D4ED8", label: "Pending" },
  ACCEPTED: { bg: "#ECFDF5", color: "#065F46", label: "Accepted" },
  EXPIRED: { bg: "#F3F4F6", color: "#6B7280", label: "Expired" },
  REVOKED: { bg: "#FEF2F2", color: "#991B1B", label: "Revoked" },
};

export default function StaffManagementPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState("ALL"); // "ALL", "CAPTAIN", "ADMIN"
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "CAPTAIN" });
  const [saving, setSaving] = useState(false);

  // Performance tab (additive — Accounts tab below is unchanged)
  const [viewMode, setViewMode] = useState("accounts"); // "accounts" | "performance" | "invites"
  const [waiterStats, setWaiterStats] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsLoaded, setStatsLoaded] = useState(false);

  // Invites tab (Phase 7)
  const { restaurant: activeRestaurant } = useRestaurant();
  const [invites, setInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [invitesLoaded, setInvitesLoaded] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", phone: "", email: "", role: "CAPTAIN" });
  const [sendingInvite, setSendingInvite] = useState(false);
  const [viewingInvite, setViewingInvite] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    if (!isAuthenticated() || getUser()?.role !== "ADMIN") {
      router.push("/admin/login");
      return;
    }
    setCurrentUser(getUser());
    fetchUsers();
  }, [router]);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/admin/users");
      setUsers(res.data.data);
    } catch (error) {
      toast.error("Failed to load staff accounts");
    } finally {
      setLoading(false);
    }
  };

  const fetchWaiterStats = async () => {
    setStatsLoading(true);
    try {
      const res = await api.get("/admin/analytics/waiters");
      setWaiterStats(res.data.data || []);
      setStatsLoaded(true);
    } catch (error) {
      toast.error("Failed to load staff performance");
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === "performance" && !statsLoaded) {
      fetchWaiterStats();
    }
  }, [viewMode, statsLoaded]);

  const fetchInvites = async () => {
    setInvitesLoading(true);
    try {
      const res = await api.get("/invites");
      setInvites(res.data.data || []);
      setInvitesLoaded(true);
    } catch (error) {
      toast.error("Failed to load invites");
    } finally {
      setInvitesLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === "invites" && !invitesLoaded) {
      fetchInvites();
    }
  }, [viewMode, invitesLoaded]);

  const handleSendInvite = async (e) => {
    e.preventDefault();
    setSendingInvite(true);
    try {
      const res = await api.post("/invites", inviteForm);
      toast.success(`Invite created for ${res.data.data.name}.`);
      setShowInviteModal(false);
      setInviteForm({ name: "", phone: "", email: "", role: "CAPTAIN" });
      setInvitesLoaded(false);
      setViewMode("invites");
      setViewingInvite(res.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create invite");
    } finally {
      setSendingInvite(false);
    }
  };

  const handleRevokeInvite = async (invite) => {
    if (!confirm(`Revoke the invite for "${invite.name}"?`)) return;
    try {
      await api.delete(`/invites/${invite.id}`);
      toast.success("Invite revoked.");
      setInvitesLoaded(false);
      fetchInvites();
    } catch (error) {
      toast.error("Failed to revoke invite");
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      toast.success("Invite code copied!");
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  const handleCopyLink = (code) => {
    const link = `${window.location.origin}/invite/${code}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedCode(code);
      toast.success("Invite link copied!");
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  const handleOpenModal = (defaultRole = "CAPTAIN") => {
    setForm({ name: "", email: "", password: "", role: defaultRole });
    setShowModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/admin/users", form);
      toast.success(`${ROLE_OPTIONS.find((r) => r.key === form.role)?.label || form.role} account created!`);
      setShowModal(false);
      setForm({ name: "", email: "", password: "", role: "CAPTAIN" });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create account");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (targetUser) => {
    if (targetUser.id === currentUser?.id) {
      toast.error("You cannot delete your own active account.");
      return;
    }

    if (!confirm(`Delete ${targetUser.role} "${targetUser.name}"?`)) return;

    try {
      await api.delete(`/admin/users/${targetUser.id}`);
      toast.success("Account deleted successfully.");
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete account");
    }
  };

  const filteredUsers = users.filter((u) => {
    if (filter === "CAPTAIN") return u.role === "CAPTAIN";
    if (filter === "ADMIN") return u.role === "ADMIN";
    return true;
  });

  const captainsCount = users.filter((u) => u.role === "CAPTAIN").length;
  const adminsCount = users.filter((u) => u.role === "ADMIN").length;

  return (
    <div className="min-h-screen" style={{ background: "var(--color-cream-50)" }}>
      <Navbar title="Staff & Admin Management" subtitle="Admin Portal" backHref="/admin/dashboard" />

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Accounts / Performance Tab Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-lg mb-6 w-fit" style={{ background: "var(--color-cream-100)" }}>
          <button
            onClick={() => setViewMode("accounts")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-black uppercase tracking-wide transition-colors"
            style={{
              background: viewMode === "accounts" ? "var(--color-brown-900)" : "transparent",
              color: viewMode === "accounts" ? "white" : "var(--color-brown-900)",
            }}
          >
            <Users size={14} /> Accounts
          </button>
          <button
            onClick={() => setViewMode("performance")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-black uppercase tracking-wide transition-colors"
            style={{
              background: viewMode === "performance" ? "var(--color-brown-900)" : "transparent",
              color: viewMode === "performance" ? "white" : "var(--color-brown-900)",
            }}
          >
            <BarChart3 size={14} /> Performance
          </button>
          <button
            onClick={() => setViewMode("invites")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-black uppercase tracking-wide transition-colors"
            style={{
              background: viewMode === "invites" ? "var(--color-brown-900)" : "transparent",
              color: viewMode === "invites" ? "white" : "var(--color-brown-900)",
            }}
          >
            <Send size={14} /> Invites
          </button>
        </div>

        {viewMode === "invites" ? (
          <div>
            <div className="flex items-center justify-between mb-5">
              <p className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
                Invite staff by code or QR — they set their own password and are automatically assigned to your restaurant only.
              </p>
              <button
                onClick={() => setShowInviteModal(true)}
                className="btn-primary flex items-center gap-1.5 flex-shrink-0"
                style={{ padding: "0.5rem 0.875rem", fontSize: "0.8125rem" }}
              >
                <UserPlus size={14} /> Invite Staff
              </button>
            </div>

            {invitesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "var(--color-cream-200)" }} />)}
              </div>
            ) : invites.length === 0 ? (
              <EmptyState
                icon={<Send size={30} style={{ color: "var(--color-text-muted)" }} />}
                title="No Invites Yet"
                description="Invite a waiter, manager, or kitchen staff member — they'll get a code and QR to join instantly."
                action={<button onClick={() => setShowInviteModal(true)} className="btn-primary text-xs font-bold px-4 py-2 uppercase tracking-wider"><UserPlus size={14} />Invite Staff</button>}
              />
            ) : (
              <div className="space-y-3">
                {invites.map((invite) => {
                  const style = INVITE_STATUS_STYLES[invite.computedStatus] || INVITE_STATUS_STYLES.PENDING;
                  return (
                    <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border" style={{ borderColor: "var(--color-brown-900)", background: "var(--color-surface-elevated)" }}>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-sm" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>{invite.name}</p>
                          <span className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: style.bg, color: style.color }}>{style.label}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: "var(--color-cream-100)", color: "var(--color-text-muted)" }}>{invite.role}</span>
                        </div>
                        <p className="text-xs font-medium mt-0.5" style={{ color: "var(--color-text-muted)" }}>{invite.email || invite.phone || "No contact on file"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleCopyCode(invite.code)} className="flex items-center gap-1.5 text-xs font-mono font-black px-2.5 py-1.5 rounded-lg border" style={{ borderColor: "var(--color-border-light)", color: "var(--color-orange-600)" }}>
                          {copiedCode === invite.code ? <Check size={13} /> : <Copy size={13} />} {invite.code}
                        </button>
                        <button onClick={() => setViewingInvite(invite)} className="w-8 h-8 rounded-lg border flex items-center justify-center" style={{ borderColor: "var(--color-border-light)", color: "var(--color-brown-900)" }} title="Show QR">
                          <QrCodeIcon size={14} />
                        </button>
                        {invite.computedStatus === "PENDING" && (
                          <button onClick={() => handleRevokeInvite(invite)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#FFEBEE", color: "#C62828" }} title="Revoke">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : viewMode === "performance" ? (
          <div>
            <p className="text-xs font-semibold mb-4" style={{ color: "var(--color-text-muted)" }}>
              Tracked from order-accept and bill-close actions going forward — staff who haven&apos;t performed either yet show as &quot;No tracked activity.&quot; This is statistics only; no ranking or comparison judgment is implied.
            </p>
            {statsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: "var(--color-cream-200)" }} />)}
              </div>
            ) : (
              <AnalyticsTable
                columns={[
                  { key: "name", label: "Staff", sortable: true, render: (r) => (
                    <div>
                      <p className="font-bold" style={{ color: "var(--color-brown-900)" }}>{r.name}</p>
                      <p className="text-[10px] uppercase font-bold tracking-wide" style={{ color: "var(--color-text-muted)" }}>{r.role}</p>
                    </div>
                  ) },
                  { key: "tablesHandled", label: "Tables Handled", sortable: true, align: "right" },
                  { key: "ordersAccepted", label: "Orders Accepted", sortable: true, align: "right" },
                  { key: "billsGenerated", label: "Bills Generated", sortable: true, align: "right" },
                  { key: "averageServiceTimeMinutes", label: "Avg Service Time", sortable: true, align: "right", render: (r) => `${r.averageServiceTimeMinutes}m` },
                  {
                    key: "recentlyActive",
                    label: "Status",
                    align: "center",
                    render: (r) =>
                      !r.hasTrackedActivity ? (
                        <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>No tracked activity</span>
                      ) : r.recentlyActive ? (
                        <span className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: "#ECFDF5", color: "#065F46" }}>Active</span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: "var(--color-cream-100)", color: "var(--color-text-muted)" }}>Inactive</span>
                      ),
                  },
                ]}
                rows={waiterStats}
                rowKey={(r) => r.id}
                searchPlaceholder="Search staff..."
                pageSize={10}
                emptyMessage="No staff accounts found."
              />
            )}
          </div>
        ) : (
        <>
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
              Staff & Admin Accounts ({users.length})
            </h2>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-0.5">
              Manage Captain and Administrator login credentials
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleOpenModal("CAPTAIN")}
              className="btn-primary flex items-center gap-1.5"
              style={{ padding: "0.5rem 0.875rem", fontSize: "0.8125rem" }}
            >
              <UserPlus size={14} /> Add Captain
            </button>
            <button
              onClick={() => handleOpenModal("ADMIN")}
              className="btn-secondary flex items-center gap-1.5"
              style={{
                padding: "0.5rem 0.875rem",
                fontSize: "0.8125rem",
                background: "var(--color-brown-800)",
                color: "white",
                borderColor: "var(--color-brown-900)",
              }}
            >
              <ShieldCheck size={14} /> Add Admin
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 border-b pb-3" style={{ borderColor: "var(--color-cream-300)" }}>
          {[
            { id: "ALL", label: `ALL ACCOUNTS (${users.length})` },
            { id: "CAPTAIN", label: `CAPTAINS (${captainsCount})` },
            { id: "ADMIN", label: `ADMINS (${adminsCount})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-lg border transition-all ${
                filter === t.id
                  ? "bg-brown-900 text-white border-brown-900"
                  : "bg-surface text-brown-900 border-brown-900 hover:bg-cream-200"
              }`}
              style={{
                background: filter === t.id ? "var(--color-brown-900)" : "var(--color-surface)",
                color: filter === t.id ? "white" : "var(--color-brown-900)",
                borderColor: "var(--color-brown-900)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Users List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-16 w-full" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            icon={<UserCheck size={30} style={{ color: "var(--color-text-muted)" }} />}
            title="No Staff Accounts"
            description="No accounts found in this category. Add staff directly or send an invite from the Invites tab."
          />
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((item) => {
              const isSelf = item.id === currentUser?.id;
              const isAdmin = item.role === "ADMIN";
              const roleDisplay = { ADMIN: "🛡️ ADMIN", MANAGER: "💼 MANAGER", CAPTAIN: "👨‍✈️ CAPTAIN", KITCHEN: "👨‍🍳 KITCHEN" }[item.role] || item.role;

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 rounded-xl border transition-all"
                  style={{
                    background: "var(--color-surface-elevated)",
                    borderColor: "var(--color-brown-900)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-xs"
                      style={{
                        background: isAdmin ? "var(--color-brown-800)" : "var(--color-orange-500)",
                        color: "white",
                      }}
                    >
                      {item.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p
                          className="font-bold text-sm"
                          style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}
                        >
                          {item.name}
                        </p>
                        {isSelf && (
                          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-amber-200 text-amber-900 border border-amber-400">
                            YOU
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                        {item.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className="text-xs px-3 py-1 rounded-full font-bold tracking-wider"
                      style={{
                        background: isAdmin ? "var(--color-brown-800)" : "var(--color-cream-100)",
                        color: isAdmin ? "white" : "var(--color-orange-600)",
                        border: isAdmin ? "none" : "1px solid var(--color-cream-300)",
                      }}
                    >
                      {roleDisplay}
                    </span>

                    {!isSelf ? (
                      <button
                        onClick={() => handleDelete(item)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-red-200"
                        style={{ background: "#FFEBEE", color: "#C62828", border: "1px solid #FFCDD2" }}
                        title={`Delete ${item.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : (
                      <div className="w-8 h-8 flex items-center justify-center opacity-30 text-gray-400" title="Cannot delete logged-in account">
                        <Trash2 size={14} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </>
        )}
      </main>

      {/* Create User Modal (Captain or Admin) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setShowModal(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(61, 39, 16, 0.4)", backdropFilter: "blur(2px)" }} />
          <div
            className="relative w-full max-w-sm rounded-2xl p-6 border-2 border-brown-900 shadow-2xl animate-scale-in"
            style={{ background: "var(--color-surface)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5 pb-3 border-b" style={{ borderColor: "var(--color-cream-300)" }}>
              <h3 className="text-base font-bold uppercase tracking-wider" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
                Add New {ROLE_OPTIONS.find((r) => r.key === form.role)?.label || form.role} Account
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg border flex items-center justify-center"
                style={{ borderColor: "var(--color-brown-900)", background: "var(--color-cream-100)" }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-brown-900)" }}>
                  Account Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLE_OPTIONS.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm({ ...form, role: key })}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all"
                      style={{
                        background: form.role === key ? "var(--color-orange-500)" : "var(--color-cream-100)",
                        color: form.role === key ? "white" : "var(--color-brown-900)",
                        borderColor: "var(--color-brown-900)",
                      }}
                    >
                      <Icon size={14} /> {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-brown-900)" }}>
                  Full Name
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="input"
                  placeholder="e.g. Dinesh Kumar"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-brown-900)" }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="input"
                  placeholder="staff@restaurant.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-brown-900)" }}>
                  Password
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  className="input"
                  placeholder="Minimum 6 characters"
                  minLength={6}
                />
              </div>

              <button type="submit" disabled={saving} className="btn-primary w-full py-3 text-xs font-bold uppercase tracking-wider mt-2">
                <Save size={16} /> {saving ? "Saving..." : `Create ${ROLE_OPTIONS.find((r) => r.key === form.role)?.label || form.role}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Invite Staff Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setShowInviteModal(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(61, 39, 16, 0.4)", backdropFilter: "blur(2px)" }} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-sm rounded-2xl p-6 border-2 border-brown-900 shadow-2xl"
            style={{ background: "var(--color-surface)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5 pb-3 border-b" style={{ borderColor: "var(--color-cream-300)" }}>
              <h3 className="text-base font-bold uppercase tracking-wider" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
                Invite Staff
              </h3>
              <button onClick={() => setShowInviteModal(false)} className="w-8 h-8 rounded-lg border flex items-center justify-center" style={{ borderColor: "var(--color-brown-900)", background: "var(--color-cream-100)" }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-brown-900)" }}>Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLE_OPTIONS.filter((r) => r.key !== "ADMIN").map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setInviteForm({ ...inviteForm, role: key })}
                      className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all"
                      style={{
                        background: inviteForm.role === key ? "var(--color-orange-500)" : "var(--color-cream-100)",
                        color: inviteForm.role === key ? "white" : "var(--color-brown-900)",
                        borderColor: "var(--color-brown-900)",
                      }}
                    >
                      <Icon size={14} /> {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-brown-900)" }}>Name</label>
                <input value={inviteForm.name} onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })} required className="input" placeholder="e.g. Priya Sharma" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-brown-900)" }}>Phone</label>
                <input value={inviteForm.phone} onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })} className="input" placeholder="Optional" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-brown-900)" }}>Email</label>
                <input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} className="input" placeholder="Needed for them to accept via link" />
              </div>
              <button type="submit" disabled={sendingInvite} className="btn-primary w-full py-3 text-xs font-bold uppercase tracking-wider mt-2 flex items-center justify-center gap-2">
                <Send size={15} /> {sendingInvite ? "Sending..." : "Create Invite"}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* View Invite Code / QR Modal */}
      <AnimatePresence>
        {viewingInvite && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setViewingInvite(null)}>
            <div className="absolute inset-0" style={{ background: "rgba(61, 39, 16, 0.4)" }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-xs rounded-2xl p-6 border-2 shadow-2xl text-center"
              style={{ background: "var(--color-surface)", borderColor: "var(--color-brown-900)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="font-black text-sm uppercase tracking-widest mb-1" style={{ color: "var(--color-brown-900)" }}>{viewingInvite.name}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide mb-4" style={{ color: "var(--color-text-muted)" }}>
                <Clock size={10} className="inline mr-1" /> Expires {new Date(viewingInvite.expiresAt).toLocaleDateString()}
              </p>

              <div className="flex justify-center mb-4">
                <InviteQRPreview code={viewingInvite.code} />
              </div>

              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="font-mono font-black text-lg tracking-widest" style={{ color: "var(--color-orange-600)" }}>{viewingInvite.code}</span>
                <button onClick={() => handleCopyCode(viewingInvite.code)} title="Copy code">
                  {copiedCode === viewingInvite.code ? <Check size={16} style={{ color: "var(--color-success)" }} /> : <Copy size={16} style={{ color: "var(--color-text-muted)" }} />}
                </button>
              </div>

              <button onClick={() => handleCopyLink(viewingInvite.code)} className="btn-secondary w-full py-2.5 text-xs font-bold uppercase tracking-wider mb-2 flex items-center justify-center gap-2">
                <Mail size={13} /> Copy Invite Link
              </button>
              <button onClick={() => setViewingInvite(null)} className="w-full py-2 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Small standalone QR preview for an invite's claim link — doesn't need a table. */
function InviteQRPreview({ code }) {
  const [dataUrl, setDataUrl] = useState(null);

  useEffect(() => {
    let active = true;
    import("../../lib/posterUtils").then(({ generateQRDataUrl }) => {
      const url = `${window.location.origin}/invite/${code}`;
      generateQRDataUrl(url).then((d) => active && setDataUrl(d));
    });
    return () => {
      active = false;
    };
  }, [code]);

  if (!dataUrl) {
    return <div className="w-36 h-36 rounded-lg animate-pulse" style={{ background: "var(--color-cream-200)" }} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={dataUrl} alt={`QR code to join via invite ${code}`} width={144} height={144} className="rounded-lg border" style={{ borderColor: "var(--color-border-light)" }} />;
}
