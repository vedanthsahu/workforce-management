"use client";

import {
  Pencil,
  Wifi,
  Coffee,
  Monitor,
  VolumeX,
  Building,
  DoorOpen,
  Tag,
  type LucideIcon,
} from "lucide-react";

import { Amenity } from "../types/amenities.types";

type Props = {
  data: Amenity[];
  onEdit: (amenity: Amenity) => void;
  highlightedAmenityId?: string | null;
};

const iconMap: Record<string, LucideIcon> = {
  wifi: Wifi,
  coffee: Coffee,
  monitor: Monitor,
  "volume-x": VolumeX,
  elevator: Building,
  window: DoorOpen,
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
          const Icon = iconMap[amenity.icon_name?.toLowerCase()] || Tag;
          const isHighlighted = String(amenity.amenity_id) === String(highlightedAmenityId);
          return (
            <div
              key={amenity.amenity_id}
              className={`px-4 py-3 flex items-center justify-between gap-3 ${isHighlighted ? "row-highlight" : ""}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-full ${isHighlighted ? "bg-blue-200" : "bg-blue-100"}`}>
                  <Icon className="w-4 h-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{amenity.amenity_name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
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
            <col style={{ width: "150px" }} />
            <col style={{ width: "170px" }} />
            <col style={{ width: "220px" }} />
            <col style={{ width: "70px" }} />
            <col style={{ width: "90px" }} />
            <col style={{ width: "110px" }} />
            <col style={{ width: "70px" }} />
          </colgroup>
          <thead className="text-xs text-blue-600 bg-blue-100 border-b sticky top-0 z-10">
            <tr>
              <th className="pl-10 px-3 py-3 text-left font-bold">Amenity Name</th>
              <th className="px-3 py-3 text-center font-bold">Category</th>
              <th className="pl-18 px-3 py-3 text-left font-bold">Description</th>
              <th className="px-3 py-3 text-center font-bold">Icon</th>
              <th className="px-3 py-3 text-center font-bold">Status</th>
              <th className="px-3 py-3 text-center font-bold">Assigned Seats</th>
              <th className="px-3 py-3 text-center font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((amenity) => {
              const Icon = iconMap[amenity.icon_name?.toLowerCase()] || Tag;
              const isHighlighted = String(amenity.amenity_id) === String(highlightedAmenityId);
              return (
                <tr key={amenity.amenity_id} className={isHighlighted ? "row-highlight" : "hover:bg-gray-50"}>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 shrink-0 flex items-center justify-center rounded-full ${
                        isHighlighted ? "bg-blue-200" : "bg-blue-100"
                      }`}>
                        <Icon className="w-3 h-3 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{amenity.amenity_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="inline-flex px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-medium whitespace-nowrap">
                      {amenity.category_name}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-black max-w-0">
                    <span className="block truncate">{amenity.description}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Icon className="w-4 h-4 mx-auto text-gray-600" />
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