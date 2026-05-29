"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/features/dashboard/components/AppSidebar";
import { useAuthContext } from "@/features/auth/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || user === undefined) return;
    if (!user) { router.replace("/login"); return; }

    const isAdmin = user.role === "TENANT_ADMIN";

    // If admin lands on /dashboard, immediately correct to /admin
    if (isAdmin && window.location.pathname.startsWith("/dashboard")) {
      router.replace("/admin");
    }
  }, [isLoading, user, router]);

  // ── Block rendering entirely until /me resolves ──────────────────────────
  // This is the key fix — no flash of wrong content/sidebar
  if (isLoading || user === undefined) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
          <span className="text-[12px] text-gray-400">Loading…</span>
        </div>
      </div>
    );
  }

  // ── User is null = not authenticated, AuthContext redirect handles it ────
  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar user={user} />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
}