"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Filter, IndianRupee } from "lucide-react";
import api from "../../lib/api";
import { isAuthenticated, getUser } from "../../lib/auth";
import Navbar from "../../components/Navbar";
import OrderStatusBadge from "../../components/OrderStatusBadge";
import toast from "react-hot-toast";

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
    <div className="min-h-screen" style={{ background: "var(--color-cream-50)" }}>
      <Navbar title="Order History" subtitle="Admin" backHref="/admin/dashboard" />

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Period Filter */}
        <div className="flex gap-2 mb-4">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
              style={{
                fontFamily: "var(--font-heading)",
                background: period === p.value ? "var(--color-orange-500)" : "var(--color-cream-100)",
                color: period === p.value ? "white" : "var(--color-brown-800)",
                border: period === p.value ? "none" : "1px solid var(--color-cream-200)",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="card-warm flex items-center gap-3" style={{ padding: "1rem" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--color-orange-500)", color: "white" }}>
                <Calendar size={18} />
              </div>
              <div>
                <p className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>{summary.totalOrders}</p>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Total Orders</p>
              </div>
            </div>
            <div className="card-warm flex items-center gap-3" style={{ padding: "1rem" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--color-success)", color: "white" }}>
                <IndianRupee size={18} />
              </div>
              <div>
                <p className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>₹{summary.totalAmount?.toLocaleString()}</p>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Total Revenue</p>
              </div>
            </div>
          </div>
        )}

        {/* Orders List */}
        {loading ? (
          <div className="space-y-3">{[1,2,3,4].map((i) => <div key={i} className="skeleton h-20 w-full" />)}</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-medium" style={{ color: "var(--color-text-muted)" }}>No orders for this period.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="card">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
                      #{order.orderNumber}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--color-cream-100)", color: "var(--color-orange-600)" }}>
                      Table {order.session?.table?.code}
                    </span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {new Date(order.createdAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </span>
                </div>
                <div className="space-y-1">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span style={{ color: "var(--color-text-secondary)" }}>
                        {item.menuItem?.name} x{item.quantity}
                      </span>
                      <span className="font-medium" style={{ color: "var(--color-brown-900)" }}>
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
