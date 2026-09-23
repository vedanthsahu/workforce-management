"use client";

import { Layers, CheckCircle, PauseCircle, Armchair } from "lucide-react";

export type FloorStatusFilter = "ACTIVE" | "INACTIVE" | null;

type Props = {
  stats: {
    total_floors: number;
    active_floors: number;
    inactive_floors: number;
    total_seats: number;
  } | null;
  statusFilter?: FloorStatusFilter;
  onStatusFilterChange?: (filter: FloorStatusFilter) => void;
};

type StatProps = {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: string;
  sub: string;
  selected?: boolean;
  onClick?: () => void;
};

export default function FloorCards({ stats, statusFilter = null, onStatusFilterChange }: Props) {
  if (!stats) {
    return null;
  }

  const toggle = (value: "ACTIVE" | "INACTIVE") => {
    onStatusFilterChange?.(statusFilter === value ? null : value);
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <Stat
        icon={<Layers className="text-blue-600" />}
        bg="bg-blue-100"
        label="Total Floors"
        value={stats.total_floors.toString()}
        sub="Across all buildings"
        onClick={onStatusFilterChange ? () => onStatusFilterChange(null) : undefined}
      />
      <Stat
        icon={<CheckCircle className="text-green-600" />}
        bg="bg-green-100"
        label="Active Floors"
        value={stats.active_floors.toString()}
        sub="Currently active"
        selected={statusFilter === "ACTIVE"}
        onClick={onStatusFilterChange ? () => toggle("ACTIVE") : undefined}
      />
      <Stat
        icon={<PauseCircle className="text-orange-600" />}
        bg="bg-orange-100"
        label="Inactive Floors"
        value={stats.inactive_floors.toString()}
        sub="Currently inactive"
        selected={statusFilter === "INACTIVE"}
        onClick={onStatusFilterChange ? () => toggle("INACTIVE") : undefined}
      />
      <Stat
        icon={<Armchair className="text-purple-600" />}
        bg="bg-purple-100"
        label="Total Spaces"
        value={stats.total_seats.toString()}
        sub="Across all floors"
      />
    </div>
  );
}

function Stat({ icon, bg, label, value, sub, selected, onClick }: StatProps) {
  return (
    <div
      onClick={onClick}
      className={`group flex items-center gap-3 p-3 sm:p-5 bg-white border rounded-2xl shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-gray-300 ${
        onClick ? "cursor-pointer" : ""
      } ${selected ? "border-2 border-blue-500 ring-2 ring-blue-100 shadow-md" : ""}`}
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
