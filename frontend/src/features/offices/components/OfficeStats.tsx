"use client";

import { Building2, CheckCircle, PauseCircle, Armchair } from "lucide-react";
import { OfficeStatsSummary } from "../types/office.types";

export default function OfficeStats({ stats }: { stats: OfficeStatsSummary | null }) {
  if (!stats) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

      <Stat icon={<Building2 className="text-blue-600" />} bg="bg-blue-100" label="Total Offices" value={stats.total_offices.toString()} sub="Across all tenants" />
      <Stat icon={<CheckCircle className="text-green-600" />} bg="bg-green-100" label="Active Offices" value={stats.active_sites.toString()} sub="Currently active" />
      <Stat icon={<PauseCircle className="text-yellow-600" />} bg="bg-yellow-100" label="Inactive Offices" value={stats.inactive_sites.toString()} sub="Currently inactive" />
      <Stat icon={<Armchair className="text-purple-600" />} bg="bg-purple-100" label="Total Seats" value={stats.total_seats.toString()} sub="Across all offices" />

    </div>
  );
}

function Stat({ icon, bg, label, value, sub }: any) {
  return (
    <div className="flex items-center gap-3 p-3 sm:p-5 bg-white border rounded-2xl shadow-sm">
      <div className={`p-3 rounded-xl ${bg}`}>{icon}</div>

      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-xl font-semibold text-gray-900">{value}</p>
        <p className="text-xs text-gray-400 mt-1">{sub}</p>
      </div>
    </div>
  );
}