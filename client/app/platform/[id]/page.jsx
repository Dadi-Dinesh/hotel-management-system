"use client";

// Legacy URL (/platform/<applicationId>) — application detail now lives at
// /platform/applications/<id>. Kept so older links/notifications still work.
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function LegacyApplicationRedirect() {
  const { id } = useParams();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/platform/applications/${id}`);
  }, [id, router]);
  return null;
}
