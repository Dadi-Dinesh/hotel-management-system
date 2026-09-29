"use client";

import { RestaurantProvider } from "../components/RestaurantContext";
import Sidebar from "../components/admin/Sidebar";

export default function AdminLayout({ children }) {
  return (
    <RestaurantProvider>
      <div className="flex min-h-screen" style={{ background: "var(--ss-bg)" }}>
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col">{children}</div>
      </div>
    </RestaurantProvider>
  );
}
