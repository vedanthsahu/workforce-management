"use client";

import { Building2, Pencil } from "lucide-react";
import { Building } from "../types/building.types";

type Props = {
  data: Building[];
  onEdit: (building: Building) => void;
  highlightedId?: string | null;
};

export default function BuildingTable({ data, onEdit, highlightedId }: Props) {
  if (data.length === 0) {
    return <p className="px-6 py-12 text-center text-gray-400 text-sm">No buildings found.</p>;
  }

  return (
    <>
      <style>{`
        @keyframes highlight-fade {
          0%   { background-color: #eff6ff; }
          60%  { background-color: #eff6ff; }
          100% { background-color: transparent; }
        }
        .row-highlight { animation: highlight-fade 3s ease forwards; }
      `}</style>

      {/* ── Mobile card list ──────────────────────────────── */}
      <div className="md:hidden divide-y">
        {data.map((building) => {
          const isHighlighted = highlightedId === String(building.building_id);
          return (
            <div key={building.building_id} className={`px-4 py-3 flex items-center justify-between gap-3 ${isHighlighted ? "row-highlight" : ""}`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-full ${isHighlighted ? "bg-blue-200" : "bg-blue-100"}`}>
                  <Building2 className="w-4 h-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{building.building_name}</p>
                  <p className="text-xs text-gray-400 truncate">{building.building_code} · {building.site_name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-gray-500">{building.floor_count} floors</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-500">{building.bookable_seat_count} bookable seats</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${building.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {building.status}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => onEdit(building)} className="p-1.5 border rounded-lg hover:bg-gray-100 transition shrink-0">
                <Pencil size={13} className="text-blue-600" />
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Desktop table ─────────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-xs table-fixed">
          <colgroup>
            <col style={{ width: "150px" }} /><col style={{ width: "180px" }} />
            <col style={{ width: "150px" }} /><col style={{ width: "70px" }} />
            <col style={{ width: "90px" }} /><col style={{ width: "90px" }} />
            <col style={{ width: "100px" }} /><col style={{ width: "80px" }} />
            <col style={{ width: "70px" }} />
          </colgroup>
          <thead className="text-xs text-gray-500 bg-gray-50 border-b sticky top-0 z-10">
            <tr>
              <th className="px-3 py-3 text-left font-medium">Building Code</th>
              <th className="px-3 py-3 text-left font-medium">Building Name</th>
              <th className="px-3 py-3 text-left font-medium">Site Name</th>
              <th className="px-3 py-3 text-center font-medium">Floors</th>
              <th className="px-3 py-3 text-center font-medium">Total Seats</th>
              <th className="px-3 py-3 text-center font-medium">Active Seats</th>
              <th className="px-3 py-3 text-center font-medium">Bookable Seats</th>
              <th className="px-3 py-3 text-left font-medium">Status</th>
              <th className="px-3 py-3 text-center font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((building) => {
              const isHighlighted = highlightedId === String(building.building_id);
              return (
                <tr key={building.building_id} className={`transition-colors ${isHighlighted ? "row-highlight" : "hover:bg-gray-50"}`}>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 shrink-0 flex items-center justify-center rounded-full ${
                        isHighlighted ? "bg-blue-200" : "bg-blue-100"
                      }`}>
                        <Building2 className="w-3 h-3 text-blue-600" />
                      </div>
                      <span className="font-medium truncate">{building.building_code}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 max-w-0"><span className="block font-medium truncate">{building.building_name}</span></td>
                  <td className="px-3 py-3 max-w-0"><span className="block truncate">{building.site_name}</span></td>
                  <td className="px-3 py-3 text-center">{building.floor_count}</td>
                  <td className="px-3 py-3 text-center">{building.seat_count?.toLocaleString()}</td>
                  <td className="px-3 py-3 text-center">{building.active_seat_count?.toLocaleString()}</td>
                  <td className="px-3 py-3 text-center">{building.bookable_seat_count?.toLocaleString()}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium whitespace-nowrap ${building.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {building.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button onClick={() => onEdit(building)} className="p-1.5 border rounded-lg hover:bg-gray-100 transition">
                      <Pencil size={13} className="text-blue-600" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}