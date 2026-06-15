"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthContext } from "@/features/auth/context/AuthContext";

function SidebarSkeleton() {
  return (
    <div className="hidden md:flex w-64 shrink-0 flex-col gap-6 border-r bg-sidebar p-3">
      <div className="flex items-center gap-2 px-1 py-1">
        <Skeleton className="h-6 w-6 rounded-md" />
        <Skeleton className="h-4 w-24" />
      </div>
      {Array.from({ length: 3 }).map((_, group) => (
        <div key={group} className="flex flex-col gap-2">
          <Skeleton className="h-3 w-16" />
          {Array.from({ length: 4 }).map((_, item) => (
            <Skeleton key={item} className="h-8 w-full rounded-lg" />
          ))}
        </div>
      ))}
      <div className="mt-auto flex items-center gap-2 border-t pt-3">
        <Skeleton className="h-7 w-7 rounded-full" />
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
  );
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuthContext();

  // Logged out (e.g. mid-logout) — about to redirect to /login, render nothing.
  if (!isLoading && user === null) return null;

  const showSidebarSkeleton = isLoading || user === undefined;

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        {showSidebarSkeleton ? <SidebarSkeleton /> : <AppSidebar user={user} />}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
}
