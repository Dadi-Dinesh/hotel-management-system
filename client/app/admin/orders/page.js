"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, IndianRupee, ClipboardList, User } from "lucide-react";
import api from "../../lib/api";
import { isAuthenticated, getUser } from "../../lib/auth";
import DashboardHeader from "../../components/admin/DashboardHeader";
import { OrderCardSkeleton } from "../../components/admin/AdminSkeletons";
import OrderStatusBadge from "../../components/OrderStatusBadge";
import EmptyState from "../../components/EmptyState";
import toast from "react-hot-toast";

function formatElapsed(createdAt) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(createdAt).getTime()) / 60000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function OrderHistoryPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("today");

  useEffect(() => {
    if (!isAuthenticated() || getUser()?.role !== "ADMIN") {
      router.push("/admin/login");
      return;
    }
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, period]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/orders?period=${period}`);
      setOrders(res.data.data.orders);
      setSummary(res.data.data.summary);
    } catch (error) {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const periods = [
    { value: "today", label: "Today" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--ss-bg)" }}>
      <DashboardHeader title="Order History" />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6">
        {/* Period segmented control */}
        <div className="inline-flex items-center p-1 rounded-full mb-5" style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)" }}>
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className="px-4 py-1.5 rounded-full ss-small font-semibold transition-all"
              style={{
                background: period === p.value ? "var(--ss-primary)" : "transparent",
                color: period === p.value ? "var(--ss-on-accent)" : "var(--ss-secondary)",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="rounded-[var(--ss-radius-card)] p-4 flex items-center gap-3" style={{ border: "1px solid var(--ss-border)", background: "var(--ss-surface)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--ss-accent-tint)", color: "var(--ss-accent-dark)" }}>
                <Calendar size={18} />
              </div>
              <div>
                <p className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--ss-primary)" }}>{summary.totalOrders}</p>
                <p className="ss-caption">Total Orders</p>
              </div>
            </div>
            <div className="rounded-[var(--ss-radius-card)] p-4 flex items-center gap-3" style={{ border: "1px solid var(--ss-border)", background: "var(--ss-surface)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(27,138,90,0.12)", color: "var(--ss-success)" }}>
                <IndianRupee size={18} />
              </div>
              <div>
                <p className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--ss-primary)" }}>₹{summary.totalAmount?.toLocaleString()}</p>
                <p className="ss-caption">Total Revenue</p>
              </div>
            </div>
          </div>
        )}

        {/* Orders List */}
        {loading ? (
          <div className="space-y-3">{[1, 2, 3, 4].map((i) => <OrderCardSkeleton key={i} />)}</div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={28} style={{ color: "var(--ss-secondary)" }} />}
            title="No orders"
            description="No orders were placed during this period. Try a different date range."
          />
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="rounded-[var(--ss-radius-card)] p-4" style={{ border: "1px solid var(--ss-border)", background: "var(--ss-surface)" }}>
                <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold ss-small" style={{ fontFamily: "var(--font-heading)", color: "var(--ss-primary)" }}>
                      #{order.orderNumber}
                    </span>
                    <span className="ss-caption font-semibold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: "var(--ss-bg)", color: "var(--ss-secondary)" }}>
                      <User size={11} /> Table {order.session?.table?.code}
                    </span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <span className="ss-caption font-semibold whitespace-nowrap" title={new Date(order.createdAt).toLocaleString("en-IN")}>
                    {formatElapsed(order.createdAt)}
                  </span>
                </div>
                <div className="space-y-1">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between ss-small">
                      <span style={{ color: "var(--ss-secondary)" }}>
                        {item.menuItem?.name} ×{item.quantity}
                      </span>
                      <span className="font-semibold" style={{ color: "var(--ss-primary)" }}>
                        ₹{item.price * item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
