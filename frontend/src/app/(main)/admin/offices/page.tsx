"use client";

import OfficeTable from "@/features/offices/components/OfficeTable";
import OfficeFilters from "@/features/offices/components/OfficeFilters";
import OfficeStats from "@/features/offices/components/OfficeStats";
import useOffices from "@/features/offices/hooks/useOffices";
import Pagination from "@/features/offices/components/OfficePagination";
import EditOfficeModal from "@/features/offices/components/EditOfficeModal";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, XCircle, X, Plus } from "lucide-react";
import { Office } from "@/features/offices/types/office.types";

type BannerState = {
  type: "success" | "error";
  message: string;
} | null;

function OfficesPage() {
  const { offices, loading, error, fetchStats, fetchOffices, stats } = useOffices();

  const searchParams = useSearchParams();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);
  const [open, setOpen] = useState(false);
  const [banner, setBanner] = useState<BannerState>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const showBannerWithHighlight = (message: string, siteId?: string) => {
    setBanner({ type: "success", message });
    if (siteId) {
      setHighlightedId(siteId);
      // Clear highlight after 3 seconds
      setTimeout(() => setHighlightedId(null), 5000);
    }
    const t = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(t);
  };

  // Show success banner if redirected back from add page
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      const newSiteId = searchParams.get("site_id") || undefined;
      showBannerWithHighlight("Office added successfully.", newSiteId);
      router.replace("/admin/offices");
    }
  }, [searchParams, router]);

  const handleEdit = (office: Office) => {
    setSelectedOffice(office);
    setOpen(true);
  };

  const handleSuccess = async (updatedSiteId?: string) => {
    await fetchOffices();
    await fetchStats();
    showBannerWithHighlight("Office updated successfully.", updatedSiteId);
  };

  const filteredOffices = offices
    .filter((o) => {
      const name = (o.site_name || "").toLowerCase();
      const query = search.toLowerCase().trim();
      return name.includes(query);
    })
    .sort((a, b) => {
      // Always push the newly added/edited office to the top
      if (highlightedId) {
        if (a.site_id === highlightedId) return -1;
        if (b.site_id === highlightedId) return 1;
      }
      return 0;
    });

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredOffices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOffices = filteredOffices.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-clip p-4 sm:p-6 space-y-4 sm:space-y-6 bg-[#f8fafc]">

      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Manage Offices</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            View, add, edit and manage all offices across the organization.
          </p>
        </div>
        <div className="self-start sm:self-auto shrink-0">
          <button
            onClick={() => router.push("/admin/offices/addoffice")}
            className="inline-flex items-center gap-2 h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-sm"
          >
            <Plus size={16} />
            Add Office
          </button>
        </div>
      </div>

      {/* PAGE-LEVEL BANNER */}
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

      {/* STATS CARDS */}
      <OfficeStats stats={stats} />

      {/* TABLE CARD */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">

        {/* TABLE HEADER */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 border-b shrink-0">
          <h2 className="text-sm sm:text-base font-semibold text-gray-800">Offices List</h2>
          <div className="w-full sm:w-auto">
            <OfficeFilters
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
            <OfficeTable
              data={paginatedOffices}
              onEdit={handleEdit}
              highlightedId={highlightedId}
            />
          )}
        </div>

        {/* EDIT MODAL */}
        {selectedOffice && (
          <EditOfficeModal
            office={selectedOffice}
            open={open}
            onClose={() => setOpen(false)}
            onSuccess={handleSuccess}
          />
        )}

        {/* FOOTER */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 border-t shrink-0 text-xs sm:text-sm text-gray-500">
          <span>
            Showing {filteredOffices.length === 0 ? 0 : startIndex + 1} to{" "}
            {Math.min(startIndex + itemsPerPage, filteredOffices.length)} of{" "}
            {filteredOffices.length} entries
          </span>
          <div className="self-center sm:self-auto">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        </div>

      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading...</div>}>
      <OfficesPage />
    </Suspense>
  );
}