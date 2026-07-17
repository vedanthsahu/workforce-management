"use client";

import { CalendarDays, CheckCircle2, Clock, XCircle, UserRound } from "lucide-react";

type StatProps = {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: number;
};

export interface BookingStats {
  todays_bookings: number;
  checked_in: number;
  not_checked_in: number;
  cancelled: number;
  guests: number;
}

export default function BookingStatCards({ stats }: { stats: BookingStats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
      <Stat
        icon={<CalendarDays className="text-indigo-600" />}
        bg="bg-indigo-100"
        label="Bookings"
        value={stats.todays_bookings}
      />
      <Stat
        icon={<CheckCircle2 className="text-green-600" />}
        bg="bg-green-100"
        label="Checked In"
        value={stats.checked_in}
      />
      <Stat
        icon={<Clock className="text-orange-600" />}
        bg="bg-orange-100"
        label="Not Checked In"
        value={stats.not_checked_in}
      />
      <Stat
        icon={<XCircle className="text-red-600" />}
        bg="bg-red-100"
        label="Cancelled"
        value={stats.cancelled}
      />
      <Stat
        icon={<UserRound className="text-blue-600" />}
        bg="bg-blue-100"
        label="Guests"
        value={stats.guests}
      />
    </div>
  );
}

function Stat({ icon, bg, label, value }: StatProps) {
  return (
    <div className="flex items-center gap-3 p-3 sm:p-5 bg-white border rounded-2xl shadow-sm">
      <div className={`p-2 sm:p-3 rounded-xl shrink-0 ${bg}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">{label}</p>
        <p className="text-lg sm:text-xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
