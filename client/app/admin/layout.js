"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { RestaurantProvider } from "../components/RestaurantContext";
import Sidebar from "../components/admin/Sidebar";
import { isAuthenticated, isPlatformOwner, PLATFORM_HOME } from "../lib/auth";

/**
 * Restaurant Admin suite. A ServeSync Platform Admin never uses these
 * restaurant-operational pages — they're bounced to the platform portal so
 * they can't land on (e.g.) the demo restaurant's dashboard by accident.
 */
export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isLoginPage && isAuthenticated() && isPlatformOwner()) {
      router.replace(PLATFORM_HOME);
      return;
    }
    setChecked(true);
  }, [isLoginPage, pathname, router]);

  if (!checked) return null;

  return (
    <RestaurantProvider>
      <div className="flex min-h-screen" style={{ background: "var(--ss-bg)" }}>
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col">{children}</div>
      </div>
    </RestaurantProvider>
  );
}
