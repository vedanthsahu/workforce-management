// "use client";

// import OfficeTable from "@/features/offices/components/OfficeTable";
// import OfficeFilters from "@/features/offices/components/OfficeFilters";
// import OfficeStats from "@/features/offices/components/OfficeStats";
// import AddOfficeForm from "@/features/offices/components/AddOfficeForm";
// import useOffices from "@/features/offices/hooks/useOffices";
// import Pagination from "@/features/offices/components/OfficePagination";
// import EditOfficeModal from "@/features/offices/components/EditOfficeModal";
// import { useState } from "react";

// export default function OfficesPage() {
//   const {
//     offices,
//     loading,
//     error,
//     fetchOffices,
//     stats,
//   } = useOffices();

//   const [search, setSearch] = useState("");
//   const [currentPage, setCurrentPage] = useState(1);
//   const [selectedOffice, setSelectedOffice] = useState<any>(null);
//   const [open, setOpen] = useState(false);

//   const handleEdit = (office: any) => {
//     setSelectedOffice(office);
//     setOpen(true);
//   };

//   const filteredOffices = offices.filter((o: any) => {
//     const name = (o.site_name || "").toLowerCase();
//     const query = search.toLowerCase();
//     if (query.length === 0) return true;
//     let i = 0;
//     for (let char of name) {
//       if (char === query[i]) i++;
//       if (i === query.length) return true;
//     }
//     return false;
//   });

//   const itemsPerPage = 10;
//   const totalPages = Math.ceil(filteredOffices.length / itemsPerPage);
//   const startIndex = (currentPage - 1) * itemsPerPage;
//   const paginatedOffices = filteredOffices.slice(startIndex, startIndex + itemsPerPage);

//   return (
//     <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 bg-[#f8fafc] min-h-screen">

//       {/* BREADCRUMB */}
//       <div className="text-xs sm:text-sm text-gray-500">
//         Admin / Offices /{" "}
//         <span className="text-gray-800">Manage Offices</span>
//       </div>

//       {/* HEADER */}
//       <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//         <div>
//           <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
//             Manage Offices
//           </h1>
//           <p className="text-xs sm:text-sm text-gray-500 mt-1">
//             View, add, edit and manage all offices across the organization.
//           </p>
//         </div>
//         <div className="self-start sm:self-auto shrink-0">
//           <AddOfficeForm />
//         </div>
//       </div>

//       {/* STATS CARDS */}
//       <OfficeStats stats={stats} />

//       {/* TABLE CARD */}
//       <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">

//         {/* TABLE HEADER */}
//         <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 border-b shrink-0">
//           <h2 className="text-sm sm:text-base font-semibold text-gray-800">
//             Offices List
//           </h2>
//           <div className="w-full sm:w-auto">
//             <OfficeFilters search={search} setSearch={setSearch} />
//           </div>
//         </div>

//         {/* TABLE BODY — fills remaining viewport height */}
//         <div
//           className="w-full overflow-x-auto overflow-y-auto"
//           style={{ maxHeight: "calc(100vh - 420px)", minHeight: "200px" }}
//         >
//           {loading ? (
//             <div className="p-6 text-sm text-gray-500">Loading...</div>
//           ) : error ? (
//             <div className="p-6 text-sm text-red-500">{error}</div>
//           ) : (
//             <OfficeTable
//               data={paginatedOffices}
//               onEdit={handleEdit}
//             />
//           )}
//         </div>

//         {/* EDIT MODAL */}
//         {selectedOffice && (
//           <EditOfficeModal
//             office={selectedOffice}
//             open={open}
//             onClose={() => setOpen(false)}
//             onSuccess={fetchOffices}
//           />
//         )}

//         {/* FOOTER */}
//         <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 border-t shrink-0 text-xs sm:text-sm text-gray-500">
//           <span>
//             Showing {filteredOffices.length === 0 ? 0 : startIndex + 1} to{" "}
//             {Math.min(startIndex + itemsPerPage, filteredOffices.length)} of{" "}
//             {filteredOffices.length} entries
//           </span>
//           <div className="self-center sm:self-auto">
//             <Pagination
//               currentPage={currentPage}
//               totalPages={totalPages}
//               onPageChange={(page) => {
//                 setCurrentPage(page);
//               }}
//             />
//           </div>
//         </div>

//       </div>
//     </div>
//   );
// }

"use client";

import OfficeTable from "@/features/offices/components/OfficeTable";
import OfficeFilters from "@/features/offices/components/OfficeFilters";
import OfficeStats from "@/features/offices/components/OfficeStats";
import AddOfficeForm from "@/features/offices/components/AddOfficeForm";
import useOffices from "@/features/offices/hooks/useOffices";
import Pagination from "@/features/offices/components/OfficePagination";
import EditOfficeModal from "@/features/offices/components/EditOfficeModal";
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
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOffice, setSelectedOffice] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const handleEdit = (office: any) => {
    setSelectedOffice(office);
    setOpen(true);
  };

  const filteredOffices = offices.filter((o: any) => {
    const name = (o.site_name || "").toLowerCase();
    const query = search.toLowerCase();
    if (query.length === 0) return true;
    let i = 0;
    for (let char of name) {
      if (char === query[i]) i++;
      if (i === query.length) return true;
    }
    return false;
  });

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredOffices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOffices = filteredOffices.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 bg-[#f8fafc] min-h-screen">

      {/* BREADCRUMB */}
      <div className="text-xs sm:text-sm text-gray-500">
        Admin / Offices /{" "}
        <span className="text-gray-800">Manage Offices</span>
      </div>

      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
            Manage Offices
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            View, add, edit and manage all offices across the organization.
          </p>
        </div>
        <div className="self-start sm:self-auto shrink-0">
          <AddOfficeForm />
        </div>
      </div>

      {/* STATS CARDS */}
      <OfficeStats stats={stats} />

      {/* TABLE CARD */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">

        {/* TABLE HEADER */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 border-b shrink-0">
          <h2 className="text-sm sm:text-base font-semibold text-gray-800">
            Offices List
          </h2>
          <div className="w-full sm:w-auto">
            <OfficeFilters search={search} setSearch={setSearch} />
          </div>
        </div>

        {/* TABLE BODY — fills remaining viewport height */}
        <div
          className="w-full overflow-x-auto overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 420px)", minHeight: "200px" }}
        >
          {loading ? (
            <div className="p-6 text-sm text-gray-500">Loading...</div>
          ) : error ? (
            <div className="p-6 text-sm text-red-500">{error}</div>
          ) : (
            <OfficeTable
              data={paginatedOffices}
              onEdit={handleEdit}
            />
          )}
        </div>

        {/* EDIT MODAL */}
        {selectedOffice && (
          <EditOfficeModal
            office={selectedOffice}
            open={open}
            onClose={() => setOpen(false)}
            onSuccess={fetchOffices}
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
              onPageChange={(page) => {
                setCurrentPage(page);
              }}
            />
          </div>
        </div>

      </div>
    </div>
  );
}