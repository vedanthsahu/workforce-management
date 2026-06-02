"use client";

import { Pencil, MapPin } from "lucide-react";

type Props = {
  data: any[];
  onEdit: (office: any) => void;
};

export default function OfficeTable({ data, onEdit }: Props) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm table-auto">

        {/* HEADER */}
        <thead className="text-xs text-gray-500 bg-gray-50 border-b">
          <tr>
            <th className="px-6 py-4 text-left">Office Code</th>
            <th className="px-6 py-4 text-left">Office Name</th>
            <th className="px-6 py-4 text-left">City</th>
            <th className="px-6 py-4 text-left">Country</th>
            <th className="px-6 py-4 text-left">Timezone</th>
            <th className="px-6 py-4 text-left">Buildings</th>
            <th className="px-6 py-4 text-left">Floors</th>
            <th className="px-6 py-4 text-left">Total Seats</th>
            <th className="px-6 py-4 text-left">Status</th>
            <th className="px-6 py-4 text-center">Actions</th>
          </tr>
        </thead>

        {/* BODY */}
        <tbody className="divide-y divide-gray-100">
          {data.map((o: any) => (
            <tr key={o.site_code} className="hover:bg-gray-50">

              {/* CODE */}
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-100">
                    <MapPin className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="font-medium whitespace-nowrap">
                    {o.site_code}
                  </span>
                </div>
              </td>

              {/* NAME */}
              <td className="px-6 py-4 font-medium whitespace-nowrap">
                {o.site_name}
              </td>

              <td className="px-6 py-4 whitespace-nowrap">{o.city}</td>
              <td className="px-6 py-4 whitespace-nowrap">{o.country}</td>
              <td className="px-6 py-4 whitespace-nowrap">{o.timezone}</td>

              <td className="px-6 py-4 text-left">{o.building_count}</td>
              <td className="px-6 py-4 text-left">{o.floor_count}</td>

              <td className="px-6 py-4 whitespace-nowrap">
                {o.seat_count.toLocaleString()}
              </td>

              {/* STATUS */}
              <td className="px-6 py-4">
                <span
                  className={`px-3 py-1 text-xs rounded-full whitespace-nowrap ${
                    o.status === "ACTIVE"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {o.status}
                </span>
              </td>

              {/* ACTION */}
              <td className="px-6 py-4 text-center">
              <button
                onClick={() => onEdit(o)}
                className="p-2 border rounded-lg hover:bg-gray-100 transition"
              >
              <Pencil size={14} className="text-blue-600" />
                </button>
              </td>

            </tr>
          ))}
        </tbody>

      </table>
    </div>
  );
}