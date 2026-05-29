"use client";

import OfficeTable from "@/features/offices/components/OfficeTable";
import OfficeFilters from "@/features/offices/components/OfficeFilters";
import OfficeStats from "@/features/offices/components/OfficeStats";
import AddOfficeForm from "@/features/offices/components/AddOfficeForm";
import useOffices from "@/features/offices/hooks/useOffices";
import Pagination from "@/features/offices/components/OfficePagination";
import EditOfficeModal from "@/features/offices/components/EditOfficeModal";
import { Plus, Search, Filter } from "lucide-react";
import { useState } from "react";

export default function OfficesPage() {
 const {
  offices,
  loading,
  error,
  fetchOffices,
  stats,

} = useOffices();

 const [search, setSearch] = useState("");
 const [selectedOffice, setSelectedOffice] = useState<any>(null);

const [open, setOpen] = useState(false);

const handleEdit = (office: any) => {
  setSelectedOffice(office);
  setOpen(true);
};

const filteredOffices = offices.filter((o: any) => {
  const name = (o.site_name || "").toLowerCase();
  const query = search.toLowerCase();

  // Smart fuzzy search
  let i = 0;

  for (let char of name) {
    if (char === query[i]) i++;

    if (i === query.length) {
      return true;
    }
  }

  return query.length === 0;
});
  return (
    <div className="p-6 space-y-6 bg-[#f8fafc] min-h-screen">

      {/* 🔹 BREADCRUMB */}
      <div className="text-sm text-gray-500">
        Admin / Offices / <span className="text-gray-800">Manage Offices</span>
      </div>

      {/* 🔹 HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Manage Offices
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            View, add, edit and manage all offices across the organization.
          </p>
        </div>

        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl shadow-sm">
          <Plus size={16} />
          Add Office
        </button>
      </div>

      {/* 🔹 CARDS */}
     <OfficeStats stats={stats} />

      {/* 🔹 TABLE CARD */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">

        {/* 🔸 TABLE HEADER */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-base font-semibold text-gray-800">
            Offices List
          </h2>

          <div className="flex items-center gap-3">
            
            {/* SEARCH */}
            
            <OfficeFilters search={search} setSearch={setSearch} />
          </div>
        </div>

       <div className="bg-white ">

  {/* HEADER stays SAME */}

  {loading ? (
    <div className="p-6 text-sm text-gray-500">Loading...</div>
  ) : error ? (
    <div className="p-6 text-sm text-red-500">{error}</div>
  ) : (
    <OfficeTable
  data={filteredOffices}
  onEdit={handleEdit}
/>
  )}

</div>
{selectedOffice && (
  <EditOfficeModal
    office={selectedOffice}
    open={open}
    onClose={() => setOpen(false)}
    onSuccess={fetchOffices}
  />
)}

        {/* 🔸 FOOTER */}
        <div className="flex justify-between items-center px-6 py-4 border-t text-sm text-gray-500">
          <span>Showing 1 to {offices.length} of {offices.length} entries</span>
          <Pagination />
        </div>

      </div>
    </div>
  );
}