

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Toaster } from "sonner";
import AmenitiesCards      from "@/features/amenities/components/AmenitiesCards";
import AmenitiesFilters    from "@/features/amenities/components/AmenitiesFilters";
import AmenitiesTable      from "@/features/amenities/components/AmenitiesTable";
import EditAmenityModal    from "@/features/amenities/components/EditAmenityModal";
import AmenitiesPagination from "@/features/amenities/components/AmenitiesPagination";
import { useAmenities } from "@/features/amenities/hooks/useAmenities";

const PIN_DURATION = 4000; // ms the row stays pinned at top + highlighted

export default function AmenitiesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data, loading, search, setSearch, status, setStatus, fetchAmenities } =
    useAmenities();

  const [selectedAmenity, setSelectedAmenity] = useState<any>(null);
  const [openModal, setOpenModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Shared helper: pin + highlight a row for PIN_DURATION ───────────────
  const activatePin = (id: string, message: string) => {
    // Clear any previous timer
    if (pinTimerRef.current) clearTimeout(pinTimerRef.current);

    setPinnedId(id);
    setHighlightedId(id);
    setSuccessMessage(message);
    setCurrentPage(1); // go to page 1 so the pinned top row is visible

    pinTimerRef.current = setTimeout(() => {
      setPinnedId(null);
      setHighlightedId(null);
      setSuccessMessage("");
    }, PIN_DURATION);
  };

  // ─── Add flow: read ?added=ID from URL after router.push ─────────────────
  useEffect(() => {
    const addedId = searchParams.get("added");
    if (!addedId || !data?.items?.length) return;

    // Verify the ID actually exists in the fresh data
    const exists = data.items.some((a) => String(a.amenity_id) === addedId);
    if (!exists) return;

    activatePin(addedId, "Amenity added successfully!");

    // Clean the URL param without causing a navigation/re-render loop
    router.replace("/admin/amenities");
  }, [searchParams, data]);

  // Cleanup timer on unmount
  useEffect(() => () => { if (pinTimerRef.current) clearTimeout(pinTimerRef.current); }, []);

  // ─── Edit flow ────────────────────────────────────────────────────────────
  const handleEdit = (amenity: any) => {
    setSelectedAmenity(amenity);
    setOpenModal(true);
  };

  const handleEditSuccess = (editedId: string) => {
    fetchAmenities();
    activatePin(editedId, "Amenity updated successfully!");
  };

  // ─── Filter ───────────────────────────────────────────────────────────────
  const filteredAmenities = (data?.items || []).filter((a: any) => {
    const name = (a.amenity_name || "").toLowerCase();
    const query = search.toLowerCase();
    if (query.length === 0) return true;
    let i = 0;
    for (const char of name) {
      if (char === query[i]) i++;
      if (i === query.length) return true;
    }
    return false;
  });

  // ─── Pin the edited/added row to top temporarily ──────────────────────────
  const sortedAmenities = pinnedId
    ? [
        ...filteredAmenities.filter((a: any) => String(a.amenity_id) === pinnedId),
        ...filteredAmenities.filter((a: any) => String(a.amenity_id) !== pinnedId),
      ]
    : filteredAmenities;

  // ─── Pagination ───────────────────────────────────────────────────────────
  const itemsPerPage = 10;
  const totalPages = Math.ceil(sortedAmenities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAmenities = sortedAmenities.slice(startIndex, startIndex + itemsPerPage);

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

      {/* EDIT MODAL */}
      {selectedAmenity && (
        <EditAmenityModal
          amenity={selectedAmenity}
          open={openModal}
          onClose={() => setOpenModal(false)}
          onSuccess={(editedId) => {
            setOpenModal(false);
            handleEditSuccess(editedId);
          }}
        />
      )}

    </div>
  );
}