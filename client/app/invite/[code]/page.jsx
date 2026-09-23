"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { UserPlus, Lock, AlertTriangle, Sparkles } from "lucide-react";
import api from "../../lib/api";
import { setAuth } from "../../lib/auth";
import { PLATFORM_NAME } from "../../lib/branding";
import toast from "react-hot-toast";

const ROLE_LABELS = {
  MANAGER: "Manager",
  CAPTAIN: "Captain",
  KITCHEN: "Kitchen Staff",
  ADMIN: "Admin",
};

export default function InviteClaimPage() {
  const router = useRouter();
  const params = useParams();
  const code = params?.code;

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!code) return;
    api
      .get(`/invites/${code}`)
      .then((res) => setInvite(res.data.data))
      .catch((err) => setError(err.response?.data?.message || "This invite could not be found."))
      .finally(() => setLoading(false));
  }, [code]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords don't match.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/invites/${code}/accept`, { password });
      const { token, user } = res.data.data;
      setAuth(token, user);
      toast.success(res.data.message || `Welcome, ${user.name}!`);
      router.push(user.role === "KITCHEN" ? "/kitchen" : "/captain/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't accept invite. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12" style={{ background: "var(--color-cream-50)" }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: "var(--color-orange-500)", borderTopColor: "transparent" }} />
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Checking invite...</p>
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "#FEF2F2" }}
            >
              <AlertTriangle size={28} color="#991B1B" />
            </div>
            <h1 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
              Invite Unavailable
            </h1>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{error}</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              {invite.restaurant?.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={invite.restaurant.logo}
                  alt={invite.restaurant.name}
                  className="w-16 h-16 rounded-2xl object-cover mx-auto mb-4 border-2"
                  style={{ borderColor: "var(--color-brown-900)" }}
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: invite.restaurant?.primaryColor || "var(--color-brown-800)", boxShadow: "0 8px 32px rgba(92, 61, 26, 0.3)" }}
                >
                  <UserPlus size={28} color="white" />
                </div>
              )}
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--color-orange-600)" }}>
                <Sparkles size={11} className="inline mb-0.5 mr-1" /> You&apos;re invited
              </p>
              <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
                Join {invite.restaurant?.name || PLATFORM_NAME}
              </h1>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                {invite.name} · {ROLE_LABELS[invite.role] || invite.role}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
                  Create Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                  minLength={6}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  minLength={6}
                  className="input"
                />
              </div>

              <button type="submit" disabled={submitting} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                <Lock size={16} /> {submitting ? "Setting up..." : "Create Account & Join"}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
