"use client";

import PlatformGuard from "../components/PlatformGuard";

export default function PlatformLayout({ children }) {
  return <PlatformGuard>{children}</PlatformGuard>;
}
