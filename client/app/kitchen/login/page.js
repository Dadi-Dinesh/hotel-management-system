"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChefHat, ArrowRight } from "lucide-react";
import api from "../../lib/api";
import { setAuth } from "../../lib/auth";
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

      if (!["KITCHEN", "ADMIN", "CAPTAIN"].includes(user.role)) {
        toast.error("Access denied. Kitchen portal permissions required.");
        return;
      }

      setAuth(token, user, restaurant);
      toast.success(`Welcome to Kitchen Portal, ${user.name}! 👨‍🍳`);
      router.push("/kitchen");
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
          Demo Kitchen credentials:{" "}
          <button
            type="button"
            onClick={() => {
              setEmail("kitchen@nookambika.com");
              setPassword("kitchen@123");
            }}
            className="font-bold underline"
            style={{ color: "var(--ss-accent-dark)" }}
          >
            Fill Demo Credentials
          </button>
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
