"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, CheckCircle2, XCircle, X } from "lucide-react";
import BuildingCards from "@/features/building/components/BuildingCards";
import BuildingFilters from "@/features/building/components/BuildingFilters";
import BuildingTable from "@/features/building/components/buildingTable";
import BuildingPagination from "@/features/building/components/BuildingPagination";
import EditBuildingModal from "@/features/building/components/EditBuildingModal";
import { useBuildings } from "@/features/building/hooks/useBuildings";
import { Building } from "@/features/building/types/building.types";

type BannerState = { type: "success" | "error"; message: string } | null;

function BuildingsPage() {
  const {
    buildings, sites, stats, loading, error,
    search, setSearch, selectedSiteId, setSelectedSiteId, fetchBuildings, fetchStats,
  } = useBuildings();

  const searchParams = useSearchParams();
  const router = useRouter();

  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [banner, setBanner] = useState<BannerState>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  useEffect(() => { setCurrentPage(1); }, [search, selectedSiteId]);

  const showBannerWithHighlight = (message: string, buildingId?: string) => {
    setBanner({ type: "success", message });
    if (buildingId) {
      setHighlightedId(buildingId);
      setTimeout(() => setHighlightedId(null), 3000);
    }
    const t = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(t);
  };

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      const newBuildingId = searchParams.get("building_id") || undefined;
      showBannerWithHighlight("Building added successfully.", newBuildingId);
      router.replace("/admin/building");
    }
  }, [searchParams, router]);

  const handleEdit = (building: Building) => {
    setSelectedBuilding(building);
    setOpenModal(true);
  };

  const handleEditSuccess = async (updatedBuildingId?: string) => {
    await Promise.all([fetchBuildings(selectedSiteId), fetchStats()]);
    showBannerWithHighlight("Building updated successfully.", updatedBuildingId);
  };

  const filteredBuildings = buildings
    .filter((building) => {
      const name = (building.building_name || "").toLowerCase();
      const query = search.toLowerCase();
      let i = 0;
      for (const char of name) {
        if (char === query[i]) i++;
        if (i === query.length) return true;
      }
      return query.length === 0;
    })
    .sort((a, b) => {
      if (highlightedId) {
        if (a.building_id === highlightedId) return -1;
        if (b.building_id === highlightedId) return 1;
      }
      return 0;
    });

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredBuildings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBuildings = filteredBuildings.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-clip p-4 sm:p-6 space-y-4 sm:space-y-6 bg-[#f8fafc]">

      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Manage Buildings</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            View, add, edit and manage all buildings across the organization.
          </p>
        </div>
        <div className="self-start sm:self-auto shrink-0">
          <Link
            href="/admin/building/add"
            className="inline-flex items-center gap-2 h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-sm"
          >
            <Plus size={16} />
            Add Building
          </Link>
        </div>
      </div>

      {/* BANNER */}
      {banner && (
        <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
          banner.type === "success"
            ? "bg-green-50 border-green-200 text-green-700"
            : "bg-red-50 border-red-200 text-red-700"
        }`}>
          <div className="flex items-center gap-2">
            {banner.type === "success" ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            {banner.message}
          </div>
          <button onClick={() => setBanner(null)} className="p-1 rounded hover:opacity-70">
            <X size={14} />
          </button>
        </div>
      )}

      {/* STATS */}
      <BuildingCards stats={stats} />

      {/* TABLE CARD */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">

        {/* TABLE HEADER */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 border-b shrink-0">
          <h2 className="text-sm sm:text-base font-semibold text-gray-800">Buildings List</h2>
          <div className="w-full sm:w-auto">
            <BuildingFilters
              sites={sites}
              selectedSiteId={selectedSiteId}
              setSelectedSiteId={setSelectedSiteId}
              search={search}
              setSearch={(value) => {
                setSearch(value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        {/* TABLE BODY */}
        <div className="w-full overflow-x-auto">
          {loading ? (
            <div className="p-6 text-sm text-gray-500">Loading...</div>
          ) : error ? (
            <div className="p-6 text-sm text-red-500">{error}</div>
          ) : (
            <BuildingTable
              data={paginatedBuildings}
              onEdit={handleEdit}
              highlightedId={highlightedId}
            />
          )}
        </div>

        {/* FOOTER */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 border-t shrink-0 text-xs sm:text-sm text-gray-500">
          <span>
            Showing {filteredBuildings.length === 0 ? 0 : startIndex + 1} to{" "}
            {Math.min(startIndex + itemsPerPage, filteredBuildings.length)} of{" "}
            {filteredBuildings.length} entries
          </span>
          <div className="self-center sm:self-auto">
            <BuildingPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      {selectedBuilding && (
        <EditBuildingModal
          building={selectedBuilding}
          open={openModal}
          onClose={() => setOpenModal(false)}
          onSuccess={(id) => handleEditSuccess(id)}
        />
      )}

    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading...</div>}>
      <BuildingsPage />
    </Suspense>
  );
}