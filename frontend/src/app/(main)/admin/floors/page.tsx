"use client";

import { Suspense, useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import FloorCards, { FloorStatusFilter } from "@/features/floor/components/FloorCards";
import FloorFilters from "@/features/floor/components/FloorFilters";
import FloorPagination from "@/features/floor/components/FloorPagination";
import FloorTable from "@/features/floor/components/FloorTable";
import EditFloorModal from "@/features/floor/components/EditFloorModal";

import { useFloors } from "@/features/floor/hooks/useFloors";
import { Floor } from "@/features/floor/types/floor.types";
import { TableSkeleton, TableBodySkeleton, StatCardsSkeleton } from "@/components/ui/table-skeleton";
import { bestSearchMatchRank, searchMatchRank } from "@/lib/searchRank";

function FloorsPage() {
  const {
    floors,
    loading,
    error,
    stats,
    sites,
    buildings,
    selectedSite,
    selectedBuilding,
    handleSiteChange,
    handleBuildingChange,
    refreshFloors,
  } = useFloors();

  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null);
  const [open, setOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [pinnedFloorId, setPinnedFloorId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FloorStatusFilter>(null);

  useEffect(() => {
    const addedFloorId = searchParams.get("added");
    if (!addedFloorId) return;

    setPinnedFloorId(addedFloorId);
    setHighlightedId(addedFloorId);
    setSuccessMessage("Floor added successfully");
    setCurrentPage(1);

    setTimeout(() => {
      setPinnedFloorId(null);
      setHighlightedId(null);
      setSuccessMessage("");
    }, 6000);

    router.replace("/admin/floors");
  }, [searchParams, router]);

  const handleEdit = (floor: Floor) => {
    setSelectedFloor(floor);
    setOpen(true);
  };

  const filteredFloors = useMemo(() => {
    const ranked = floors
      .map((floor) => ({
        floor,
        rank: bestSearchMatchRank(
          searchMatchRank(floor.floor_name || "", search),
          searchMatchRank(floor.floor_code || "", search),
        ),
      }))
      .filter((x): x is { floor: Floor; rank: number } => x.rank !== null)
      .filter((x) => !statusFilter || x.floor.status === statusFilter)
      .sort((a, b) => a.rank - b.rank)
      .map((x) => x.floor);

    if (!pinnedFloorId) return ranked;

    return [
      ...ranked.filter((f) => String(f.floor_id) === pinnedFloorId),
      ...ranked.filter((f) => String(f.floor_id) !== pinnedFloorId),
    ];
  }, [floors, search, statusFilter, pinnedFloorId]);

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredFloors.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedFloors = filteredFloors.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="p-6 space-y-6 bg-[#f8fafc] h-screen overflow-y-auto">

      {/* SUCCESS BANNER */}
      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Manage Floors</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            View, add, edit and manage all floors.
          </p>
        </div>
        <Link
          href="/admin/floors/add"
          className="inline-flex items-center gap-2 h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-sm self-start sm:self-auto"
        >
          <Plus size={16} />
          Add Floor
        </Link>
      </div>

      {/* CARDS */}
      {loading ? (
        <StatCardsSkeleton />
      ) : (
        <FloorCards
          stats={stats}
          statusFilter={statusFilter}
          onStatusFilterChange={(filter) => {
            setStatusFilter(filter);
            setCurrentPage(1);
          }}
        />
      )}

      {/* TABLE CARD */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">

        {/* TABLE HEADER */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center px-6 py-4 border-b">
          <h2 className="text-sm sm:text-base font-semibold text-gray-800">Floors List</h2>
          <FloorFilters
            sites={sites}
            buildings={buildings}
            selectedSite={selectedSite}
            selectedBuilding={selectedBuilding}
            onSiteChange={handleSiteChange}
            onBuildingChange={handleBuildingChange}
            search={search}
            setSearch={setSearch}
          />
        </div>

        {/* TABLE BODY */}
        <div className="w-full overflow-x-auto">
          {loading ? (
            <TableBodySkeleton columns={5} rows={4} />
          ) : error ? (
            <div className="p-6 text-sm text-red-500">{error}</div>
          ) : (
            <FloorTable
              data={paginatedFloors}
              onEdit={handleEdit}
              highlightedId={highlightedId}
            />
          )}
        </div>

        {/* EDIT MODAL */}
        {selectedFloor && (
          <EditFloorModal
            floor={selectedFloor}
            open={open}
            onClose={() => setOpen(false)}
            onSuccess={() => {
              refreshFloors();
              setPinnedFloorId(String(selectedFloor.floor_id));
              setHighlightedId(String(selectedFloor.floor_id));
              setSuccessMessage("Floor updated successfully");
              setTimeout(() => {
                setPinnedFloorId(null);
                setHighlightedId(null);
                setSuccessMessage("");
              }, 4000);
            }}
          />
        )}

        {/* FOOTER */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-t shrink-0 text-xs sm:text-sm text-gray-500">
          <span>
            {filteredFloors.length > 0 &&
              `Showing ${startIndex + 1} to ${Math.min(
                startIndex + itemsPerPage,
                filteredFloors.length
              )} of ${filteredFloors.length} entries`}
          </span>
          <FloorPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>

      </div>

    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6"><TableSkeleton columns={5} rows={4} /></div>}>
      <FloorsPage />
    </Suspense>
  );
}
