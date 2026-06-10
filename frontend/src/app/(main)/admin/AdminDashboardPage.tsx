"use client";

import AdminHeader from "@/features/admin/components/AdminHeader";
import AdminStats from "@/features/admin/components/AdminStats";
import AdminCharts from "@/features/admin/components/AdminCharts";
import AdminRecentBookings from "@/features/admin/components/AdminRecentBookings";
import { useAdminDashboard } from "@/features/admin/hooks/useAdminDashboard";
import { useState } from "react";

export default function AdminDashboardPage() {

  const getLocalDate = () => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localDate = new Date(today.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split("T")[0];
  };
  const [selectedDate, setSelectedDate] = useState(getLocalDate());

  const { statsData, loading, error, buildings, trendData, selectedWeek, setSelectedWeek, topOffices, recentBookings } = useAdminDashboard(selectedDate);
  return (
    <main className="flex-1 bg-gray-50 p-6 space-y-6 overflow-y-auto">
      <AdminHeader
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate} />
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
      {!loading && !error && <AdminStats data={statsData} selectedDate={selectedDate} />}
      <AdminCharts data={statsData} buildings={buildings} trendData={trendData} selectedWeek={selectedWeek}
        setSelectedWeek={setSelectedWeek} topOffices={topOffices} />

      <AdminRecentBookings bookings={recentBookings} />
    </main>
  );
}
