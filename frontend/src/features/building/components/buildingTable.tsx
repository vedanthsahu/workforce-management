"use client";

import { useState } from "react";
import { Building } from "../types/building";
import { Building2, Pencil, Trash2, Search, Filter } from "lucide-react";
import Pagination from "./Pagination";

export default function BuildingTable({ data }: { data: Building[] }) {
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 3; // ✅ IMPORTANT (so pagination shows)
  const totalPages = Math.ceil(data.length / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = data.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="bg-white border rounded-xl">

      {/* Header */}
      <div className="flex justify-between items-center p-5 border-b">
        <h3 className="text-lg font-semibold">Buildings List</h3>

        <div className="flex gap-3 items-center">
          <select className="border rounded-lg px-3 py-2 text-sm">
            <option>All Sites</option>
          </select>

          <div className="relative">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
            <input
              placeholder="Search building..."
              className="border rounded-lg pl-8 pr-3 py-2 text-sm"
            />
          </div>

          <button className="flex items-center gap-2 border px-3 py-2 rounded-lg text-sm">
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <table className="w-full text-sm">
        <thead className="text-gray-500 border-b">
  <tr>
    <th className="text-left py-3 px-5">Building Name</th>
    <th className="text-left py-3 px-5">Site</th>
    <th className="text-left py-3 px-5">Address</th>
    <th className="text-left py-3 px-5">Capacity (Seats)</th>
    <th className="text-left py-3 px-5">Status</th>
    <th className="text-left py-3 px-5">Created On</th>
    <th className="text-center py-3 px-5">Actions</th>
  </tr>
</thead>

<tbody>
  {currentData.map((item) => (
    <tr key={item.id} className="border-b hover:bg-gray-50">

      <td className="py-4 px-5 flex items-center gap-3">
        <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
          <Building2 className="w-4 h-4 text-gray-600" />
        </div>
        {item.name}
      </td>

      <td className="px-5">{item.site}</td>
      <td className="px-5">{item.address}</td>
      <td className="px-5">{item.capacity}</td>

      <td className="px-5">
        <span className={`px-3 py-1 text-xs rounded-full ${
          item.status === "Active"
            ? "bg-green-100 text-green-600"
            : "bg-gray-200 text-gray-600"
        }`}>
          {item.status}
        </span>
      </td>

      <td className="px-5">{item.createdOn}</td>

      <td className="px-5 text-center">
        <div className="flex justify-center gap-2">
          <button className="p-2 border rounded-lg hover:bg-blue-50">
            <Pencil className="w-4 h-4 text-blue-600" />
          </button>

          <button className="p-2 border rounded-lg hover:bg-red-50">
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        </div>
      </td>

    </tr>
  ))}
</tbody>
      </table>

      {/* Footer */}
      <div className="flex justify-between items-center p-4">

        {/* Showing text */}
        <p className="text-sm text-gray-500">
          Showing {startIndex + 1} to{" "}
          {Math.min(startIndex + itemsPerPage, data.length)} of {data.length} entries
        </p>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}