import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: { default: "SHADESH Admin", template: "%s · SHADESH Admin" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[#0a0a0f] text-white">{children}</div>;
}
