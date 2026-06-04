"use client";

import {
  Layers,
  Pencil,
} from "lucide-react";

type Props = {
  data: any[];
  onEdit: (
    floor: any
  ) => void;
};

export default function FloorTable({
  data,
  onEdit,
}: Props) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">

        <thead className="bg-gray-50 border-b text-xs text-gray-500">
          <tr>
            <th className="px-6 py-4 text-left">
              Floor Code
            </th>

            <th className="px-6 py-4 text-left">
              Floor Name
            </th>

            <th className="px-6 py-4 text-left">
              Building
            </th>

            <th className="px-6 py-4 text-center">
              Seats
            </th>

            <th className="px-6 py-4 text-center">
              Active Seats
            </th>

            <th className="px-6 py-4 text-center">
              Bookable Seats
            </th>

            <th className="px-6 py-4 text-center">
              Layouts
            </th>

            <th className="px-6 py-4 text-center">
              Status
            </th>

            <th className="px-6 py-4 text-center">
              Actions
            </th>
          </tr>
        </thead>

        <tbody className="divide-y">

          {data.length === 0 ? (
            <tr>
              <td
                colSpan={9}
                className="py-10 text-center text-gray-500"
              >
                No floors found
              </td>
            </tr>
          ) : (
            data.map((floor) => (
              <tr
                key={
                  floor.floor_id
                }
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Layers className="w-4 h-4 text-blue-600" />
                    </div>

                    <span>
                      {
                        floor.floor_code
                      }
                    </span>
                  </div>
                </td>

                <td className="px-6 py-4">
                  {
                    floor.floor_name
                  }
                </td>

                <td className="px-6 py-4">
                  {
                    floor.building_name
                  }
                </td>

                <td className="px-6 py-4 text-center">
                  {
                    floor.seat_count
                  }
                </td>

                <td className="px-6 py-4 text-center">
                  {
                    floor.active_seat_count
                  }
                </td>

                <td className="px-6 py-4 text-center">
                  {
                    floor.bookable_seat_count
                  }
                </td>

                <td className="px-6 py-4 text-center">
                  {
                    floor.layout_count
                  }
                </td>

                <td className="px-6 py-4 text-center">
                  <span
                    className={`px-3 py-1 rounded-full text-xs ${
                      floor.status ===
                      "ACTIVE"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {
                      floor.status
                    }
                  </span>
                </td>

                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() =>
                      onEdit(
                        floor
                      )
                    }
                    className="p-2 border rounded-lg hover:bg-gray-100"
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