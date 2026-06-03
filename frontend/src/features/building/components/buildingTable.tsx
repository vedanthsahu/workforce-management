"use client";

import {
  Building2,
  Pencil,
} from "lucide-react";

import { Building } from "../types/building.types";


type Props = {
  data: Building[];
  onEdit: (
    building: Building
  ) => void;
};


export default function BuildingTable({
  data,
  onEdit,
}: Props) {

  
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm table-auto">

        {/* HEADER */}
        <thead className="text-xs text-gray-500 bg-gray-50 border-b">
          <tr>

            <th className="px-6 py-4 text-left">
              Building Code
            </th>

            <th className="px-6 py-4 text-left">
              Building Name
            </th>

            <th className="px-6 py-4 text-left">
              Site Name
            </th>

            <th className="px-6 py-4 text-center">
              Floors
            </th>

            <th className="px-6 py-4 text-center">
              Total Seats
            </th>

            <th className="px-6 py-4 text-center">
              Active Seats
            </th>

            <th className="px-6 py-4 text-center">
              Bookable Seats
            </th>

            <th className="px-6 py-4 text-center">
              Status
            </th>

            <th className="px-6 py-4 text-center">
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
                className="py-10 text-center text-gray-500"
              >
                No buildings found
              </td>
            </tr>
          ) : (
            data.map((building) => (
              <tr
                key={building.building_id}
                className="hover:bg-gray-50"
              >

                {/* BUILDING CODE */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">

                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-100">
                      <Building2 className="w-4 h-4 text-blue-600" />
                    </div>

                    <span className="font-medium whitespace-nowrap">
                      {building.building_code}
                    </span>

                  </div>
                </td>

                {/* BUILDING NAME */}
                <td className="px-6 py-4 font-medium whitespace-nowrap">
                  {building.building_name}
                </td>

                {/* SITE NAME */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {building.site_name}
                </td>

                {/* FLOORS */}
                <td className="px-6 py-4 text-center">
                  {building.floor_count}
                </td>

                {/* TOTAL SEATS */}
                <td className="px-6 py-4 text-center">
                  {building.seat_count}
                </td>

                {/* ACTIVE SEATS */}
                <td className="px-6 py-4 text-center">
                  {building.active_seat_count}
                </td>

                {/* BOOKABLE SEATS */}
                <td className="px-6 py-4 text-center">
                  {building.bookable_seat_count}
                </td>

                {/* STATUS */}
                <td className="px-6 py-4 text-center">

                  <span
                    className={`px-3 py-1 text-xs rounded-full whitespace-nowrap ${
                      building.status ===
                      "ACTIVE"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {building.status}
                  </span>

                </td>

                {/* ACTION */}
                <td className="px-6 py-4 text-center">

                  <button
                    onClick={() =>
                      onEdit(building)
                    }
                    className="p-2 border rounded-lg hover:bg-gray-100 transition"
                  >
                    <Pencil
                      size={14}
                      className="text-blue-600"
                    />
                  </button>

                </td>

              </tr>
            ))
          )}

        </tbody>

      </table>
    </div>
  );
}