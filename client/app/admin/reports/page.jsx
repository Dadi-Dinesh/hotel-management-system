"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, ClipboardList, MessageSquare, UtensilsCrossed, Sliders, Users } from "lucide-react";
import api from "../../lib/api";
import { getUser, isAuthenticated } from "../../lib/auth";
import Navbar from "../../components/Navbar";
import ExportButton from "../../components/admin/ExportButton";
import AIReportSummary from "../../components/admin/copilot/AIReportSummary";
import toast from "react-hot-toast";

function ReportSection({ icon: Icon, title, description, columns, rows, filename, loading }) {
  return (
    <div className="rounded-2xl p-5 border flex flex-col gap-3" style={{ borderColor: "var(--color-border-light)", background: "var(--color-surface)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--color-cream-100)", color: "var(--color-orange-500)" }}>
            <Icon size={18} />
          </span>
          <div>
            <h3 className="font-black text-sm uppercase tracking-wide" style={{ color: "var(--color-brown-900)" }}>{title}</h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{description}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "var(--color-border-light)" }}>
        <span className="text-xs font-bold" style={{ color: "var(--color-text-secondary)" }}>
          {loading ? "Loading…" : `${rows.length} row${rows.length === 1 ? "" : "s"} ready`}
        </span>
        <ExportButton filename={filename} title={title} subtitle={`Generated ${new Date().toLocaleString("en-IN")}`} columns={columns} rows={rows} disabled={loading} />
      </div>
    </div>
  );
}

export default function AdminReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState([]);
  const [orders, setOrders] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [menuPerf, setMenuPerf] = useState([]);
  const [tables, setTables] = useState([]);
  const [waiters, setWaiters] = useState([]);

  useEffect(() => {
    if (!isAuthenticated() || getUser()?.role !== "ADMIN") {
      router.push("/admin/login");
      return;
    }
    fetchAll();
  }, [router]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [revenueRes, ordersRes, feedbackRes, menuRes, tablesRes, waitersRes] = await Promise.all([
        api.get("/admin/analytics/revenue-trend?period=month"),
        api.get("/admin/orders?period=month"),
        api.get("/feedbacks"),
        api.get("/admin/analytics/menu-performance"),
        api.get("/admin/analytics/tables"),
        api.get("/admin/analytics/waiters"),
      ]);
      setRevenue(revenueRes.data.data?.series || []);
      setOrders(ordersRes.data.data?.orders || []);
      setFeedback(feedbackRes.data.data || []);
      setMenuPerf(menuRes.data.data || []);
      setTables(tablesRes.data.data || []);
      setWaiters(waitersRes.data.data || []);
    } catch (error) {
      toast.error("Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--color-cream-50)" }}>
      <Navbar title="Reports" subtitle="Export Center" backHref="/admin/dashboard" />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <AIReportSummary />

        <p className="text-xs font-semibold mb-2 mt-2" style={{ color: "var(--color-text-muted)" }}>
          Export any dataset below as CSV, PDF, or a print-ready page.
        </p>

        <ReportSection
          icon={TrendingUp}
          title="Revenue (Last 30 Days)"
          description="Daily revenue, order count, and average order value."
          filename="revenue-report"
          loading={loading}
          rows={revenue}
          columns={[
            { key: "label", label: "Date" },
            { key: "revenue", label: "Revenue (INR)" },
            { key: "orders", label: "Orders" },
            { key: "averageOrderValue", label: "Avg Order Value (INR)" },
          ]}
        />

        <ReportSection
          icon={ClipboardList}
          title="Orders (Last 30 Days)"
          description="Full order list with table, status, and item count."
          filename="orders-report"
          loading={loading}
          rows={orders}
          columns={[
            { key: "orderNumber", label: "Order #" },
            { key: "table", label: "Table", value: (r) => r.session?.table?.code || "" },
            { key: "status", label: "Status" },
            { key: "items", label: "Items", value: (r) => r.items?.reduce((s, i) => s + i.quantity, 0) || 0 },
            { key: "total", label: "Total (INR)", value: (r) => r.items?.reduce((s, i) => s + i.price * i.quantity, 0) || 0 },
            { key: "createdAt", label: "Placed At", value: (r) => new Date(r.createdAt).toLocaleString("en-IN") },
          ]}
        />

        <ReportSection
          icon={MessageSquare}
          title="Customer Feedback"
          description="All ratings with item, table, and timestamp."
          filename="feedback-report"
          loading={loading}
          rows={feedback}
          columns={[
            { key: "menuItem", label: "Item", value: (r) => r.menuItem?.name || "" },
            { key: "table", label: "Table", value: (r) => r.session?.table?.code || "" },
            { key: "rating", label: "Rating" },
            { key: "createdAt", label: "Date", value: (r) => new Date(r.createdAt).toLocaleString("en-IN") },
          ]}
        />

        <ReportSection
          icon={UtensilsCrossed}
          title="Menu Performance"
          description="Orders, revenue, and average quantity per item."
          filename="menu-performance-report"
          loading={loading}
          rows={menuPerf}
          columns={[
            { key: "name", label: "Item" },
            { key: "category", label: "Category" },
            { key: "orders", label: "Orders" },
            { key: "quantitySold", label: "Quantity Sold" },
            { key: "revenue", label: "Revenue (INR)" },
            { key: "averageQuantityPerOrder", label: "Avg Qty/Order" },
          ]}
        />

        <ReportSection
          icon={Sliders}
          title="Table Analytics"
          description="Sessions, revenue, average stay, and occupancy per table."
          filename="table-analytics-report"
          loading={loading}
          rows={tables}
          columns={[
            { key: "code", label: "Table" },
            { key: "totalSessions", label: "Sessions" },
            { key: "revenue", label: "Revenue (INR)" },
            { key: "averageStayMinutes", label: "Avg Stay (min)" },
            { key: "ordersCount", label: "Orders" },
            { key: "occupancyRatePercent", label: "Occupancy (%)" },
          ]}
        />

        <ReportSection
          icon={Users}
          title="Waiter Statistics"
          description="Tables handled, orders accepted, and bills generated per staff member."
          filename="waiter-statistics-report"
          loading={loading}
          rows={waiters}
          columns={[
            { key: "name", label: "Staff" },
            { key: "role", label: "Role" },
            { key: "tablesHandled", label: "Tables Handled" },
            { key: "ordersAccepted", label: "Orders Accepted" },
            { key: "billsGenerated", label: "Bills Generated" },
            { key: "averageServiceTimeMinutes", label: "Avg Service Time (min)" },
          ]}
        />
      </main>
    </div>
  );
}
