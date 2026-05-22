
// "use client";

// import AdminRecentBookings from "@/features/admin/components/AdminRecentBookings";
// import AdminTopbar from "@/features/admin/components/AdminTopbar";
// import AdminHeader from "@/features/admin/components/AdminHeader";
// import AdminStats from "@/features/admin/components/AdminStats";
// import AdminCharts from "@/features/admin/components/AdminCharts";
// import { AppSidebar } from "@/features/dashboard/components/AppSidebar";
// import { SidebarProvider } from "@/components/ui/sidebar";

// import { useAdminDashboard } from "@/features/admin/hooks/useAdminDashboard";

// export default function AdminPage() {

//   const { statsData, loading, error } = useAdminDashboard();

//   return (
//     <SidebarProvider>
//       <div className="flex h-screen w-full">

//         {/* Sidebar */}
//         <AppSidebar user={null} />

//         {/* RIGHT SIDE */}
//         <div className="flex flex-col flex-1 w-full min-w-0">

//           {/* Topbar */}
//           <AdminTopbar />

//           {/* Main Content */}
//           <main className="flex-1 bg-gray-50 p-6 space-y-6 overflow-y-auto">

//             {/* Header */}
//             <AdminHeader />

//             {/* HANDLE STATES */}
//             {loading && <div>Loading dashboard...</div>}
//             {error && <div className="text-red-500">{error}</div>}

//             {/* Stats */}
//             {!loading && !error && <AdminStats data={statsData} />}

//             {/* Charts */}
//             <AdminCharts data={statsData} />

//             {/* Recent Bookings */}
//             <AdminRecentBookings />

//           </main>

//         </div>

//       </div>
//     </SidebarProvider>
//   );
// }

// app/(dashboard)/admin/page.tsx
"use client";

import AdminTopbar from "@/features/admin/components/AdminTopbar";
import AdminHeader from "@/features/admin/components/AdminHeader";
import AdminStats from "@/features/admin/components/AdminStats";
import AdminCharts from "@/features/admin/components/AdminCharts";
import AdminRecentBookings from "@/features/admin/components/AdminRecentBookings";
import { useAdminDashboard } from "@/features/admin/hooks/useAdminDashboard";

export default function AdminDashboardPage() {
  const { statsData, loading, error } = useAdminDashboard();

  return (
    <>
      <AdminTopbar />
      <main className="flex-1 bg-gray-50 p-6 space-y-6 overflow-y-auto">
        <AdminHeader />
        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
            Loading dashboard…
          </div>
        )}
        {error && (
          <div className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}
        {!loading && !error && <AdminStats data={statsData} />}
        <AdminCharts data={statsData} />
        <AdminRecentBookings />
      </main>
    </>
  );
}