
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Toaster } from "sonner";

import AmenitiesCards from "@/features/amenities/components/AmenitiesCards";
import AmenitiesFilters from "@/features/amenities/components/AmenitiesFilters";
import AmenitiesTable from "@/features/amenities/components/AmenitiesTable";
import EditAmenityModal from "@/features/amenities/components/EditAmenityModal";
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
    <div className="p-6 space-y-6 bg-[#f8fafc] min-h-screen">

      {/* BREADCRUMB */}
      <div className="text-sm text-gray-500">
        Admin / Amenities / <span className="text-gray-800">Manage Amenities</span>
      </div>

      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Manage Amenities</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create, edit and manage all amenities available in your workspace.
          </p>
        </div>

        <button
          onClick={() => router.push("/admin/amenities/add")}
         className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl shadow-sm"
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
                total_amenities: data.total_amenities,
                active_amenities: data.active_amenities,
                inactive_amenities: data.inactive_amenities,
                assigned_amenities: data.assigned_amenities,
              }
            : null
        }
      />

      {/* TABLE CARD */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center px-6 py-4 border-b">
          <h2 className="text-base font-semibold text-gray-800">Amenities List</h2>
          <AmenitiesFilters
            search={search}
            setSearch={setSearch}
            status={status}
            setStatus={setStatus}
          />
        </div>

        <Toaster richColors position="top-right" />

        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading...</div>
        ) : (
          <div
            className="w-full overflow-x-auto overflow-y-auto"
            style={{ maxHeight: "calc(100vh - 420px)", minHeight: "200px" }}
          >
            <AmenitiesTable
              data={paginatedAmenities}
              onEdit={handleEdit}
              highlightedAmenityId={highlightedId}
            />
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center px-6 py-4 border-t text-sm text-gray-500">
          <span>
            Showing {sortedAmenities.length === 0 ? 0 : startIndex + 1} to{" "}
            {Math.min(startIndex + itemsPerPage, sortedAmenities.length)} of{" "}
            {sortedAmenities.length} entries
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