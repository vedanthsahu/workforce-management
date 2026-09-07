"use client";

import AdminHeader from "@/features/admin/components/AdminHeader";
import AdminStats from "@/features/admin/components/AdminStats";
import AdminCharts from "@/features/admin/components/AdminCharts";
import AdminRecentBookings from "@/features/admin/components/AdminRecentBookings";
import { useAdminDashboard } from "@/features/admin/hooks/useAdminDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

export default function AdminDashboardPage() {

  const getLocalDate = () => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localDate = new Date(today.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split("T")[0];
  };
  const [selectedDate, setSelectedDate] = useState(getLocalDate());

  const { statsData, loading, error, trendData, selectedPeriod, setSelectedPeriod, topOffices, recentBookings } = useAdminDashboard(selectedDate);
  return (
    <main className="flex-1 bg-gray-50 p-6 space-y-6 overflow-y-auto">
      <AdminHeader
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate} />
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      )}
      {error && (
        <div className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}
      {!loading && !error && <AdminStats data={statsData} selectedDate={selectedDate} />}
      <AdminCharts data={statsData} trendData={trendData} selectedPeriod={selectedPeriod}
        setSelectedPeriod={setSelectedPeriod} topOffices={topOffices} />

      <AdminRecentBookings bookings={recentBookings} loading={loading} />
    </main>
  );
}
