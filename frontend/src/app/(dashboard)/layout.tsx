// // // // app/(dashboard)/layout.tsx
// // // "use client";

// // // import { useEffect } from "react";
// // // import { useRouter, usePathname } from "next/navigation";
// // // import { useAuthContext } from "@/features/auth/context/AuthContext";
// // // import { AppSidebar } from "@/features/dashboard/components/AppSidebar";
// // // import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

// // // export default function DashboardLayout({
// // //   children,
// // // }: {
// // //   children: React.ReactNode;
// // // }) {
// // //   const { user, isLoading } = useAuthContext();
// // //   const router   = useRouter();
// // //   const pathname = usePathname();

// // //   useEffect(() => {
// // //     if (isLoading) return;

// // //     // Not logged in → send to login
// // //     if (!user) {
// // //       router.replace("/login");
// // //       return;
// // //     }

// // //     const isAdmin    = user.role === "TENANT_ADMIN";
// // //     const onAdminRoute    = pathname.startsWith("/admin");
// // //     const onEmployeeRoute = pathname.startsWith("/dashboard") ||
// // //                             pathname.startsWith("/book")      ||
// // //                             pathname.startsWith("/mybookings")||
// // //                             pathname.startsWith("/team")      ||
// // //                             pathname.startsWith("/schedule")  ||
// // //                             pathname.startsWith("/find")      ||
// // //                             pathname.startsWith("/notifications") ||
// // //                             pathname.startsWith("/favourites");

// // //     if (isAdmin && !onAdminRoute) {
// // //       // Admin landed on an employee route → send to admin dashboard
// // //       router.replace("/admin/dashboard");
// // //       return;
// // //     }

// // //     if (!isAdmin && onAdminRoute) {
// // //       // Employee somehow hit an admin route → send to employee dashboard
// // //       router.replace("/dashboard");
// // //       return;
// // //     }
// // //   }, [user, isLoading, pathname, router]);

// // //   if (isLoading) {
// // //     return (
// // //       <div className="flex items-center justify-center min-h-screen">
// // //         <div className="w-5 h-5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
// // //       </div>
// // //     );
// // //   }

// // //   if (!user) return null;

// // //   return (
// // //     <SidebarProvider>
// // //       <div className="flex min-h-screen w-full">
// // //         <AppSidebar user={user} />
// // //         <main className="flex-1 flex flex-col min-w-0">
// // //           <div className="flex items-center px-4 py-3 border-b border-border">
// // //             <SidebarTrigger />
// // //           </div>
// // //           <div className="flex-1 p-6">
// // //             {children}
// // //           </div>
// // //         </main>
// // //       </div>
// // //     </SidebarProvider>
// // //   );
// // // }

// // // app/(dashboard)/layout.tsx
// // "use client";

// // import { useEffect } from "react";
// // import { useRouter, usePathname } from "next/navigation";
// // import { useAuthContext } from "@/features/auth/context/AuthContext";
// // import { AppSidebar } from "@/features/dashboard/components/AppSidebar";
// // import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

// // // Map pathnames to page titles shown in the top bar
// // const PAGE_TITLES: Record<string, string> = {
// //   "/dashboard":       "Dashboard",
// //   "/book":            "Book a seat",
// //   "/mybookings":      "My bookings",
// //   "/team":            "Book for someone",
// //   "/schedule":        "My schedule",
// //   "/find":            "Find teammates",
// //   "/notifications":   "Notifications",
// //   "/favourites":      "Preferences",
// //   "/admin": "Dashboard",
// //   "/admin/offices":   "Offices",
// //   "/admin/floors":    "Floors",
// //   "/admin/layouts":   "Floor Layouts",
// //   "/admin/seats":     "Seats",
// //   "/admin/amenities": "Amenities",
// //   "/admin/bookings":  "Bookings",
// //   "/admin/users":     "Users",
// //   "/admin/occupancy": "Occupancy",
// //   "/admin/utilization":"Utilization",
// //   "/admin/audit":     "Audit Logs",
// //   "/admin/settings":  "Settings",
// // };

