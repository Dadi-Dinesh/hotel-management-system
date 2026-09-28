"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, LogIn } from "lucide-react";
import api from "../../lib/api";
import { setAuth } from "../../lib/auth";
import { PLATFORM_NAME } from "../../lib/branding";
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

      if (!["CAPTAIN", "MANAGER", "ADMIN"].includes(user.role)) {
        toast.error("Access denied. Captain credentials required.");
        return;
      }

      setAuth(token, user, restaurant);
      toast.success(`Welcome, ${user.name}!`);
      router.push("/captain/dashboard");
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
            <Users size={30} />
          </div>
          <h1
            className="text-2xl font-bold mb-1"
            style={{
              fontFamily: "var(--font-heading)",
              color: "var(--color-brown-900)",
            }}
          >
            Staff Portal
          </h1>
          <p
            className="text-sm"
            style={{ color: "var(--color-text-muted)" }}
          >
            Sign in to manage tables and orders
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@restaurant.com"
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
            className="btn-primary w-full py-3"
          >
            <LogIn size={18} />
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/restaurant/login"
            className="text-xs font-semibold hover:underline"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Restaurant Owner? Go to Restaurant Dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
