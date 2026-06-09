"use client";

import {
  Grid2x2,
  CheckCircle,
  PauseCircle,
  Tag,
} from "lucide-react";

type Props = {
  stats: {
    total_amenities: number;
    active_amenities: number;
    inactive_amenities: number;
    assigned_amenities: number;
  } | null;
};

export default function AmenitiesCards({
  stats,
}: Props) {
  if (!stats) return null;

  return (
  // <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">

      <Stat
        icon={
          <Grid2x2 className="text-blue-600" />
        }
        bg="bg-blue-100"
        label="Total Amenities"
        value={stats.total_amenities.toString()}
        sub="Across all tenants"
      />

      <Stat
        icon={
          <CheckCircle className="text-green-600" />
        }
        bg="bg-green-100"
        label="Active Amenities"
        value={stats.active_amenities.toString()}
        sub="Currently active"
      />

      <Stat
        icon={
          <PauseCircle className="text-orange-600" />
        }
        bg="bg-orange-100"
        label="Inactive Amenities"
        value={stats.inactive_amenities.toString()}
        sub="Currently inactive"
      />

      <Stat
        icon={<Tag className="text-purple-600" />}
        bg="bg-purple-100"
        label="Assigned To Seats"
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
}: any) {
  return (
    <div className="flex items-center gap-4 p-5 bg-white border rounded-2xl shadow-sm">

      <div
        className={`p-3 rounded-xl ${bg}`}
      >
        {icon}
      </div>

      <div>
        <p className="text-sm text-gray-500">
          {label}
        </p>

        <p className="text-xl font-semibold text-gray-900">
          {value}
        </p>

        <p className="text-xs text-gray-400 mt-1">
          {sub}
        </p>
      </div>

    </div>
  );
}