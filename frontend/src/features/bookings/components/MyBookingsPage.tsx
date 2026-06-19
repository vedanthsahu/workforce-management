"use client";

import { useState, type ReactNode } from "react";
import { RefreshCw, Plus, Calendar, CheckCircle2, Users, UserCheck, Search, SlidersHorizontal, Pencil, X as XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBookings } from "../hooks/useBookings";
import { useBookingActions } from "../hooks/useBookingActions";
import { BookingCard } from "./BookingCard";
import { CancelBookingDialog } from "./CancelBookingDialog";
import { TABS, BOOKING_TYPE_STYLES } from "../utils/constants";
import { isUpcoming, isToday, sortByDate } from "../utils/bookingHelpers";
import type { BookingSummary } from "../types/bookings.types";

// ── Stat card ─────────────────────────────────────────────────────────────────

type StatCardProps = {
  label: string;
  value: number | string;
  subLabel?: string;
  icon: ReactNode;
  iconBg: string;
  accentBorder: string;
};

function StatCard({ label, value, subLabel, icon, iconBg, accentBorder }: StatCardProps) {
  return (
    <div className={cn(
      "bg-white border border-[#EBEBF5] rounded-xl px-4 py-4 flex flex-col gap-2.5 min-w-[160px]",
      "hover:shadow-md transition-shadow duration-200 border-l-[3px]",
      accentBorder,
    )}>
      <div className="flex items-center justify-between">
        <p className="text-[10.5px] font-semibold tracking-wide uppercase text-gray-400">{label}</p>
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-[24px] font-extrabold text-[#0f172a] leading-none">{value}</p>
        {subLabel && (
          <p className="text-[10.5px] text-gray-400 mt-1 truncate">{subLabel}</p>
        )}
      </div>
    </div>
  );
}

function BookingStatsCards({ summary }: { summary: BookingSummary }) {
  const teamInOffice = summary.teamInOffice ?? 0;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <StatCard
        label="Upcoming"
        value={summary.upcomingCount}
        subLabel={summary.nextBookingDate ?? undefined}
        icon={<Calendar className="size-5 text-blue-600" />}
        iconBg="bg-blue-100"
        accentBorder="border-l-blue-500"
      />
      <StatCard
        label="Completed"
        value={summary.completedThisMonth}
        subLabel={`${summary.daysInOffice} days in office`}
        icon={<CheckCircle2 className="size-5 text-emerald-600" />}
        iconBg="bg-emerald-100"
        accentBorder="border-l-emerald-500"
      />
      <StatCard
        label="Team today"
        value={teamInOffice}
        subLabel={teamInOffice === 1 ? "1 teammate present" : `${teamInOffice} teammates present`}
        icon={<Users className="size-5 text-amber-600" />}
        iconBg="bg-amber-100"
        accentBorder="border-l-amber-500"
      />
      <StatCard
        label="On behalf"
        value={0}
        subLabel="Booked for you by others"
        icon={<UserCheck className="size-5 text-violet-600" />}
        iconBg="bg-violet-100"
        accentBorder="border-l-violet-500"
      />
    </div>
  );
}

// ── Search bar ────────────────────────────────────────────────────────────────

