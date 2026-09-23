"use client";

import {
  Grid2x2,
  CheckCircle,
  PauseCircle,
  Tag,
} from "lucide-react";

export type AmenitiesStatusFilter = "ACTIVE" | "INACTIVE" | null;

type StatProps = {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: string;
  sub: string;
  selected?: boolean;
  onClick?: () => void;
};

type Props = {
  stats: {
    total_amenities: number;
    active_amenities: number;
    inactive_amenities: number;
    assigned_amenities: number;
  } | null;
  statusFilter?: AmenitiesStatusFilter;
  onStatusFilterChange?: (filter: AmenitiesStatusFilter) => void;
};

export default function AmenitiesCards({
  stats,
  statusFilter = null,
  onStatusFilterChange,
}: Props) {
  if (!stats) return null;

  const toggle = (value: "ACTIVE" | "INACTIVE") => {
    onStatusFilterChange?.(statusFilter === value ? null : value);
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

      <Stat
        icon={
          <Grid2x2 className="text-blue-600" />
        }
        bg="bg-blue-100"
        label="Total Amenities"
        value={stats.total_amenities.toString()}
        sub="Across all tenants"
        onClick={onStatusFilterChange ? () => onStatusFilterChange(null) : undefined}
      />

      <Stat
        icon={
          <CheckCircle className="text-green-600" />
        }
        bg="bg-green-100"
        label="Active Amenities"
        value={stats.active_amenities.toString()}
        sub="Currently active"
        selected={statusFilter === "ACTIVE"}
        onClick={onStatusFilterChange ? () => toggle("ACTIVE") : undefined}
      />

      <Stat
        icon={
          <PauseCircle className="text-orange-600" />
        }
        bg="bg-orange-100"
        label="Inactive Amenities"
        value={stats.inactive_amenities.toString()}
        sub="Currently inactive"
        selected={statusFilter === "INACTIVE"}
        onClick={onStatusFilterChange ? () => toggle("INACTIVE") : undefined}
      />

      <Stat
        icon={<Tag className="text-purple-600" />}
        bg="bg-purple-100"
        label="Assigned To Spaces"
        value={stats.assigned_amenities.toString()}
        sub="Amenities in use"
      />
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
  onClick,
}: StatProps) {
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
