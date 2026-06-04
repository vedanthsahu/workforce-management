"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useEffect } from "react";

import BuildingCards from "@/features/building/components/BuildingCards";
import BuildingFilters from "@/features/building/components/BuildingFilters";
import BuildingTable from "@/features/building/components/buildingTable"
import BuildingPagination from "@/features/building/components/BuildingPagination";
import EditBuildingModal from "@/features/building/components/EditBuildingModal";


import { useBuildings } from "@/features/building/hooks/useBuildings";

export default function BuildingsPage() {
  const router = useRouter();

  const {
    buildings,
    sites,
    stats,
    loading,
    error,
    search,
    setSearch,
    selectedSiteId,
    setSelectedSiteId,
    fetchBuildings,
  } = useBuildings();

  const [selectedBuilding, setSelectedBuilding] =
    useState<any>(null);

  const [openModal, setOpenModal] =
    useState(false);

  const [currentPage, setCurrentPage] =
    useState(1);


useEffect(() => {
  setCurrentPage(1);
}, [
  search,
  selectedSiteId,
]);

  const handleEdit = (building: any) => {
    setSelectedBuilding(building);
    setOpenModal(true);
  };

  const filteredBuildings = buildings.filter(
    (building: any) => {
      const name = (
        building.building_name || ""
      ).toLowerCase();

      const query =
        search.toLowerCase();

      let i = 0;

      for (const char of name) {
        if (char === query[i]) i++;

        if (i === query.length) {
          return true;
        }
      }

      return query.length === 0;
    }
  );

  const itemsPerPage = 10;

  const totalPages = Math.ceil(
    filteredBuildings.length /
      itemsPerPage
  );

  const startIndex =
    (currentPage - 1) *
    itemsPerPage;

  const paginatedBuildings =
    filteredBuildings.slice(
      startIndex,
      startIndex + itemsPerPage
    );

  return (
    <div className="p-6 space-y-6 bg-[#f8fafc] min-h-screen">

      {/* BREADCRUMB */}
      <div className="text-sm text-gray-500">
        Admin / Buildings /{" "}
        <span className="text-gray-800">
          Manage Buildings
        </span>
      </div>

      {/* HEADER */}
      <div className="flex justify-between items-center">

        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Manage Buildings
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            View, add, edit and manage all
            buildings across the organization.
          </p>
        </div>

        <button
          onClick={() =>
            router.push(
              "/admin/building/add"
            )
          }
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl shadow-sm"
        >
          <Plus size={16} />
          Add Building
        </button>

      </div>

      {/* STATS */}
      <BuildingCards stats={stats} />

      {/* TABLE CARD */}
     <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">

        {/* TABLE HEADER */}
        <div className="flex justify-between items-center px-6 py-4 border-b">

          <h2 className="text-base font-semibold text-gray-800">
            Buildings List
          </h2>

          <BuildingFilters
            sites={sites}
            selectedSiteId={
              selectedSiteId
            }
            setSelectedSiteId={
              setSelectedSiteId
            }
            search={search}
            setSearch={setSearch}
          />

        </div>

        {/* TABLE BODY */}
<div
  className="w-full overflow-x-auto overflow-y-auto"
  style={{
    maxHeight: "calc(100vh - 420px)",
    minHeight: "200px",
  }}
>
  {loading ? (
    <div className="p-6 text-sm text-gray-500">
      Loading...
    </div>
  ) : error ? (
    <div className="p-6 text-sm text-red-500">
      {error}
    </div>
  ) : (
    <BuildingTable
      data={paginatedBuildings}
      onEdit={handleEdit}
    />
  )}
</div>

        {/* FOOTER */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 border-t shrink-0 text-xs sm:text-sm text-gray-500">

          <span>
  Showing{" "}
  {filteredBuildings.length === 0
    ? 0
    : startIndex + 1}{" "}
  to{" "}
  {Math.min(
    startIndex + itemsPerPage,
    filteredBuildings.length
  )}{" "}
  of {filteredBuildings.length} entries
</span>

         <div className="self-center sm:self-auto">
  <BuildingPagination
    currentPage={currentPage}
    totalPages={totalPages}
    onPageChange={(page) => {
      setCurrentPage(page);
    }}
  />
</div>

        </div>

      </div>

      {/* EDIT MODAL */}
      {selectedBuilding && (
        <EditBuildingModal
          building={selectedBuilding}
          open={openModal}
          onClose={() =>
            setOpenModal(false)
          }
          onSuccess={() => {
            fetchBuildings(
              selectedSiteId
            );
          }}
        />
      )}

    </div>
  );
}