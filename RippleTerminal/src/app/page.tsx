"use client";

import dynamic from "next/dynamic";

const DashboardGrid = dynamic(() => import("@/components/DashboardGrid"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-[#4A4E5F] text-sm">
      Loading dashboard…
    </div>
  ),
});

export default function DashboardPage() {
  return <DashboardGrid />;
}
