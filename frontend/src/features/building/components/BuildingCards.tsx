"use client";

import { Building2, CheckCircle, PauseCircle, Armchair } from "lucide-react";
import { BuildingStatsSummary } from "../types/building.types";

type Props = { stats: BuildingStatsSummary | null };

type StatProps = {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: string;
  sub: string;
};

export default function BuildingCards({
  stats,
}: Props) {
  if (!stats) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <Stat icon={<Building2 className="text-blue-600" />} bg="bg-blue-100" label="Total Buildings" value={stats.total_buildings.toString()} sub="Across all offices" />
      <Stat icon={<CheckCircle className="text-green-600" />} bg="bg-green-100" label="Active Buildings" value={stats.active_buildings.toString()} sub="Currently active" />
      <Stat icon={<PauseCircle className="text-orange-600" />} bg="bg-orange-100" label="Inactive Buildings" value={stats.inactive_buildings.toString()} sub="Currently inactive" />
      <Stat icon={<Armchair className="text-purple-600" />} bg="bg-purple-100" label="Total Seats" value={stats.total_seats.toString()} sub="Across all buildings" />
    </div>
  );
}

function Stat({
  icon,
  bg,
  label,
  value,
  sub,
}: StatProps) {
  return (
    <div className="flex items-center gap-3 p-3 sm:p-5 bg-white border rounded-2xl shadow-sm">
      <div className={`p-2 sm:p-3 rounded-xl shrink-0 ${bg}`}>{icon}</div>
      <div>
        <p className="text-xs sm:text-sm text-gray-500">{label}</p>
        <p className="text-lg sm:text-xl font-semibold text-gray-900">{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}