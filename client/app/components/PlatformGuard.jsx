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
import toast from "react-hot-toast";
import { isAuthenticated, isPlatformOwner, getUser, getPostLoginRoute } from "../lib/auth";

export default function PlatformGuard({ children }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    if (!isPlatformOwner()) {
      // A real, authenticated Restaurant Admin — just not a Platform Owner.
      // Distinct from the unauthenticated case above, which needs no message.
      toast.error("That page is for ServeSync administrators only.");
      router.replace(getPostLoginRoute(getUser()));
      return;
    }
    setAuthorized(true);
  }, [router]);

  if (!authorized) return null;
  return children;
}
