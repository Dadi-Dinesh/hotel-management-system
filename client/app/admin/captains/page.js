"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Trash2, X, Save, ShieldCheck, UserCheck } from "lucide-react";
import api from "../../lib/api";
import { isAuthenticated, getUser } from "../../lib/auth";
import Navbar from "../../components/Navbar";
import toast from "react-hot-toast";

export default function StaffManagementPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState("ALL"); // "ALL", "CAPTAIN", "ADMIN"
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "CAPTAIN" });
  const [saving, setSaving] = useState(false);

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

  const handleOpenModal = (defaultRole = "CAPTAIN") => {
    setForm({ name: "", email: "", password: "", role: defaultRole });
    setShowModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/admin/users", form);
      toast.success(`${form.role === "ADMIN" ? "Admin" : "Captain"} account created!`);
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

    if (!confirm(`Delete ${targetUser.role === "ADMIN" ? "Admin" : "Captain"} "${targetUser.name}"?`)) return;

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
          <div className="text-center py-12 border border-dashed rounded-xl" style={{ borderColor: "var(--color-brown-900)" }}>
            <p className="font-bold uppercase tracking-widest text-sm text-gray-500">
              No accounts found in this category.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((item) => {
              const isSelf = item.id === currentUser?.id;
              const isAdmin = item.role === "ADMIN";

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
                      {isAdmin ? "🛡️ ADMIN" : "👨‍✈️ CAPTAIN"}
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
                Add New {form.role === "ADMIN" ? "Admin" : "Captain"} Account
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
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, role: "CAPTAIN" })}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                      form.role === "CAPTAIN" ? "bg-orange-500 text-white border-brown-900" : "bg-cream-100 text-brown-900 border-brown-900"
                    }`}
                    style={{
                      background: form.role === "CAPTAIN" ? "var(--color-orange-500)" : "var(--color-cream-100)",
                      color: form.role === "CAPTAIN" ? "white" : "var(--color-brown-900)",
                      borderColor: "var(--color-brown-900)",
                    }}
                  >
                    <UserCheck size={14} /> CAPTAIN
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, role: "ADMIN" })}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                      form.role === "ADMIN" ? "bg-brown-900 text-white border-brown-900" : "bg-cream-100 text-brown-900 border-brown-900"
                    }`}
                    style={{
                      background: form.role === "ADMIN" ? "var(--color-brown-800)" : "var(--color-cream-100)",
                      color: form.role === "ADMIN" ? "white" : "var(--color-brown-900)",
                      borderColor: "var(--color-brown-900)",
                    }}
                  >
                    <ShieldCheck size={14} /> ADMIN
                  </button>
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
                  placeholder="admin@nookambika.com"
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
                <Save size={16} /> {saving ? "Saving..." : `Create ${form.role === "ADMIN" ? "Admin" : "Captain"}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
