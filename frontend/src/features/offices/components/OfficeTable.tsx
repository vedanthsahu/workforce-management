"use client";

import { Pencil, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Office } from "../types/office.types";

interface OfficeTableProps {
  data: Office[];
  onEdit: (office: Office) => void;
  highlightedId?: string | null;
}

export default function OfficeTable({ data, onEdit, highlightedId }: OfficeTableProps) {
  if (data.length === 0) {
    return <p className="px-6 py-12 text-center text-gray-400 text-sm">No offices found.</p>;
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
        {data.map((o) => {
          const isHighlighted = highlightedId === o.site_id;
          return (
            <div key={o.site_code} className={`px-4 py-3 flex items-center justify-between gap-3 ${isHighlighted ? "row-highlight" : ""}`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-full ${isHighlighted ? "bg-blue-200" : "bg-blue-100"}`}>
                  <MapPin className="w-4 h-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm line-clamp-2">{o.site_name}</p>
                  <p className="text-xs text-gray-400 truncate">{o.site_code} · {o.city}, {o.country}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-gray-500">{o.building_count} bldgs · {o.floor_count} floors · {o.seat_count?.toLocaleString()} seats</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${o.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {o.status}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => onEdit(o)} className="p-1.5 border rounded-lg hover:bg-gray-100 transition shrink-0">
                <Pencil size={13} className="text-blue-600" />
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Desktop table ─────────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-xs table-fixed" style={{ minWidth: "860px" }}>
          <colgroup>
            <col style={{ width: "120px" }} /><col style={{ width: "160px" }} />
            <col style={{ width: "140px" }} /><col style={{ width: "110px" }} />
            <col style={{ width: "160px" }} /><col style={{ width: "60px" }} />
            <col style={{ width: "60px" }} /><col style={{ width: "60px" }} />
            <col style={{ width: "90px" }} /><col style={{ width: "70px" }} />
          </colgroup>
          <thead className="text-xs text-blue-600 bg-blue-100 border-b sticky top-0 z-10">
            <tr>
              <th className="pl-6 px-3 py-3 text-left font-bold">Office Code</th>
              <th className="pl-4 px-3 py-3 text-left font-bold">Office Name</th>
              <th className="pl-6 pr-3 py-3 text-left font-bold">City</th>
              <th className="px-3 py-3 text-left font-bold">Country</th>
              <th className="pl-6 px-3 py-3 text-left font-bold">Timezone</th>
              <th className="px-1 py-3 text-center font-bold">Buildings</th>
              <th className="px-4 py-3 text-center font-bold">Floors</th>
              <th className="px-3 py-3 text-center font-bold">Seats</th>
              <th className="pl-6 px-3 py-3 text-left font-bold">Status</th>
              <th className="px-3 py-3 text-center font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((o) => {
              const isHighlighted = highlightedId === o.site_id;
              return (
                <tr key={o.site_code} className={`transition-colors ${isHighlighted ? "row-highlight" : "hover:bg-gray-50"}`}>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 shrink-0 flex items-center justify-center rounded-full ${isHighlighted ? "bg-blue-200" : "bg-blue-100"}`}>
                        <MapPin className="w-3 h-3 text-blue-600" />
                      </div>
                      <span className="font-medium">{o.site_code}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 max-w-0"><span title={o.site_name} className="block font-medium line-clamp-2">{o.site_name}</span></td>
                  <td className="pl-1 pr-3 py-3 max-w-0"><span title={o.city} className="block line-clamp-2">{o.city}</span></td>
                  <td className="px-3 py-3 max-w-0"><span title={o.country} className="block line-clamp-2">{o.country}</span></td>
                  <td className="px-3 py-3 max-w-0"><span title={o.timezone} className="block line-clamp-2">{o.timezone}</span></td>
                  <td className="px-3 py-3 text-center">{o.building_count}</td>
                  <td className="px-3 py-3 text-center">{o.floor_count}</td>
                  <td className="px-3 py-3 text-center">{o.seat_count?.toLocaleString()}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium whitespace-nowrap ${o.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onEdit(o)}
                    >
                      <Pencil size={13} className="text-blue-600" />
                    </Button>
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
