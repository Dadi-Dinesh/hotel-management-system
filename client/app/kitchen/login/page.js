"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChefHat, Lock, Mail, ArrowRight } from "lucide-react";
import api from "../../lib/api";
import { setAuth } from "../../lib/auth";
import toast from "react-hot-toast";

export default function KitchenLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("kitchen@nookambika.com");
  const [password, setPassword] = useState("kitchen@123");
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
      const { user, token } = res.data.data;

      if (!["KITCHEN", "ADMIN", "CAPTAIN"].includes(user.role)) {
        toast.error("Access denied. Kitchen portal permissions required.");
        return;
      }

      setAuth(token, user);
      toast.success(`Welcome to Kitchen Portal, ${user.name}! 👨‍🍳`);
      router.push("/kitchen");
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 font-sans select-none"
      style={{ background: "#FFF8EC", color: "#2E2E2E" }}
    >
      <div
        className="w-full max-w-md bg-white border-2 rounded-2xl p-8 shadow-lg space-y-6"
        style={{ borderColor: "#E8D8B5" }}
      >
        <div className="text-center space-y-2">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs"
            style={{ background: "#FFF8EC", color: "#B8860B", border: "1px solid #E8D8B5" }}
          >
            <ChefHat size={36} strokeWidth={2.2} />
          </div>
          <h1
            className="text-2xl font-black uppercase tracking-wider text-stone-900"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Kitchen Display System
          </h1>
          <p className="text-xs text-stone-500 font-bold uppercase tracking-wider">
            Commercial KDS • Staff Portal Access
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
              Kitchen Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 text-stone-400" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kitchen@nookambika.com"
                className="w-full bg-stone-50 border rounded-xl py-2.5 pl-10 pr-4 text-sm text-stone-900 font-medium placeholder-stone-400 focus:outline-none focus:border-[#B8860B] transition-colors"
                style={{ borderColor: "#E8D8B5" }}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 text-stone-400" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-stone-50 border rounded-xl py-2.5 pl-10 pr-4 text-sm text-stone-900 font-medium placeholder-stone-400 focus:outline-none focus:border-[#B8860B] transition-colors"
                style={{ borderColor: "#E8D8B5" }}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 text-white font-extrabold rounded-xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] disabled:opacity-50 hover:opacity-95"
            style={{ background: "#B8860B" }}
          >
            {loading ? "Authenticating..." : "Enter Kitchen Display"}
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="pt-4 border-t border-stone-100 text-center">
          <p className="text-[11px] text-stone-500 font-semibold">
            Default credentials: <span className="text-[#B8860B] font-bold font-mono">kitchen@nookambika.com</span> / <span className="text-[#B8860B] font-bold font-mono">kitchen@123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
