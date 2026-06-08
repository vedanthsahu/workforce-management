

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Toaster } from "sonner";
import AmenitiesCards      from "@/features/amenities/components/AmenitiesCards";
import AmenitiesFilters    from "@/features/amenities/components/AmenitiesFilters";
import AmenitiesTable      from "@/features/amenities/components/AmenitiesTable";
import EditAmenityModal    from "@/features/amenities/components/EditAmenityModal";
import AmenitiesPagination from "@/features/amenities/components/AmenitiesPagination";
import { useAmenities }    from "@/features/amenities/hooks/useAmenities";

export default function AmenitiesPage() {
  const router = useRouter();

  const { data, loading, search, setSearch, status, setStatus, fetchAmenities } =
    useAmenities();

  const [selectedAmenity, setSelectedAmenity] = useState<any>(null);
  const [openModal,       setOpenModal]        = useState(false);
  const [currentPage,     setCurrentPage]      = useState(1);

  useEffect(() => {
    router.prefetch("/admin/amenities/add");
  }, [router]);

  const handleEdit = (amenity: any) => {
    setSelectedAmenity(amenity);
    setOpenModal(true);
  };

  const filteredAmenities = (data?.items || []).filter((a: any) => {
    const name  = (a.amenity_name || "").toLowerCase();
    const query = search.toLowerCase();
    let i = 0;
    for (const char of name) {
      if (char === query[i]) i++;
      if (i === query.length) return true;
    }
    return query.length === 0;
  });

  const itemsPerPage       = 10;
  const totalPages         = Math.ceil(filteredAmenities.length / itemsPerPage);
  const startIndex         = (currentPage - 1) * itemsPerPage;
  const paginatedAmenities = filteredAmenities.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 bg-[#f8fafc] min-h-screen">

     {/* <Toaster richColors position="top-right" /> */}

      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Manage Amenities</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Create, edit and manage all amenities available in your workspace.
          </p>
        </div>
        <div className="self-start sm:self-auto shrink-0">
          <button
            onClick={() => router.push("/admin/amenities/add")}
            onMouseEnter={() => router.prefetch("/admin/amenities/add")}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm"
          >
            <Plus size={15} />
            Add Amenity
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <AmenitiesCards
        stats={
          data
            ? {
                total_amenities:    data.total_amenities,
                active_amenities:   data.active_amenities,
                inactive_amenities: data.inactive_amenities,
                assigned_amenities: data.assigned_amenities,
              }
            : null
        }
      />

      {/* TABLE CARD */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">

        {/* TABLE HEADER */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 border-b shrink-0">
          <h2 className="text-sm sm:text-base font-semibold text-gray-800">Amenities List</h2>
          <div className="w-full sm:w-auto">
            <AmenitiesFilters
              search={search}
              setSearch={(value) => {
                setSearch(value);
                setCurrentPage(1);
              }}
              status={status}
              setStatus={setStatus}
            />
          </div>
        </div>

        {/* TABLE BODY */}
        <div
          className="w-full overflow-x-auto overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 420px)", minHeight: "200px" }}
        >
          {loading ? (
            <div className="p-6 text-sm text-gray-500">Loading...</div>
          ) : (
            <AmenitiesTable
              data={paginatedAmenities}
              onEdit={handleEdit}
            />
          )}
        </div>

        {/* EDIT MODAL */}
        {selectedAmenity && (
          <EditAmenityModal
            amenity={selectedAmenity}
            open={openModal}
            onClose={() => setOpenModal(false)}
            onSuccess={() => fetchAmenities()}
          />
        )}

        {/* FOOTER */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 border-t shrink-0 text-xs sm:text-sm text-gray-500">
          <span>
            Showing {filteredAmenities.length === 0 ? 0 : startIndex + 1} to{" "}
            {Math.min(startIndex + itemsPerPage, filteredAmenities.length)} of{" "}
            {filteredAmenities.length} entries
          </span>
          <div className="self-center sm:self-auto">
            <AmenitiesPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>

      </div>

    </div>
  );
}