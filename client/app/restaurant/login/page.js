"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Store, LogIn, ShieldAlert } from "lucide-react";
import api from "../../lib/api";
import { setAuth } from "../../lib/auth";
import { PLATFORM_NAME } from "../../lib/branding";
import toast from "react-hot-toast";

export default function RestaurantLoginPage() {
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

      setAuth(token, user, restaurant);
      toast.success(`Welcome back, ${user.name}!`);

      if (user.role === "ADMIN" || user.role === "MANAGER") {
        router.push("/admin/dashboard");
      } else if (user.role === "CAPTAIN") {
        router.push("/captain/dashboard");
      } else if (user.role === "KITCHEN") {
        router.push("/kitchen");
      } else {
        router.push("/admin/dashboard");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "var(--color-cream-50)" }}
    >
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 shadow-xs"
            style={{
              borderColor: "var(--color-orange-500)",
              background: "var(--color-cream-100)",
              color: "var(--color-orange-600)",
            }}
          >
            <Store size={30} />
          </div>
          <h1
            className="text-2xl font-bold mb-1"
            style={{
              fontFamily: "var(--font-heading)",
              color: "var(--color-brown-900)",
            }}
          >
            Restaurant Dashboard
          </h1>
          <p
            className="text-sm font-medium"
            style={{ color: "var(--color-text-muted)" }}
          >
            Sign in to manage your restaurant.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@restaurant.com"
              required
              className="input"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 text-sm font-bold uppercase tracking-wider"
          >
            <LogIn size={18} />
            {loading ? "Signing In..." : "Sign in to Dashboard"}
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-8 pt-6 border-t space-y-3 text-center" style={{ borderColor: "var(--color-border-light)" }}>
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            Platform administrator?{" "}
            <Link href="/admin/login" className="font-bold underline hover:text-stone-900" style={{ color: "var(--color-brown-900)" }}>
              ServeSync Admin
            </Link>
          </p>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            New to {PLATFORM_NAME}?{" "}
            <Link href="/apply" className="font-bold underline text-amber-600 hover:text-amber-700">
              Register Your Restaurant
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
