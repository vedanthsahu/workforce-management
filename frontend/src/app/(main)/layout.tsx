// "use client";

// import { SidebarProvider } from "@/components/ui/sidebar";
// import { AppSidebar } from "@/components/layout/AppSidebar";
// import { Skeleton } from "@/components/ui/skeleton";
// import { useAuthContext } from "@/features/auth/context/AuthContext";

// function SidebarSkeleton() {
//   return (
//     <div className="hidden md:flex w-64 shrink-0 flex-col gap-6 border-r bg-sidebar p-3">
//       <div className="flex items-center gap-2 px-1 py-1">
//         <Skeleton className="h-6 w-6 rounded-md" />
//         <Skeleton className="h-4 w-24" />
//       </div>
//       {Array.from({ length: 3 }).map((_, group) => (
//         <div key={group} className="flex flex-col gap-2">
//           <Skeleton className="h-3 w-16" />
//           {Array.from({ length: 4 }).map((_, item) => (
//             <Skeleton key={item} className="h-8 w-full rounded-lg" />
//           ))}
//         </div>
//       ))}
//       <div className="mt-auto flex items-center gap-2 border-t pt-3">
//         <Skeleton className="h-7 w-7 rounded-full" />
//         <Skeleton className="h-3 w-28" />
//       </div>
//     </div>
//   );
// }

// export default function MainLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   const { user, isLoading } = useAuthContext();

//   // Logged out (e.g. mid-logout) — about to redirect to /login, render nothing.
//   if (!isLoading && user === null) return null;

//   const showSidebarSkeleton = isLoading || user === undefined;

//   return (
//     <SidebarProvider>
//       <div className="flex h-screen w-full overflow-hidden">
//         {showSidebarSkeleton ? <SidebarSkeleton /> : <AppSidebar user={user} />}
//         <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
//           {children}
//         </div>
//       </div>
//     </SidebarProvider>
//   );
// }



"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthContext } from "@/features/auth/context/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { BookOpen, Menu } from "lucide-react";

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
  const isMobile = useIsMobile();

  if (!isLoading && user === null) return null;

  const showSidebarSkeleton = isLoading || user === undefined;

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        {showSidebarSkeleton ? <SidebarSkeleton /> : <AppSidebar user={user} />}

        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

          {/* Mobile top bar — rendered via JS hook, no CSS breakpoints */}
          {isMobile && (
            <header
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                height: "56px",
                padding: "0 16px",
                borderBottom: "1px solid #e5e7eb",
                background: "#ffffff",
                flexShrink: 0,
                zIndex: 50,
              }}
            >
              <SidebarTrigger
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  background: "#f9fafb",
                  cursor: "pointer",
                  color: "#111827",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "6px",
                    background: "#4f46e5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <BookOpen style={{ width: "12px", height: "12px", color: "#fff" }} />
                </div>
                <span style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "-0.01em" }}>
                  SeatBook
                </span>
              </div>
            </header>
          )}

          {children}
        </div>
      </div>
    </SidebarProvider>
  );
}