// // function getPageTitle(pathname: string): string {
// //   // exact match first
// //   if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
// //   // prefix match for nested routes
// //   const match = Object.keys(PAGE_TITLES)
// //     .filter((k) => pathname.startsWith(k))
// //     .sort((a, b) => b.length - a.length)[0];
// //   return match ? PAGE_TITLES[match] : "SeatBook";
// // }

// // export default function DashboardLayout({ children }: { children: React.ReactNode }) {
// //   const { user, isLoading } = useAuthContext();
// //   const router   = useRouter();
// //   const pathname = usePathname();

// //   useEffect(() => {
// //     if (isLoading) return;
// //     if (!user) { router.replace("/login"); return; }

// //     const isAdmin    = user.role === "TENANT_ADMIN";
// //     const onAdmin    = pathname.startsWith("/admin");

// //     if (isAdmin && !onAdmin) { router.replace("/admin"); return; }
// //     if (!isAdmin && onAdmin) { router.replace("/dashboard");       return; }
// //   }, [user, isLoading, pathname, router]);

// //   if (isLoading) {
// //     return (
// //       <div className="flex items-center justify-center min-h-screen">
// //         <div className="w-5 h-5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
// //       </div>
// //     );
// //   }

// //   if (!user) return null;

// //   return (
// //     <SidebarProvider>
// //       <div className="flex min-h-screen bg-[#F4F5F8] w-full">
// //         <AppSidebar user={user} />

// //         <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
// //           {/* ── Single top bar — lives here and nowhere else ── */}
// //           <header className="flex items-center justify-between px-5 py-3 bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-10">
// //             <div className="flex items-center gap-3">
// //               <SidebarTrigger className="text-gray-400 hover:text-gray-600 -ml-1 transition-colors" />
// //               <h1 className="text-[14.5px] font-bold text-gray-900">
// //                 {getPageTitle(pathname)}
// //               </h1>
// //             </div>
// //           </header>

// //           {/* ── Page content ── */}
// //           <div className="flex-1 overflow-y-auto p-4 sm:p-6">
// //             {children}
// //           </div>
// //         </main>
// //       </div>
// //     </SidebarProvider>
// //   );
// // }

// // app/(dashboard)/layout.tsx
// // "use client";

// // import { SidebarProvider } from "@/components/ui/sidebar";
// // import { AppSidebar } from "@/features/dashboard/components/AppSidebar";
// // import { useAuthContext } from "@/features/auth/context/AuthContext";

// // export default function DashboardLayout({
// //   children,
// // }: {
// //   children: React.ReactNode;
// // }) {
// //   const { user } = useAuthContext();

// //   return (
// //     <SidebarProvider>
// //       <div className="flex h-screen w-full overflow-hidden">
// //         <AppSidebar user={user ?? null} />
// //         <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
// //           {children}
// //         </div>
// //       </div>
// //     </SidebarProvider>
// //   );
// // }

// "use client";

// import { SidebarProvider } from "@/components/ui/sidebar";
// import { AppSidebar } from "@/features/dashboard/components/AppSidebar";
// import { useAuthContext } from "@/features/auth/context/AuthContext";

// export default function DashboardLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   const { user, isLoading } = useAuthContext();

//   // Don't render sidebar until we know who the user is.
//   // Prevents the flash of employee nav for admins.
//   if (isLoading) {
//     return (
//       <div className="flex h-screen w-full items-center justify-center bg-gray-50">
//         <div className="w-5 h-5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
//       </div>
//     );
//   }

//   return (
//     <SidebarProvider>
//       <div className="flex h-screen w-full overflow-hidden">
//         <AppSidebar user={user} />
//         <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
//           {children}
//         </div>
//       </div>
//     </SidebarProvider>
//   );
// }

// (dashboard)/layout.tsx
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