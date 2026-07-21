"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UtensilsCrossed, LogIn } from "lucide-react";
import api from "../../lib/api";
import { setAuth } from "../../lib/auth";
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
      const { token, user } = res.data.data;

      if (user.role !== "CAPTAIN" && user.role !== "ADMIN") {
        toast.error("Access denied. Captain credentials required.");
        return;
      }

      setAuth(token, user);
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
            className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center mx-auto mb-4 border-2 shadow-md"
            style={{
              borderColor: "var(--color-orange-500)",
              background: "var(--color-cream-100)",
            }}
          >
            <img
              src="/dhaba-logo.jpg"
              alt="Sree Nookambika Dhaba Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <h1
            className="text-2xl font-bold mb-1"
            style={{
              fontFamily: "var(--font-heading)",
              color: "var(--color-brown-900)",
            }}
          >
            Captain Login
          </h1>
          <p
            className="text-sm"
            style={{ color: "var(--color-text-muted)" }}
          >
            Nookambika Dhaba
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
              placeholder="captain@nookambika.com"
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
      </div>
    </div>
  );
}
