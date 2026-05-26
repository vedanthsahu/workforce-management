import { Office } from "../types/office.types";
import { Pencil, MapPin } from "lucide-react";

type Props = {
  data: Office[];
};

export default function OfficeTable({ data }: Props) {
  // 🔥 EMPTY STATE
  if (!data.length) {
    return (
      <div className="p-6 text-center text-gray-500">
        No offices found
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">

        {/* HEADER */}
        <thead className="bg-gray-50 border-b text-gray-500">
          <tr className="text-left">
            <th className="px-6 py-3">Site Code</th>
            <th className="px-6 py-3">Site Name</th>
            <th className="px-6 py-3">City</th>
            <th className="px-6 py-3">Country</th>
            <th className="px-6 py-3">Timezone</th>
            <th className="px-6 py-3">Buildings</th>
            <th className="px-6 py-3">Floors</th>
            <th className="px-6 py-3">Total Seats</th>
            <th className="px-6 py-3">Status</th>
            <th className="px-6 py-3 text-center">Actions</th>
          </tr>
        </thead>

        {/* BODY */}
        <tbody>
          {data.map((o) => (
            <tr
              key={o.id}
              className="border-b hover:bg-gray-50 transition"
            >
              {/* SITE CODE */}
              <td className="px-6 py-4 flex items-center gap-3">
                <div className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-50">
                  <MapPin className="w-4 h-4 text-blue-600" />
                </div>
                <span className="font-medium">{o.code}</span>
              </td>

              <td className="px-6 py-4 font-medium">{o.name}</td>
              <td className="px-6 py-4">{o.city}</td>
              <td className="px-6 py-4">{o.country}</td>
              <td className="px-6 py-4">{o.timezone}</td>

              {/* 🔥 FIXED FIELD NAME */}
              <td className="px-6 py-4">{o.buildings}</td>

              <td className="px-6 py-4">{o.floors}</td>

              {/* 🔥 SAFE NUMBER FORMAT */}
              <td className="px-6 py-4">
                {o.seats?.toLocaleString()}
              </td>

              {/* STATUS */}
              <td className="px-6 py-4">
                <span
                  className={`px-3 py-1 text-xs font-medium rounded-full ${
                    o.status === "ACTIVE"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {o.status}
                </span>
              </td>

              {/* ACTIONS */}
              <td className="px-6 py-4">
                <div className="flex justify-center gap-2">
                  <button className="w-8 h-8 flex items-center justify-center rounded-md border hover:bg-blue-50 transition">
                    <Pencil className="w-4 h-4 text-blue-600" />
                  </button>
                </div>
              </td>

            </tr>
          ))}
        </tbody>

      </table>
    </div>
  );
}