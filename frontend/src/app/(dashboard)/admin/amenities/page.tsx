
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Toaster } from "sonner";
import AmenitiesCards from "@/features/amenities/components/AmenitiesCards";
import AmenitiesFilters from "@/features/amenities/components/AmenitiesFilters";
import AmenitiesTable from "@/features/amenities/components/AmenitiesTable";
import EditAmenityModal from "@/features/amenities/components/EditAmenityModal";
import AmenitiesPagination from "@/features/amenities/components/AmenitiesPagination";

import { useAmenities } from "@/features/amenities/hooks/useAmenities";

export default function AmenitiesPage() {
  const router = useRouter();

  const {
    data,
    loading,
    search,
    setSearch,
    status,
    setStatus,
    fetchAmenities,
  } = useAmenities();

  const [selectedAmenity, setSelectedAmenity] =
    useState<any>(null);

  const [openModal, setOpenModal] =
    useState(false);

  const [currentPage, setCurrentPage] =
    useState(1);

  const handleEdit = (amenity: any) => {
    setSelectedAmenity(amenity);
    setOpenModal(true);
  };

  const filteredAmenities =
    (data?.items || []).filter(
      (a: any) => {
        const name = (
          a.amenity_name || ""
        ).toLowerCase();

        const query =
          search.toLowerCase();

        let i = 0;

        for (const char of name) {
          if (char === query[i]) i++;

          if (i === query.length)
            return true;
        }

        return query.length === 0;
      }
    );

  const itemsPerPage = 10;

  const totalPages = Math.ceil(
    filteredAmenities.length /
      itemsPerPage
  );

  const startIndex =
    (currentPage - 1) *
    itemsPerPage;

  const paginatedAmenities =
    filteredAmenities.slice(
      startIndex,
      startIndex + itemsPerPage
    );

  return (
    <div className="p-6 space-y-6 bg-[#f8fafc] min-h-screen">

      {/* BREADCRUMB */}
      <div className="text-sm text-gray-500">
        Admin / Amenities /{" "}
        <span className="text-gray-800">
          Manage Amenities
        </span>
      </div>

      {/* HEADER */}
      <div className="flex justify-between items-center">

        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Manage Amenities
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Create, edit and manage all amenities
            available in your workspace.
          </p>
        </div>

        <button
          onClick={() =>
            router.push(
              "/admin/amenities/add"
            )
          }
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl shadow-sm"
        >
          <Plus size={16} />
          Add Amenity
        </button>

      </div>

      {/* CARDS */}
      <AmenitiesCards
        stats={
          data
            ? {
                total_amenities:
                  data.total_amenities,
                active_amenities:
                  data.active_amenities,
                inactive_amenities:
                  data.inactive_amenities,
                assigned_amenities:
                  data.assigned_amenities,
              }
            : null
        }
      />

      {/* TABLE CARD */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">

        {/* TABLE HEADER */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center px-6 py-4 border-b">

          <h2 className="text-base font-semibold text-gray-800">
            Amenities List
          </h2>

          <AmenitiesFilters
            search={search}
            setSearch={setSearch}
            status={status}
            setStatus={setStatus}
          />

        </div>
<Toaster richColors position="top-right" />
        {/* TABLE BODY */}
        {loading ? (
          <div className="p-6 text-sm text-gray-500">
            Loading...
          </div>
        ) : (
  <div
  className="w-full overflow-x-auto overflow-y-auto"
  style={{
    maxHeight: "calc(100vh - 420px)",
    minHeight: "200px",
  }}
>
  <AmenitiesTable
    data={paginatedAmenities}
    onEdit={handleEdit}
  />
</div>
        )}

        {/* FOOTER */}
        <div className="flex justify-between items-center px-6 py-4 border-t text-sm text-gray-500">

          <span>
            Showing {filteredAmenities.length === 0 ? 0 : startIndex + 1} to{" "}
            {Math.min(
              startIndex +
                itemsPerPage,
              filteredAmenities.length
            )}{" "}
            of{" "}
            {filteredAmenities.length}{" "}
            entries
          </span>

          <AmenitiesPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />

        </div>

      </div>

      {/* EDIT MODAL */}
      {selectedAmenity && (
        <EditAmenityModal
          amenity={selectedAmenity}
          open={openModal}
          onClose={() =>
            setOpenModal(false)
          }
          onSuccess={() => {
            fetchAmenities();
          }}
        />
      )}

    </div>
  );
}