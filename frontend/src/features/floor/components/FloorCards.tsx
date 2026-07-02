"use client";

import { Layers, CheckCircle, PauseCircle, Armchair } from "lucide-react";

type Props = {
  stats: {
    total_floors: number;
    active_floors: number;
    inactive_floors: number;
    total_seats: number;
  } | null;
};

type StatProps = {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: string;
};

export default function FloorCards({ stats }: Props) {
  if (!stats) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <Stat icon={<Layers className="text-blue-600" />} bg="bg-blue-100" label="Total Floors" value={stats.total_floors.toString()} />
      <Stat icon={<CheckCircle className="text-green-600" />} bg="bg-green-100" label="Active Floors" value={stats.active_floors.toString()} />
      <Stat icon={<PauseCircle className="text-orange-600" />} bg="bg-orange-100" label="Inactive Floors" value={stats.inactive_floors.toString()} />
      <Stat icon={<Armchair className="text-purple-600" />} bg="bg-purple-100" label="Total Seats" value={stats.total_seats.toString()} />
    </div>
  );
}

function Stat({ icon, bg, label, value }: StatProps) {
  return (
    <div className="flex items-center gap-3 p-3 sm:p-5 bg-white border rounded-2xl shadow-sm">
      <div className={`p-2 sm:p-3 rounded-xl shrink-0 ${bg}`}>{icon}</div>
      <div>
        <p className="text-xs sm:text-sm text-gray-500">{label}</p>
        <p className="text-lg sm:text-xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
