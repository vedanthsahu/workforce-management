"use client";

import { Pencil } from "lucide-react";

import { Amenity } from "../types/amenities.types";
import { getCategoryColor } from "../utils/amenityColors";

type Props = {
  data: Amenity[];
  onEdit: (amenity: Amenity) => void;
  highlightedAmenityId?: string | null;
};

export default function AmenitiesTable({ data, onEdit, highlightedAmenityId }: Props) {
  if (data.length === 0) {
    return <p className="px-6 py-12 text-center text-gray-400 text-sm">No amenities found.</p>;
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

      {/* ── Mobile card list (hidden on md+) ──────────────── */}
      <div className="md:hidden divide-y">
        {data.map((amenity) => {
          const color = getCategoryColor(amenity.category_name);
          const Icon = color.icon;
          const isHighlighted = String(amenity.amenity_id) === String(highlightedAmenityId);
          return (
            <div
              key={amenity.amenity_id}
              className={`px-4 py-3 flex items-center justify-between gap-3 ${isHighlighted ? "row-highlight" : ""}`}
            >
              <div className="min-w-0">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${color.bg} ${color.text} ${color.border} ${isHighlighted ? "ring-2 ring-blue-300" : ""}`}>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${color.dot}`} />
                  {amenity.amenity_name}
                </span>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${color.bg} ${color.text} ${color.border}`}>
                    <Icon className="w-3 h-3" strokeWidth={2.25} />
                    {amenity.category_name}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    amenity.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                  }`}>
                    {amenity.is_active ? "Active" : "Inactive"}
                  </span>
                  <span className="text-xs text-gray-500">{amenity.assigned_seat_count} seats</span>
                </div>
              </div>
              <button
                onClick={() => onEdit(amenity)}
                className="p-1.5 border rounded-lg hover:bg-gray-100 transition shrink-0"
              >
                <Pencil size={13} className="text-blue-600" />
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Desktop table (hidden below md) ───────────────── */}
      {/* ✅ CHANGED: removed overflow-x-auto here — parent div in page.tsx owns it now */}
      <div className="hidden md:block">
        <table className="w-full text-xs" style={{ minWidth: "860px" }}>
          <colgroup>
            <col style={{ width: "170px" }} />
            <col style={{ width: "170px" }} />
            <col style={{ width: "220px" }} />
            <col style={{ width: "90px" }} />
            <col style={{ width: "110px" }} />
            <col style={{ width: "70px" }} />
          </colgroup>
          <thead className="text-xs text-blue-600 bg-blue-100 border-b sticky top-0 z-10">
            <tr>
              <th className="pl-10 px-3 py-3 text-left font-bold">Amenity Name</th>
              <th className="pl-10 px-3 py-3 text-left font-bold">Category</th>
              <th className="pl-13 px-3 py-3 text-left font-bold">Description</th>
              <th className="px-3 py-3 text-center font-bold">Status</th>
              <th className="px-3 py-3 text-center font-bold">Assigned Seats</th>
              <th className="px-3 py-3 text-center font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((amenity) => {
              const color = getCategoryColor(amenity.category_name);
              const Icon = color.icon;
              const isHighlighted = String(amenity.amenity_id) === String(highlightedAmenityId);
              return (
                <tr key={amenity.amenity_id} className={isHighlighted ? "row-highlight" : "hover:bg-gray-50"}>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${color.bg} ${color.text} ${color.border} ${isHighlighted ? "ring-2 ring-blue-300" : ""}`}>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${color.dot}`} />
                      {amenity.amenity_name}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-left">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${color.bg} ${color.text} ${color.border}`}>
                      <Icon className="w-3.5 h-3.5" strokeWidth={2.25} />
                      {amenity.category_name}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-black max-w-0">
                    <span className="block truncate">{amenity.description}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium whitespace-nowrap ${
                      amenity.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                    }`}>
                      {amenity.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center font-medium">
                    {amenity.assigned_seat_count.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={() => onEdit(amenity)}
                      className="p-1.5 border rounded-lg hover:bg-gray-100 transition"
                    >
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
