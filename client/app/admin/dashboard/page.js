"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  ShoppingBag,
  Users,
  UtensilsCrossed,
  Grid3X3,
  ClipboardList,
  LogOut,
  Award,
  IndianRupee,
} from "lucide-react";
import api from "../../lib/api";
import { getUser, clearAuth, isAuthenticated } from "../../lib/auth";
import Navbar from "../../components/Navbar";
import toast from "react-hot-toast";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/admin/login");
      return;
    }
    const u = getUser();
    if (u?.role !== "ADMIN") {
      router.push("/admin/login");
      return;
    }
    setUser(u);
    fetchStats();
  }, [router]);

  const fetchStats = async () => {
    try {
      const res = await api.get("/admin/stats");
      setStats(res.data.data);
    } catch (error) {
      toast.error("Failed to load stats");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    router.push("/admin/login");
  };

  if (!user) return null;

  const navItems = [
    {
      href: "/admin/menu",
      icon: <UtensilsCrossed size={24} />,
      label: "Menu Management",
      desc: "Add, edit, remove items",
    },
    {
      href: "/admin/orders",
      icon: <ClipboardList size={24} />,
      label: "Order History",
      desc: "View and filter orders",
    },
    {
      href: "/admin/tables",
      icon: <Grid3X3 size={24} />,
      label: "Table Management",
      desc: "Enable or disable tables",
    },
    {
      href: "/admin/captains",
      icon: <Users size={24} />,
      label: "Captain Management",
      desc: "Manage captain accounts",
    },
  ];

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--color-surface)" }}
    >
      <Navbar
        title="Admin Dashboard"
        subtitle="Nookambika Dhaba"
        rightContent={
          <button
            onClick={handleLogout}
            className="w-10 h-10 border flex items-center justify-center transition-colors hover:bg-brown-900 hover:text-white"
            style={{
              borderColor: "var(--color-brown-900)",
              color: "var(--color-danger)",
            }}
          >
            <LogOut size={20} />
          </button>
        }
      />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Revenue Stats */}
        <section className="mb-10">
          <h2
            className="text-xl font-black uppercase tracking-widest mb-6"
            style={{
              fontFamily: "var(--font-heading)",
              color: "var(--color-brown-900)",
            }}
          >
            Revenue Overview
          </h2>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton h-28 w-full border border-brown-900" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Today's Revenue",
                  value: stats?.revenue?.today || 0,
                  icon: <IndianRupee size={24} />,
                },
                {
                  label: "This Week",
                  value: stats?.revenue?.thisWeek || 0,
                  icon: <TrendingUp size={24} />,
                },
                {
                  label: "This Month",
                  value: stats?.revenue?.thisMonth || 0,
                  icon: <BarChart3 size={24} />,
                },
                {
                  label: "Total Revenue",
                  value: stats?.revenue?.total || 0,
                  icon: <Award size={24} />,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="card"
                >
                  <div
                    className="w-12 h-12 border flex items-center justify-center mb-4"
                    style={{
                      borderColor: "var(--color-brown-900)",
                      background: "var(--color-cream-200)",
                      color: "var(--color-brown-900)",
                    }}
                  >
                    {stat.icon}
                  </div>
                  <p
                    className="text-2xl font-black"
                    style={{
                      fontFamily: "var(--font-heading)",
                      color: "var(--color-brown-900)",
                    }}
                  >
                    ₹{stat.value.toLocaleString()}
                  </p>
                  <p
                    className="text-xs font-bold uppercase tracking-widest mt-2"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quick Stats */}
        <section className="mb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className="card flex items-center gap-6"
            >
              <div
                className="w-16 h-16 border flex items-center justify-center"
                style={{
                  background: "var(--color-orange-500)",
                  borderColor: "var(--color-brown-900)",
                  color: "white",
                }}
              >
                <ShoppingBag size={28} />
              </div>
              <div>
                <p
                  className="text-3xl font-black"
                  style={{
                    fontFamily: "var(--font-heading)",
                    color: "var(--color-brown-900)",
                  }}
                >
                  {stats?.todayOrderCount || 0}
                </p>
                <p
                  className="text-sm font-bold uppercase tracking-widest mt-1"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Orders Today
                </p>
              </div>
            </div>
            <div
              className="card flex items-center gap-6"
            >
              <div
                className="w-16 h-16 border flex items-center justify-center"
                style={{
                  background: "var(--color-brown-900)",
                  borderColor: "var(--color-brown-900)",
                  color: "white",
                }}
              >
                <Grid3X3 size={28} />
              </div>
              <div>
                <p
                  className="text-3xl font-black"
                  style={{
                    fontFamily: "var(--font-heading)",
                    color: "var(--color-brown-900)",
                  }}
                >
                  {stats?.activeSessions || 0}
                </p>
                <p
                  className="text-sm font-bold uppercase tracking-widest mt-1"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Active Tables
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Top Selling */}
        {stats?.topSellingItems?.length > 0 && (
          <section className="mb-10">
            <h2
              className="text-xl font-black uppercase tracking-widest mb-6"
              style={{
                fontFamily: "var(--font-heading)",
                color: "var(--color-brown-900)",
              }}
            >
              Top Selling Items
            </h2>
            <div className="space-y-4">
              {stats.topSellingItems.map((item, idx) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-4 border"
                  style={{
                    background: "var(--color-surface)",
                    borderColor: "var(--color-brown-900)",
                  }}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className="w-8 h-8 flex items-center justify-center font-black border"
                      style={{
                        background:
                          idx === 0
                            ? "var(--color-orange-500)"
                            : "var(--color-cream-200)",
                        borderColor: "var(--color-brown-900)",
                        color: idx === 0 ? "white" : "var(--color-brown-900)",
                      }}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <p
                        className="text-sm font-bold uppercase tracking-widest"
                        style={{ color: "var(--color-brown-900)" }}
                      >
                        {item.name}
                      </p>
                      <p
                        className="text-xs uppercase tracking-wider mt-1"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {item.category}
                      </p>
                    </div>
                  </div>
                  <span
                    className="text-base font-black uppercase tracking-widest"
                    style={{ color: "var(--color-orange-500)" }}
                  >
                    {item.totalQuantity} SOLD
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Navigation Grid */}
        <section>
          <h2
            className="text-xl font-black uppercase tracking-widest mb-6"
            style={{
              fontFamily: "var(--font-heading)",
              color: "var(--color-brown-900)",
            }}
          >
            Management
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="border p-6 flex flex-col items-center text-center transition-colors hover:bg-cream-200"
                style={{ borderColor: "var(--color-brown-900)", textDecoration: "none" }}
              >
                <div
                  className="w-16 h-16 border flex items-center justify-center mb-4"
                  style={{
                    background: "var(--color-surface)",
                    borderColor: "var(--color-brown-900)",
                    color: "var(--color-orange-500)",
                  }}
                >
                  {item.icon}
                </div>
                <p
                  className="font-black text-lg uppercase tracking-widest"
                  style={{
                    fontFamily: "var(--font-heading)",
                    color: "var(--color-brown-900)",
                  }}
                >
                  {item.label}
                </p>
                <p
                  className="text-xs font-bold uppercase tracking-wider mt-2"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {item.desc}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
