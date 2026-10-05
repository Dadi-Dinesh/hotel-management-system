"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, LogIn } from "lucide-react";
import api from "../../lib/api";
import { setAuth, getPostLoginRoute } from "../../lib/auth";
import AuthShell from "../../components/AuthShell";
import Input from "../../components/ui/Input";
import toast from "react-hot-toast";

// Restaurant Admin sign-in. ServeSync Platform Admin credentials also work
// here and are routed to the platform portal (/platform), never to a
// restaurant dashboard — see lib/auth.js getPostLoginRoute.
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

      const isPlatformAdmin = !user.restaurantId;
      if (!isPlatformAdmin && user.role !== "ADMIN") {
        toast.error("This account does not have access to this portal.");
        return;
      }

      setAuth(token, user, restaurant);
      toast.success(`Welcome, ${user.name}!`);
      router.push(getPostLoginRoute(user));
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      icon={Shield}
      title="Restaurant Admin"
      subtitle="Sign in to manage your restaurant"
      tagline="Manage your restaurant's menu, tables, orders, staff and reports."
      footer={
        <div className="space-y-2">
          <p className="ss-caption">
            <Link href="/login" className="font-semibold hover:underline" style={{ color: "var(--ss-secondary)" }}>
              Looking for Captain or Kitchen login? →
            </Link>
          </p>
          <p className="ss-caption">
            New restaurant?{" "}
            <Link href="/apply" className="font-semibold hover:underline" style={{ color: "var(--ss-accent-dark)" }}>
              Register here
            </Link>
          </p>
        </div>
      }
    >
      <form onSubmit={handleLogin} className="space-y-4">
        <Input
          id="admin-email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@restaurant.com"
          required
        />
        <Input
          id="admin-password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
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
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}
