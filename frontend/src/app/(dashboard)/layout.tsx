
"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"; // ← add SidebarTrigger
import { AppSidebar } from "@/features/dashboard/components/AppSidebar";
import { useAuthContext } from "@/features/auth/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || user === undefined) return;
    if (!user) { router.replace("/login"); return; }
    const isAdmin = user.role === "TENANT_ADMIN";
    if (isAdmin && window.location.pathname.startsWith("/dashboard")) {
      router.replace("/admin");
    }
  }, [isLoading, user, router]);

  if (isLoading || user === undefined) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
          <span className="text-[12px] text-gray-400">Loading…</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full overflow-hidden">  {/* ← h-screen → h-dvh */}
        <AppSidebar user={user} />

        <div className="flex flex-col flex-1 min-w-0 overflow-y-auto">

          {/* ── Mobile-only top bar with hamburger ──────────── */}
          <div className="md:hidden flex items-center h-12 px-4 border-b bg-white shrink-0">
            <SidebarTrigger />
          </div>

          {/* ── Page content ────────────────────────────────── */}
          {children}

        </div>
      </div>
    </SidebarProvider>
  );
}