function SearchToolbar({ search, onSearchChange }: { search: string; onSearchChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2.5 flex-wrap">
      <div className="flex items-center gap-2 bg-gray-50 border border-[#EBEBF5] rounded-lg px-3 py-2 min-w-[220px] flex-1 sm:flex-none sm:max-w-[280px]">
        <Search className="size-3.5 text-gray-400 shrink-0" />
        <input
          type="text"
          placeholder="Search by seat, location or person…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="border-none bg-transparent text-[13px] text-[#0f172a] outline-none w-full placeholder:text-gray-400"
        />
      </div>
      <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-50 border border-[#EBEBF5] text-[13px] font-medium text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors">
        <SlidersHorizontal className="size-3.5" />
        Filters
      </button>
    </div>
  );
}

// ── Static "Booked For Someone" card ──────────────────────────────────────────

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

type StaticBfsCardProps = {
  office: string;
  floor: string;
  date: string;
  statusLabel: string;
  typeBadge: string;
  personLabel: string;
  personName: string;
  personRole: string;
  personColor: string;
  hostName?: string;
  hostRole?: string;
  hostColor?: string;
  bookingId: string;
  bookedOn: string;
};

function StaticBfsCard({ office, floor, date, statusLabel, typeBadge, personLabel, personName, personRole, personColor, hostName, hostRole, hostColor, bookingId, bookedOn }: StaticBfsCardProps) {
  const typeStyle = BOOKING_TYPE_STYLES[typeBadge] ?? BOOKING_TYPE_STYLES.self;
  return (
    <div className="bg-white border border-[#EBEBF5] rounded-2xl hover:shadow-md hover:border-gray-200 transition-all duration-200 overflow-hidden">
      <div className="grid grid-cols-[52px_1fr] sm:grid-cols-[52px_1.7fr_1.1fr_auto] items-center gap-4 sm:gap-6 p-4 sm:px-5 sm:py-[18px]">

        {/* Icon */}
        <div className="w-[52px] h-[52px] rounded-[13px] bg-orange-100 flex items-center justify-center shrink-0">
          <span className="text-2xl leading-none" role="img" aria-label="Office building">🏢</span>
        </div>

        {/* Main info */}
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-[#0f172a] truncate">{office}</p>
          <p className="text-[12px] text-gray-500 mt-0.5">{floor}</p>
          <div className="flex items-center gap-1.5 mt-1.5 text-[12px] text-gray-500">
            <Calendar className="size-3 text-gray-400 shrink-0" />
            <span>{date}</span>
          </div>
          <div className="flex gap-1.5 flex-wrap mt-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E8F5E9] text-[#2E7D32]">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />{statusLabel}
            </span>
            <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold", typeStyle.bg, typeStyle.text)}>
              {typeStyle.label}
            </span>
          </div>
        </div>

        {/* Booked for */}
        <div className="hidden sm:block min-w-0">
          <p className="text-[10px] font-semibold tracking-wider uppercase text-gray-400 mb-2">{personLabel}</p>
          <div className="flex items-center gap-2">
            <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0", personColor)}>
              {getInitials(personName)}
            </div>
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold text-[#1A1A2E] truncate">{personName}</p>
              <p className="text-[11px] text-gray-400 truncate">{personRole}</p>
            </div>
          </div>
          {hostName && hostColor && (
            <div className="flex items-center gap-2 mt-2">
              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0", hostColor)}>
                {getInitials(hostName)}
              </div>
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-[#1A1A2E] truncate">{hostName}</p>
                <p className="text-[11px] text-gray-400 truncate">{hostRole}</p>
              </div>
            </div>
          )}
        </div>

        {/* Meta + Actions — right aligned */}
        <div className="hidden sm:flex flex-col items-end text-right">
          <p className="text-[10px] font-semibold tracking-wider uppercase text-gray-400 mb-1">Booking ID</p>
          <p className="text-[11px] text-gray-500 font-mono mb-2.5">{bookingId}</p>
          <p className="text-[10px] font-semibold tracking-wider uppercase text-gray-400 mb-1">Booked on</p>
          <p className="text-[12px] text-gray-500">{bookedOn}</p>
          <div className="flex gap-2 mt-3">
            <button className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 hover:border-blue-300 hover:text-blue-600 rounded-lg px-3 py-1.5 transition-all">
              <Pencil className="size-3" />
              Modify
            </button>
            <button className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-red-500 bg-white hover:bg-red-50 border border-red-200 hover:border-red-300 rounded-lg px-3 py-1.5 transition-all">
              <XIcon className="size-3" />
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Mobile meta + actions */}
      <div className="sm:hidden px-4 pb-4">
        <div className="flex items-center gap-4 text-[11px] text-gray-400">
          <span className="font-mono">{bookingId}</span>
          <span>·</span>
          <span>{bookedOn}</span>
        </div>
        <div className="flex gap-2 mt-2.5">
          <button className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            <Pencil className="size-3" />
            Modify
          </button>
          <button className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-red-500 bg-white hover:bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
            <XIcon className="size-3" />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MyBookingsPage() {
  const {
    displayedBookings,
    delegatedBookings,
    summary,
    activeTab,
    isLoading,
    error,
    setActiveTab,
    handleCancelBooking,
    refreshBookings,
  } = useBookings();

  const { cancelTarget, setCancelTarget, handleConfirmCancel, handleModify } =
    useBookingActions({ handleCancelBooking });

  const router = useRouter();
  const [search, setSearch] = useState("");
  const [topTab, setTopTab] = useState<"myBookings" | "bookedForSomeone">("myBookings");
  const [bfsSubTab, setBfsSubTab] = useState<"upcoming" | "past" | "cancelled">("upcoming");
  const [bfsFilter, setBfsFilter] = useState<"all" | "employees" | "guests">("all");

  const filtered = search.trim()
    ? displayedBookings.filter((b) => {
        const q = search.toLowerCase();
        return (
          b.location.toLowerCase().includes(q) ||
          b.floor.toLowerCase().includes(q) ||
          b.seat.toLowerCase().includes(q) ||
          (b.bookedForName?.toLowerCase().includes(q) ?? false)
        );
      })
    : displayedBookings;

  const upcomingCards = sortByDate(
    filtered.filter((b) => b.status !== "cancelled" && isUpcoming(b.date)),
    true,
  );
  const pastCards = sortByDate(
    filtered.filter((b) => b.status !== "cancelled" && !isUpcoming(b.date)),
    false,
  );
  const sortedDisplayed = sortByDate(
    filtered,
    activeTab !== "past" && activeTab !== "cancelled",
  );

  return (
    <>
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[#F7F8FC]">

        {/* Sticky header */}
        <div className="shrink-0 bg-[#F7F8FC] px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 flex flex-col gap-4 sm:gap-5">

          {/* Title + actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
            <div>
              <h1 className="text-[18px] sm:text-[20px] font-bold text-[#0f172a] leading-tight">
                My Bookings
              </h1>
              <p className="text-[12px] sm:text-[12.5px] text-gray-400 mt-0.5">
                View and manage your seat reservations
              </p>
            </div>
            <div className="flex gap-2.5 items-center">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 text-gray-400"
                onClick={refreshBookings}
              >
                <RefreshCw className="size-3.5" />
              </Button>
              <Button
                size="sm"
                className="h-8 flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white text-[12.5px] font-semibold gap-1.5"
                onClick={() => router.push("/book")}
              >
                <Plus className="size-4" />
                New Booking
              </Button>
            </div>
          </div>

          {/* Stats */}
          <BookingStatsCards summary={summary} />

          {/* Top-level tabs: My Bookings | Booked For Someone */}
          <div className="flex border-b border-[#EBEBF5] overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            {(["myBookings", "bookedForSomeone"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTopTab(t)}
                className={cn(
                  "px-4 sm:px-5 py-2.5 text-[13.5px] font-medium border-b-2 -mb-px transition-colors duration-150 whitespace-nowrap shrink-0",
                  topTab === t
                    ? "border-indigo-600 text-indigo-600 font-semibold"
                    : "border-transparent text-gray-500 hover:text-gray-700",
                )}
              >
                {t === "myBookings" ? "My Bookings" : "Booked For Someone"}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">

          {/* ══ MY BOOKINGS PANEL ══ */}
          {topTab === "myBookings" && (
            <>
              {/* Sub-tabs */}
              <div className="flex items-center gap-2.5 mb-4 flex-wrap">
                <div className="flex gap-1">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors",
                        activeTab === tab.id
                          ? "bg-indigo-50 text-indigo-600 font-semibold"
                          : "text-gray-500 hover:bg-gray-100 hover:text-gray-700",
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="ml-auto">
                  <SearchToolbar search={search} onSearchChange={setSearch} />
                </div>
              </div>

              <div className="flex flex-col gap-3.5">
                {isLoading && (
                  <div className="text-center py-12 text-gray-400 text-[13.5px]">Loading bookings…</div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 sm:px-5 py-4 text-red-500 text-[13px]">{error}</div>
                )}

                {!isLoading && !error && activeTab === "upcoming" && (
                  <>
                    {upcomingCards.length > 0 ? (
                      upcomingCards.map((booking) => (
                        <BookingCard key={booking.id} booking={booking} onCancelClick={setCancelTarget} onModifyClick={handleModify} showActions={!isToday(booking.date)} />
                      ))
                    ) : (
                      <div className="text-center py-16 text-gray-400 text-[13.5px] bg-white rounded-xl border border-dashed border-gray-200">No upcoming bookings found.</div>
                    )}
                    {pastCards.length > 0 && (
                      <>
                        <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400 mt-2">Past Bookings</p>
                        {pastCards.map((booking) => (
                          <BookingCard key={booking.id} booking={booking} onCancelClick={setCancelTarget} onModifyClick={handleModify} showActions={false} />
                        ))}
                      </>
                    )}
                  </>
                )}

                {!isLoading && !error && activeTab !== "upcoming" && (
                  sortedDisplayed.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 text-[13.5px] bg-white rounded-xl border border-dashed border-gray-200">No {activeTab} bookings found.</div>
                  ) : (
                    sortedDisplayed.map((booking) => (
                      <BookingCard key={booking.id} booking={booking} onCancelClick={setCancelTarget} onModifyClick={handleModify} showActions={activeTab !== "past" && activeTab !== "cancelled"} />
                    ))
                  )
                )}
              </div>
            </>
          )}

          {/* ══ BOOKED FOR SOMEONE PANEL ══ */}
          {topTab === "bookedForSomeone" && (
            <>
              {/* Sub-tabs + filter chips */}
              <div className="flex border-b border-[#EBEBF5] mb-4">
                {(["upcoming", "past", "cancelled"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setBfsSubTab(t)}
                    className={cn(
                      "px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                      bfsSubTab === t
                        ? "border-indigo-600 text-indigo-600 font-semibold"
                        : "border-transparent text-gray-500 hover:text-gray-700",
                    )}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
                <div className="flex gap-1.5 ml-auto items-center">
                  {(["all", "employees", "guests"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setBfsFilter(f)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-[12.5px] font-medium border transition-colors",
                        bfsFilter === f
                          ? "bg-indigo-50 border-indigo-100 text-indigo-600 font-semibold"
                          : "bg-white border-[#EBEBF5] text-gray-500 hover:border-gray-300",
                      )}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic delegated booking cards */}
              <div className="flex flex-col gap-3.5">
                {(() => {
                  const filtered = delegatedBookings
                    .filter((b) => {
                      if (bfsSubTab === "upcoming") return isUpcoming(b.date) && b.status !== "cancelled";
                      if (bfsSubTab === "past") return !isUpcoming(b.date) && b.status !== "cancelled";
                      if (bfsSubTab === "cancelled") return b.status === "cancelled";
                      return true;
                    })
                    .filter((b) => {
                      if (bfsFilter === "employees") return b.bookingType === "employee";
                      if (bfsFilter === "guests") return b.bookingType === "guest";
                      return true;
                    });

                  if (isLoading) return <div className="text-center py-12 text-gray-400 text-[13.5px]">Loading bookings…</div>;

                  if (filtered.length === 0) return (
                    <div className="text-center py-16 text-gray-400 text-[13.5px] bg-white rounded-xl border border-dashed border-gray-200">
                      No {bfsSubTab} delegated bookings found.
                    </div>
                  );

                  return filtered.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      onCancelClick={setCancelTarget}
                      onModifyClick={handleModify}
                      showActions={bfsSubTab === "upcoming" && !isToday(booking.date)}
                      variant="delegated"
                    />
                  ));
                })()}
              </div>
            </>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 flex-wrap mt-6 px-4 sm:px-5 py-3.5 bg-gray-50 border border-[#EBEBF5] rounded-xl">
            <span className="text-[12px] font-semibold text-gray-500">Status Legend</span>
            <span className="flex items-center gap-1.5 text-[12px] text-gray-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />Confirmed
            </span>
            <span className="flex items-center gap-1.5 text-[12px] text-gray-500">
              <span className="w-2 h-2 rounded-full bg-amber-500" />Pending
            </span>
            <span className="flex items-center gap-1.5 text-[12px] text-gray-500">
              <span className="w-2 h-2 rounded-full bg-red-500" />Cancelled
            </span>
            <span className="ml-auto text-[11px] text-gray-400">🕐 All times shown in your local time</span>
          </div>
        </div>
      </main>

      <CancelBookingDialog
        open={cancelTarget !== null}
        booking={cancelTarget}
        onConfirm={handleConfirmCancel}
        onClose={() => setCancelTarget(null)}
      />
    </>
  );
}