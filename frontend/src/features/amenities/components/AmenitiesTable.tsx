

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
} from "lucide-react";

import { Amenity } from "../types/amenities.types";

type Props = {
  data: Amenity[];
  onEdit: (amenity: Amenity) => void;
  highlightedAmenityId?: string | null;
};

const iconMap: Record<string, any> = {
  wifi: Wifi,
  coffee: Coffee,
  monitor: Monitor,
  "volume-x": VolumeX,
  elevator: Building,
  window: DoorOpen,
};

export default function AmenitiesTable({
  data,
  onEdit,
   highlightedAmenityId,
}: Props) {
  
  return (
    <>
      <style>{`
        @keyframes highlight-fade {
          0%   { background-color: #eff6ff; }
          60%  { background-color: #eff6ff; }
          100% { background-color: transparent; }
        }
        .row-highlight {
          animation: highlight-fade 3s ease forwards;
        }
      `}</style>

      <table className="w-full text-xs" style={{ minWidth: "860px" }}>

        <colgroup>
          <col style={{ width: "200px" }} />
          <col style={{ width: "120px" }} />
          <col style={{ width: "220px" }} />
          <col style={{ width: "70px" }} />
          <col style={{ width: "90px" }} />
          <col style={{ width: "110px" }} />
          <col style={{ width: "70px" }} />
        </colgroup>

        {/* HEADER */}
        <thead className="text-xs text-gray-500 bg-gray-50 border-b sticky top-0 z-10">
          <tr>
            <th className="px-3 py-3 text-left font-medium">Amenity Name</th>
            <th className="px-3 py-3 text-left font-medium">Category</th>
            <th className="px-3 py-3 text-left font-medium">Description</th>
            <th className="px-3 py-3 text-center font-medium">Icon</th>
            <th className="px-3 py-3 text-left font-medium">Status</th>
            <th className="px-3 py-3 text-center font-medium">Assigned Seats</th>
            <th className="px-3 py-3 text-center font-medium">Actions</th>
          </tr>
        </thead>

        {/* BODY */}
        <tbody className="divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                No amenities found.
              </td>
            </tr>
          ) : (
            data.map((amenity) => {
              const Icon = iconMap[amenity.icon_name?.toLowerCase()] || Tag;
              const isHighlighted = highlightedAmenityId === amenity.amenity_id;

              return (
      <tr
  key={amenity.amenity_id}
  className={`transition-colors duration-300 ${
    highlightedAmenityId === String(amenity.amenity_id)
      ? "bg-blue-100"
      : "hover:bg-gray-50"
  }`}
>
                  {/* AMENITY NAME */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full ${
                        isHighlighted ? "bg-blue-200" : "bg-blue-100"
                      }`}>
                        <Icon className="w-3 h-3 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{amenity.amenity_name}</p>
                        <p className="text-xs text-gray-400">{amenity.amenity_key}</p>
                      </div>
                    </div>
                  </td>

                  {/* CATEGORY */}
                  <td className="px-3 py-3">
                    <span className="inline-flex px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-medium whitespace-nowrap">
                      {amenity.category_name}
                    </span>
                  </td>

                  {/* DESCRIPTION */}
                  <td className="px-3 py-3 text-gray-500 max-w-0">
                    <span className="block truncate">{amenity.description}</span>
                  </td>

                  {/* ICON */}
                  <td className="px-3 py-3 text-center">
                    <Icon className="w-4 h-4 mx-auto text-gray-600" />
                  </td>

                  {/* STATUS */}
                  <td className="px-3 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium whitespace-nowrap ${
                      amenity.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {amenity.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>

                  {/* ASSIGNED SEATS */}
                  <td className="px-3 py-3 text-center font-medium">
                    {amenity.assigned_seat_count.toLocaleString()}
                  </td>

                  {/* ACTIONS */}
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
            })
          )}
        </tbody>

      </table>
    </>
  );
}