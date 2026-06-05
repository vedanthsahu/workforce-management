"use client";

import { Building2, Pencil } from "lucide-react";
import { Building } from "../types/building.types";

type Props = {
  data: Building[];
  onEdit: (building: Building) => void;
};

export default function BuildingTable({
  data,
  onEdit,
}: Props) {
  return (
    // <table className="w-full text-xs table-fixed">
    <table className="w-full text-xs table-fixed">
  <colgroup>
    <col className="w-[16%]" />
    <col className="w-[16%]" />
    <col className="w-[16%]" />
    <col className="w-[7%]" />
    <col className="w-[8%]" />
    <col className="w-[8%]" />
    <col className="w-[8%]" />
    <col className="w-[8%]" />
    <col className="w-[9%]" />
  </colgroup>

      {/* HEADER */}
      <thead className="text-xs text-gray-500 bg-gray-50 border-b">
        <tr>
          <th className="px-2 py-3 text-left font-medium">
            Building Code
          </th>

          <th className="px-2 py-3 text-left font-medium">
            Building Name
          </th>

          <th className="px-2 py-3 text-left font-medium">
            Site Name
          </th>

          <th className="px-2 py-3 text-center font-medium">
            Floors
          </th>

          <th className="px-2 py-3 text-center font-medium">
            Seats
          </th>

          <th className="px-2 py-3 text-center font-medium">
            Active
          </th>

          <th className="px-2 py-3 text-center font-medium">
            Bookable
          </th>

          <th className="px-2 py-3 text-left font-medium">
            Status
          </th>

          <th className="px-2 py-3 text-center font-medium">
            Actions
          </th>
        </tr>
      </thead>

      {/* BODY */}
      <tbody className="divide-y divide-gray-100">
        {data.length === 0 ? (
          <tr>
            <td
              colSpan={9}
              className="px-6 py-12 text-center text-gray-400"
            >
              No buildings found.
            </td>
          </tr>
        ) : (
          data.map((building) => (
            <tr
              key={building.building_id}
              className="hover:bg-gray-50 transition-colors"
            >
              {/* BUILDING CODE */}
              <td className="px-2 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full bg-blue-100">
                    <Building2 className="w-3 h-3 text-blue-600" />
                  </div>

                  <span className="font-medium break-words">
                    {building.building_code}
                  </span>
                </div>
              </td>

              {/* BUILDING NAME */}
              <td className="px-2 py-3">
                <span className="block font-medium break-words">
                  {building.building_name}
                </span>
              </td>

              {/* SITE NAME */}
              <td className="px-2 py-3">
                <span className="block break-words">
                  {building.site_name}
                </span>
              </td>

              {/* FLOORS */}
              <td className="px-2 py-3 text-center">
                {building.floor_count}
              </td>

              {/* TOTAL SEATS */}
              <td className="px-2 py-3 text-center">
                {building.seat_count?.toLocaleString()}
              </td>

              {/* ACTIVE SEATS */}
              <td className="px-2 py-3 text-center">
                {building.active_seat_count?.toLocaleString()}
              </td>

              {/* BOOKABLE SEATS */}
              <td className="px-2 py-3 text-center">
                {building.bookable_seat_count?.toLocaleString()}
              </td>

              {/* STATUS */}
              <td className="px-2 py-3">
                <span
                  className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium whitespace-nowrap ${
                    building.status === "ACTIVE"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {building.status}
                </span>
              </td>

              {/* ACTION */}
              <td className="px-2 py-3 text-center">
                <button
                  onClick={() => onEdit(building)}
                  className="p-1.5 border rounded-lg hover:bg-gray-100 transition"
                >
                  <Pencil
                    size={13}
                    className="text-blue-600"
                  />
                </button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}