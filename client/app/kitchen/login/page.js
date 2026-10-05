"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChefHat, ArrowRight } from "lucide-react";
import api from "../../lib/api";
import { setAuth, getPostLoginRoute } from "../../lib/auth";
import AuthShell from "../../components/AuthShell";
import Input from "../../components/ui/Input";
import toast from "react-hot-toast";

export default function KitchenLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      const { user, token, restaurant } = res.data.data;

      // ServeSync Platform Admin credentials are routed to the platform portal.
      if (user.restaurantId && user.role !== "KITCHEN") {
        toast.error("This account does not have access to this portal.");
        return;
      }

      setAuth(token, user, restaurant);
      toast.success(user.restaurantId ? `Welcome to Kitchen Portal, ${user.name}! 👨‍🍳` : `Welcome, ${user.name}!`);
      router.push(getPostLoginRoute(user));
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      icon={ChefHat}
      title="Kitchen Display System"
      subtitle="Commercial KDS · Staff Portal Access"
      tagline="Live order tickets, elapsed-time tracking, and one-tap status updates."
      footer={
        <p className="ss-caption">
          <Link href="/login" className="font-semibold hover:underline" style={{ color: "var(--ss-secondary)" }}>
            Looking for a different workspace? →
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="kitchen-email"
          label="Kitchen Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="kitchen@restaurant.com"
          required
        />
        <Input
          id="kitchen-password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="ss-btn w-full py-4 ss-body font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          data-variant="primary"
          style={{ background: "var(--ss-accent)", color: "var(--ss-on-accent)", borderRadius: "var(--ss-radius-button)", boxShadow: "var(--ss-shadow-md)" }}
        >
          {loading ? "Authenticating..." : "Enter Kitchen Display"}
          <ArrowRight size={16} />
        </button>
      </form>
    </AuthShell>
  );
}
