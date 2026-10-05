"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, LogIn } from "lucide-react";
import api from "../../lib/api";
import { setAuth, getPostLoginRoute } from "../../lib/auth";
import AuthShell from "../../components/AuthShell";
import Input from "../../components/ui/Input";
import toast from "react-hot-toast";

export default function CaptainLoginPage() {
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

      // MANAGER is included alongside CAPTAIN — it's a real, invitable staff
      // role (see invite.controller.js's INVITABLE_ROLES) with no dashboard
      // of its own; the Captain UI is its only usable surface today. ADMIN is
      // deliberately excluded: an admin account has its own portal and must
      // not be able to walk into Captain's via a shared allow-list.
      // ServeSync Platform Admin credentials are routed to the platform portal.
      if (user.restaurantId && !["CAPTAIN", "MANAGER"].includes(user.role)) {
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
      icon={Users}
      title="Staff Portal"
      subtitle="Sign in to manage tables and orders"
      tagline="Live seating, order acceptance, bill requests, and KOT printing in one place."
      footer={
        <Link href="/login" className="ss-caption font-semibold hover:underline" style={{ color: "var(--ss-secondary)" }}>
          Looking for a different workspace? →
        </Link>
      }
    >
      <form onSubmit={handleLogin} className="space-y-4">
        <Input
          id="captain-email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="staff@restaurant.com"
          required
        />
        <Input
          id="captain-password"
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
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </AuthShell>
  );
}
