"use client";

import { CalendarDays, CheckCircle2, ClipboardCheck, Clock, XCircle, UserRound } from "lucide-react";

type StatProps = {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: number;
  /** Shows "Coming soon" in place of the count and forces the card
   * non-interactive -- no onClick, no hover/selected state, regardless of
   * what's passed for those. */
  comingSoon?: boolean;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
};

export interface BookingStats {
  todays_bookings: number;
  checked_in: number;
  /** Scheduled + Confirmed + Modified, i.e. everything not yet checked in.
   * Not a single BookingStatus value -- clicking it applies the synthetic
   * "Not Checked In" filter, which AdminBookingsPage.tsx's matchingItems
   * logic expands back into Scheduled-or-Confirmed-or-Modified. */
  not_checked_in: number;
  confirmed: number;
  cancelled: number;
  guests: number;
}

type Props = {
  stats: BookingStats;
  /** Which Search By tab is active ("Employee" or "Guest", appliedFilters.
   * bookingType) -- Guest keeps the original card order (Bookings, Checked
   * In, Not Checked In, Cancelled, Guests); Employee shows Bookings,
   * Confirmed, Cancelled, Checked In, Not Checked In. */
  bookingType?: string;
  /** Fires with the Status filter value to apply when a clickable card is
   * clicked (Bookings/Cancelled/Guests/Confirmed, and Checked In/Not
   * Checked In on the Guest tab -- on Employee those two are "Coming soon"
   * placeholders instead). */
  onFilterClick?: (status: string) => void;
  /** The currently-applied Status filter (appliedFilters.status) -- whichever
   * card maps to this value gets the selected-state highlight. */
  activeStatus?: string;
};

export default function BookingStatCards({ stats, bookingType, onFilterClick, activeStatus }: Props) {
  // Checked In/Not Checked In are only real, live counts on the Guest tab --
  // on Employee they stay "Coming soon" placeholders.
  const employeeComingSoon = bookingType === "Employee";

  const bookingsCard = (
    <Stat
      key="bookings"
      icon={<CalendarDays className="text-indigo-600" />}
      bg="bg-indigo-100"
      label="Bookings"
      value={stats.todays_bookings}
      disabled={stats.todays_bookings === 0}
      onClick={onFilterClick && stats.todays_bookings > 0 ? () => onFilterClick("All") : undefined}
    />
  );
  const checkedInCard = (
    <Stat
      key="checked-in"
      icon={<CheckCircle2 className="text-green-600" />}
      bg="bg-green-100"
      label="Checked In"
      value={stats.checked_in}
      comingSoon={employeeComingSoon}
      disabled={stats.checked_in === 0}
      onClick={onFilterClick && stats.checked_in > 0 ? () => onFilterClick("Checked In") : undefined}
      selected={activeStatus === "Checked In"}
    />
  );
  const notCheckedInCard = (
    <Stat
      key="not-checked-in"
      icon={<Clock className="text-orange-600" />}
      bg="bg-orange-100"
      label="Not Checked In"
      value={stats.not_checked_in}
      comingSoon={employeeComingSoon}
      disabled={stats.not_checked_in === 0}
      onClick={onFilterClick && stats.not_checked_in > 0 ? () => onFilterClick("Not Checked In") : undefined}
      selected={activeStatus === "Not Checked In"}
    />
  );
  const cancelledCard = (
    <Stat
      key="cancelled"
      icon={<XCircle className="text-red-600" />}
      bg="bg-red-100"
      label="Cancelled"
      value={stats.cancelled}
      disabled={stats.cancelled === 0}
      onClick={onFilterClick && stats.cancelled > 0 ? () => onFilterClick("Cancelled") : undefined}
      selected={activeStatus === "Cancelled"}
    />
  );
  const guestsCard = (
    <Stat
      key="guests"
      icon={<UserRound className="text-blue-600" />}
      bg="bg-blue-100"
      label="Guests"
      value={stats.guests}
      disabled={stats.guests === 0}
      onClick={onFilterClick && stats.guests > 0 ? () => onFilterClick("All") : undefined}
    />
  );
  const confirmedCard = (
    <Stat
      key="confirmed"
      icon={<ClipboardCheck className="text-blue-600" />}
      bg="bg-blue-100"
      label="Confirmed"
      value={stats.confirmed}
      disabled={stats.confirmed === 0}
      onClick={onFilterClick && stats.confirmed > 0 ? () => onFilterClick("Confirmed") : undefined}
      selected={activeStatus === "Confirmed"}
    />
  );

  const cards =
    bookingType === "Employee"
      ? [bookingsCard, confirmedCard, cancelledCard, checkedInCard, notCheckedInCard]
      : [bookingsCard, checkedInCard, notCheckedInCard, cancelledCard, guestsCard];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
      {cards}
    </div>
  );
}

function Stat({ icon, bg, label, value, comingSoon, onClick, selected, disabled }: StatProps) {
  const clickable = !comingSoon && !!onClick && !disabled;

  return (
    <div
      onClick={clickable ? onClick : undefined}
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
      className={`flex items-center gap-3 p-3 sm:p-5 bg-white border rounded-2xl shadow-sm transition-all duration-200 ease-out ${
        clickable
          ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.97] active:duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
          : comingSoon || disabled
            ? "cursor-not-allowed opacity-80"
            : ""
      } ${selected ? "border-2 border-blue-500 ring-2 ring-blue-100 shadow-md" : ""}`}
    >
      <div className={`p-2 sm:p-3 rounded-xl shrink-0 ${bg}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">{label}</p>
        {comingSoon ? (
          <p className="text-xs sm:text-sm font-medium text-gray-400 italic">Coming soon</p>
        ) : (
          <p className="text-lg sm:text-xl font-semibold text-gray-900">{value}</p>
        )}
      </div>
    </div>
  );
}
