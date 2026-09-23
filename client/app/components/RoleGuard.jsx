"use client";

/**
 * Reusable auth+role guard for staff pages — consolidates the
 * "redirect if not logged in / wrong role" check into one place for new
 * pages to reuse, instead of re-writing the same useEffect everywhere.
 *
 * Note: existing pages already had this check inline and working; they were
 * intentionally left as-is (touching ~12 already-correct files for a pure
 * refactor isn't worth the regression risk). Use this for new pages going
 * forward — e.g. <RoleGuard allow={["ADMIN"]} loginPath="/admin/login">.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser } from "../lib/auth";

export default function RoleGuard({ allow, loginPath, children }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!isAuthenticated() || !allow.includes(getUser()?.role)) {
      router.push(loginPath);
      return;
    }
    setAuthorized(true);
  }, [router, allow, loginPath]);

  if (!authorized) return null;
  return children;
}
