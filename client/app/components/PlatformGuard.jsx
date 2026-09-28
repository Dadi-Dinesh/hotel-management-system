"use client";

/**
 * Auth guard for /platform pages — distinct from RoleGuard because role
 * alone can't tell a Platform Owner apart from a normal restaurant ADMIN
 * (both carry role "ADMIN"; the real signal is restaurantId === null on
 * the account). See server/src/middleware/auth.js's requirePlatformOwner
 * for the matching server-side check this mirrors.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, isPlatformOwner } from "../lib/auth";

export default function PlatformGuard({ children }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!isAuthenticated() || !isPlatformOwner()) {
      router.push("/admin/login");
      return;
    }
    setAuthorized(true);
  }, [router]);

  if (!authorized) return null;
  return children;
}
