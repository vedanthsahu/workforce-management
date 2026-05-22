
"use client";

import AdminRecentBookings from "@/features/admin/components/AdminRecentBookings";
import AdminTopbar from "@/features/admin/components/AdminTopbar";
import AdminHeader from "@/features/admin/components/AdminHeader";
import AdminStats from "@/features/admin/components/AdminStats";
import AdminCharts from "@/features/admin/components/AdminCharts";
import { AppSidebar } from "@/features/dashboard/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAdminDashboard } from "@/features/admin/hooks/useAdminDashboard";
import { useState } from "react";

export default function AdminPage() {
 const [selectedDate, setSelectedDate] = useState(
  new Date().toISOString().split("T")[0]
);
  const { statsData, loading, error ,buildings} = useAdminDashboard(selectedDate);

  console.log("PAGE DATA:", statsData);

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">

        {/* Sidebar */}
        <AppSidebar user={null} />

        {/* RIGHT SIDE */}
        <div className="flex flex-col flex-1 w-full min-w-0">

          {/* Topbar */}
          <AdminTopbar />

          {/* Main Content */}
          <main className="flex-1 bg-gray-50 p-6 space-y-6 overflow-y-auto">

            {/* Header */}
            <AdminHeader
  selectedDate={selectedDate}
  setSelectedDate={setSelectedDate}
/>

            {/* HANDLE STATES */}
            {loading && <div>Loading dashboard...</div>}
            {error && <div className="text-red-500">{error}</div>}

            {/* Stats */}
            {/* {!loading && !error && <AdminStats data={statsData} />} */}
            <AdminStats data={statsData} />
            

            {/* Charts */}
            <AdminCharts data={statsData} buildings={buildings} />

            {/* Recent Bookings */}
            <AdminRecentBookings />

          </main>

        </div>

      </div>
    </SidebarProvider>
  );
}