"use client";

import PlatformGuard from "../components/PlatformGuard";
import PlatformShell from "../components/platform/PlatformShell";

export default function PlatformLayout({ children }) {
  return (
    <PlatformGuard>
      <PlatformShell>{children}</PlatformShell>
    </PlatformGuard>
  );
}
