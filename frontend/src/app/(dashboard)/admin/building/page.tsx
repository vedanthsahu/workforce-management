
"use client";

import { useBuildings } from "@/features/building/hooks/useBuildings";
import BuildingHeader from "@/features/building/components/buildingHeader";
import BuildingStatsCards from "@/features/building/components/buildingStatsCards";
import BuildingTable from "@/features/building/components/buildingTable";
import Pagination from "@/features/building/components/Pagination";
import AdminTopbar from "@/features/admin/components/AdminTopbar";

export default function BuildingsPage() {
  const { data, loading } = useBuildings();

  return (
    <>
          <AdminTopbar />
          <main className="flex-1 bg-[#f8fafc] p-6 space-y-6 overflow-y-auto">
    <div className="p-6 bg-gray-100 min-h-screen">
      <BuildingHeader />
      <BuildingStatsCards />

      {loading ? (
        <p>Loading...</p>
      ) : (
        <BuildingTable data={data} />
      )}
</div>
      </main>
  </>
  );
}