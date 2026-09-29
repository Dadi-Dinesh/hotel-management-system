"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, LogIn } from "lucide-react";
import api from "../../lib/api";
import { setAuth } from "../../lib/auth";
import AuthShell from "../../components/AuthShell";
import Input from "../../components/ui/Input";
import toast from "react-hot-toast";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post("/auth/login", { email, password });
      const { token, user, restaurant } = res.data.data;

      if (user.role !== "ADMIN") {
        toast.error("Access denied. Admin credentials required.");
        return;
      }

      setAuth(token, user, restaurant);
      toast.success(`Welcome, ${user.name}!`);
      router.push("/admin/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      icon={Shield}
      title="ServeSync Admin"
      subtitle="Platform Administration"
      tagline="Manage your restaurant's menu, tables, orders, and analytics from one dashboard."
      footer={
        <Link href="/restaurant/login" className="ss-caption font-semibold hover:underline" style={{ color: "var(--ss-secondary)" }}>
          Managing a restaurant? Sign in to Restaurant Dashboard →
        </Link>
      }
    >
      <form onSubmit={handleLogin} className="space-y-4">
        <Input
          id="admin-email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@servesync.com"
          required
        />
        <Input
          id="admin-password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter admin password"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="ss-btn w-full py-4 ss-body font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          data-variant="primary"
          style={{ background: "var(--ss-accent)", color: "var(--ss-on-accent)", borderRadius: "var(--ss-radius-button)", boxShadow: "var(--ss-shadow-md)" }}
        >
          <LogIn size={18} />
          {loading ? "Logging in..." : "Login to ServeSync"}
        </button>
      </form>
    </AuthShell>
  );
}
