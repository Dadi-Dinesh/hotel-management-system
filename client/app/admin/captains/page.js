"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Trash2, X, Save } from "lucide-react";
import api from "../../lib/api";
import { isAuthenticated, getUser } from "../../lib/auth";
import Navbar from "../../components/Navbar";
import toast from "react-hot-toast";

export default function CaptainManagementPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated() || getUser()?.role !== "ADMIN") {
      router.push("/admin/login");
      return;
    }
    fetchUsers();
  }, [router]);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/admin/users");
      setUsers(res.data.data);
    } catch (error) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/admin/users", { ...form, role: "CAPTAIN" });
      toast.success("Captain account created!");
      setShowModal(false);
      setForm({ name: "", email: "", password: "" });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    if (!confirm(`Delete captain "${user.name}"?`)) return;
    try {
      await api.delete(`/admin/users/${user.id}`);
      toast.success("User deleted");
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete");
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--color-cream-50)" }}>
      <Navbar title="Captain Management" subtitle="Admin" backHref="/admin/dashboard" />

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
            Staff Accounts ({users.length})
          </h2>
          <button onClick={() => setShowModal(true)} className="btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.8125rem" }}>
            <UserPlus size={14} /> Add Captain
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2].map((i) => <div key={i} className="skeleton h-16 w-full" />)}</div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 rounded-xl" style={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: user.role === "ADMIN" ? "var(--color-brown-800)" : "var(--color-orange-500)", color: "white" }}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>{user.name}</p>
                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: user.role === "ADMIN" ? "var(--color-brown-800)" : "var(--color-cream-100)", color: user.role === "ADMIN" ? "white" : "var(--color-orange-600)", border: user.role === "ADMIN" ? "none" : "1px solid var(--color-cream-200)" }}>
                    {user.role}
                  </span>
                  {user.role !== "ADMIN" && (
                    <button onClick={() => handleDelete(user)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#FFEBEE", color: "#C62828" }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Captain Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setShowModal(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(61, 39, 16, 0.3)" }} />
          <div className="relative w-full max-w-sm rounded-2xl p-6 animate-scale-in" style={{ background: "var(--color-cream-50)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>Add Captain</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--color-cream-100)" }}><X size={16} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="input" placeholder="Captain name" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="input" placeholder="captain@nookambika.com" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>Password</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required className="input" placeholder="Set a password" minLength={6} />
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full py-3">
                <Save size={16} /> {saving ? "Creating..." : "Create Captain"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
