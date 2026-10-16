"use client";

import { Building2, CheckCircle, PauseCircle, Armchair } from "lucide-react";
import { BuildingStatsSummary } from "../types/building.types";

export type BuildingStatusFilter = "ACTIVE" | "INACTIVE" | null;

type Props = {
  stats: BuildingStatsSummary | null;
  statusFilter?: BuildingStatusFilter;
  onStatusFilterChange?: (filter: BuildingStatusFilter) => void;
};

type StatProps = {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: string;
  sub: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
};

export default function BuildingCards({
  stats,
  statusFilter = null,
  onStatusFilterChange,
}: Props) {
  if (!stats) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <Stat
        icon={<Building2 className="text-blue-600" />}
        bg="bg-blue-100"
        label="Total Buildings"
        value={stats.total_buildings.toString()}
        sub="Across all offices"
        selected={statusFilter === null}
        disabled={stats.total_buildings === 0}
        onClick={onStatusFilterChange && stats.total_buildings > 0 ? () => onStatusFilterChange(null) : undefined}
      />
      <Stat
        icon={<CheckCircle className="text-green-600" />}
        bg="bg-green-100"
        label="Active Buildings"
        value={stats.active_buildings.toString()}
        sub="Currently active"
        selected={statusFilter === "ACTIVE"}
        disabled={stats.active_buildings === 0}
        onClick={onStatusFilterChange && stats.active_buildings > 0 ? () => onStatusFilterChange("ACTIVE") : undefined}
      />
      <Stat
        icon={<PauseCircle className="text-orange-600" />}
        bg="bg-orange-100"
        label="Inactive Buildings"
        value={stats.inactive_buildings.toString()}
        sub="Currently inactive"
        selected={statusFilter === "INACTIVE"}
        disabled={stats.inactive_buildings === 0}
        onClick={onStatusFilterChange && stats.inactive_buildings > 0 ? () => onStatusFilterChange("INACTIVE") : undefined}
      />
      <Stat icon={<Armchair className="text-purple-600" />} bg="bg-purple-100" label="Total Spaces" value={stats.active_seats.toString()} sub="Across all buildings" />
    </div>
  );
}

function Stat({
  icon,
  bg,
  label,
  value,
  sub,
  selected,
  disabled,
  onClick,
}: StatProps) {
  const clickable = !!onClick && !disabled;
  return (
    <div
      onClick={clickable ? onClick : undefined}
      className={`group flex items-center gap-3 p-3 sm:p-5 bg-white border rounded-2xl shadow-sm transition-all duration-200 ${
        clickable ? "cursor-pointer hover:-translate-y-1 hover:shadow-lg hover:border-gray-300" : disabled ? "cursor-not-allowed opacity-80" : ""
      } ${selected ? "border-indigo-300 ring-1 ring-indigo-100" : ""}`}
    >
      <div className={`p-2 sm:p-3 rounded-xl shrink-0 transition-transform duration-200 group-hover:scale-110 ${bg}`}>{icon}</div>
      <div>
        <p className="text-xs sm:text-sm text-gray-500">{label}</p>
        <p className="text-lg sm:text-xl font-semibold text-gray-900">{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}
