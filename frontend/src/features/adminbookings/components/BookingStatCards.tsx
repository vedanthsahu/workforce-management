"use client";

import { CalendarDays, CheckCircle2, Clock, XCircle, UserRound } from "lucide-react";

type StatProps = {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: number;
  onClick?: () => void;
};

export interface BookingStats {
  todays_bookings: number;
  checked_in: number;
  not_checked_in: number;
  cancelled: number;
  guests: number;
}

type Props = {
  stats: BookingStats;
  /** Fires with the Status filter value to apply -- Checked In/Cancelled map
   * 1:1 onto BookingStatus; "Not Checked In" maps to "Confirmed" (the same
   * booking_status the backend already sums into not_checked_in below), so
   * the row count the table lands on always matches the number on the card. */
  onFilterClick?: (status: string) => void;
};

export default function BookingStatCards({ stats, onFilterClick }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
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
        onClick={onFilterClick ? () => onFilterClick("Checked In") : undefined}
      />
      <Stat
        icon={<Clock className="text-orange-600" />}
        bg="bg-orange-100"
        label="Not Checked In"
        value={stats.not_checked_in}
        onClick={onFilterClick ? () => onFilterClick("Confirmed") : undefined}
      />
      <Stat
        icon={<XCircle className="text-red-600" />}
        bg="bg-red-100"
        label="Cancelled"
        value={stats.cancelled}
        onClick={onFilterClick ? () => onFilterClick("Cancelled") : undefined}
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

function Stat({ icon, bg, label, value, onClick }: StatProps) {
  const clickable = !!onClick;

  return (
    <div
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      title={clickable ? `Filter bookings by ${label}` : undefined}
      className={`flex items-center gap-3 p-3 sm:p-5 bg-white border rounded-2xl shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md ${
        clickable
          ? "cursor-pointer active:translate-y-0 active:scale-[0.97] active:duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
          : ""
      }`}
    >
      <div className={`p-2 sm:p-3 rounded-xl shrink-0 ${bg}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">{label}</p>
        <p className="text-lg sm:text-xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
