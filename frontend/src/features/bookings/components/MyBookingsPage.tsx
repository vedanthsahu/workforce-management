"use client";

import { useState, type ReactNode } from "react";
import {
  RefreshCw, Plus, Calendar, CheckCircle2, Users, UserCheck,
  Search,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBookings } from "../hooks/useBookings";
import { usePermissions } from "@/features/dashboard/hooks/usePermissions";
import { useBookingActions } from "../hooks/useBookingActions";
import { BookingCard } from "./BookingCard";
import { CancelBookingDialog } from "./CancelBookingDialog";
import { MyBookingsSkeleton, MyBookingsStatsSkeleton } from "./MyBookingsSkeleton";
import { TABS } from "../utils/constants";
import { isUpcoming, isToday, sortByDate } from "../utils/bookingHelpers";
import type { Booking, BookingSummary, BookingTab } from "../types/bookings.types";

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

function BookingStatsCards({ summary, delegatedCount, showOnBehalf }: { summary: BookingSummary; delegatedCount: number; showOnBehalf: boolean }) {
  const teamInOffice = summary.teamInOffice ?? 0;
  return (
    <div className={cn("grid gap-3 sm:gap-4", showOnBehalf ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2 lg:grid-cols-3")}>
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
      {showOnBehalf && (
        <StatCard
          label="Delegated"
          value={delegatedCount}
          subLabel="Booked by you for others"
          icon={<UserCheck className="size-5 text-violet-600" />}
          iconBg="bg-violet-100"
          accentBorder="border-l-violet-500"
        />
      )}
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type BookingStatus  = "all" | "confirmed" | "pending";
type BfsBookingType = "all" | "employees" | "guests" | "visits";

// ── Shared filter chip ────────────────────────────────────────────────────────

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-[12.5px] font-medium border transition-colors whitespace-nowrap",
        active
          ? "bg-indigo-50 border-indigo-200 text-indigo-600 font-semibold"
          : "bg-white border-[#EBEBF5] text-gray-500 hover:border-gray-300 hover:text-gray-700",
      )}
    >
      {label}
    </button>
  );
}

// ── My Bookings toolbar ───────────────────────────────────────────────────────

function MyBookingsToolbar({
  activeTab,
  onTabChange,
  search,
  onSearchChange,
  status,
  onStatusChange,
}: {
  activeTab: BookingTab;
  onTabChange: (t: BookingTab) => void;
  search: string;
  onSearchChange: (v: string) => void;
  status: BookingStatus;
  onStatusChange: (s: BookingStatus) => void;
}) {
  const statusOptions: { label: string; value: BookingStatus }[] = [
    { label: "All",       value: "all"       },
    { label: "Confirmed", value: "confirmed" },
    { label: "Pending",   value: "pending"   },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap mb-4">
      {/* Sub-tabs — left */}
      <div className="flex gap-1 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors whitespace-nowrap",
              activeTab === tab.id
                ? "bg-indigo-50 text-indigo-600 font-semibold"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-700",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Status chips */}
        <div className="flex gap-1.5">
          {statusOptions.map((o) => (
            <FilterChip
              key={o.value}
              label={o.label}
              active={status === o.value}
              onClick={() => onStatusChange(o.value)}
            />
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-gray-50 border border-[#EBEBF5] rounded-lg px-3 py-2 w-[200px]">
          <Search className="size-3.5 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search seat, location…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="border-none bg-transparent text-[13px] text-[#0f172a] outline-none w-full placeholder:text-gray-400"
          />
        </div>
      </div>
    </div>
  );
}

// ── Booked For Someone toolbar ────────────────────────────────────────────────

function BfsToolbar({
  subTab,
  onSubTabChange,
  search,
  onSearchChange,
  bookingType,
  onBookingTypeChange,
}: {
  subTab: "upcoming" | "past" | "cancelled";
  onSubTabChange: (t: "upcoming" | "past" | "cancelled") => void;
  search: string;
  onSearchChange: (v: string) => void;
  bookingType: BfsBookingType;
  onBookingTypeChange: (t: BfsBookingType) => void;
}) {
  const typeOptions: { label: string; value: BfsBookingType; hint?: string }[] = [
    { label: "All",       value: "all"       },
    { label: "Employees", value: "employees" },
    { label: "Guests",    value: "guests"    },
    { label: "Visits",    value: "visits",   hint: "Guest visits only" },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap border-b border-[#EBEBF5] mb-4">
      {/* Sub-tabs — left */}
      <div className="flex">
        {(["upcoming", "past", "cancelled"] as const).map((t) => (
          <button
            key={t}
            onClick={() => onSubTabChange(t)}
            className={cn(
              "px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
              subTab === t
                ? "border-indigo-600 text-indigo-600 font-semibold"
                : "border-transparent text-gray-500 hover:text-gray-700",
            )}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 ml-auto pb-2">
        {/* Type chips with tooltip support */}
        <div className="flex gap-1.5">
          {typeOptions.map((o) => (
            <div key={o.value} className="relative group">
              <FilterChip
                label={o.label}
                active={bookingType === o.value}
                onClick={() => onBookingTypeChange(o.value)}
              />
              {/* Tooltip — shown only for chips that have a hint */}
              {o.hint && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex items-center whitespace-nowrap bg-gray-800 text-white text-[10.5px] font-medium px-2 py-1 rounded-md shadow-md pointer-events-none z-50">
                  {o.hint}
                  <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-gray-50 border border-[#EBEBF5] rounded-lg px-3 py-2 w-[200px]">
          <Search className="size-3.5 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search person or location…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="border-none bg-transparent text-[13px] text-[#0f172a] outline-none w-full placeholder:text-gray-400"
          />
        </div>


      </div>
    </div>
  );
}

// ── Filter helpers ────────────────────────────────────────────────────────────

function applyMyBookingFilters(
  bookings: Booking[],
  search: string,
  status: BookingStatus,
): Booking[] {
  return bookings.filter((b) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matches =
        b.location.toLowerCase().includes(q) ||
        b.floor.toLowerCase().includes(q) ||
        b.seat.toLowerCase().includes(q) ||
        (b.bookedForName?.toLowerCase().includes(q) ?? false) ||
        (b.bookedByName?.toLowerCase().includes(q) ?? false);
      if (!matches) return false;
    }
    if (status !== "all" && b.status !== status) return false;
    return true;
  });
}

function applyBfsFilters(
  bookings: Booking[],
  search: string,
  bookingType: BfsBookingType,
): Booking[] {
  return bookings.filter((b) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matches =
        b.location.toLowerCase().includes(q) ||
        (b.bookedForName?.toLowerCase().includes(q) ?? false) ||
        (b.guestEmail?.toLowerCase().includes(q) ?? false);
      if (!matches) return false;
    }
    // "employees" — only employee-type bookings
    if (bookingType === "employees" && b.bookingType !== "employee") return false;
    // "guests" — only regular guest bookings (not visits)
    if (bookingType === "guests" && b.bookingType !== "guest") return false;
    // "visits" — only visit-type bookings (guest sub-type)
    if (bookingType === "visits" && b.bookingType !== "visit") return false;
    return true;
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MyBookingsPage() {
  const { canAny } = usePermissions();
  const canBookForSomeone = canAny("booking:book_for_employee", "booking:book_for_guest");

  const {
    displayedBookings,
    delegatedBookings,
    cancelledDelegatedBookings,
    summary,
    activeTab,
    isLoading,
    error,
    setActiveTab,
    handleCancelBooking,
    handleCancelDelegatedBooking,
    refreshBookings,
  } = useBookings();

  const {
    cancelTarget, setCancelTarget, clearCancelTarget, cancelMode,
    handleConfirmCancel, handleModify,
    handleModifyVisit, handleAddBooking,
    handleCancelVisit, handleCancelBookingOnly,
  } = useBookingActions({ handleCancelBooking, handleCancelDelegatedBooking });

  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "bookedForSomeone" ? "bookedForSomeone" : "myBookings";
  const [topTab, setTopTabState]  = useState<"myBookings" | "bookedForSomeone">(initialTab);
  const setTopTab = (tab: "myBookings" | "bookedForSomeone") => {
    setTopTabState(tab);
    const url = tab === "bookedForSomeone" ? "/mybookings?tab=bookedForSomeone" : "/mybookings";
    router.replace(url);
  };
  const [bfsSubTab, setBfsSubTab] = useState<"upcoming" | "past" | "cancelled">("upcoming");

  // My Bookings filters
  const [mySearch, setMySearch] = useState("");
  const [myStatus, setMyStatus] = useState<BookingStatus>("all");

  // Booked For Someone filters
  const [bfsSearch, setBfsSearch]           = useState("");
  const [bfsBookingType, setBfsBookingType] = useState<BfsBookingType>("all");

  // ── Apply filters ──────────────────────────────────────────────────────────
  const filteredBookings = applyMyBookingFilters(displayedBookings, mySearch, myStatus);

  const upcomingCards = sortByDate(
    filteredBookings.filter((b) => b.status !== "cancelled" && isUpcoming(b.date)),
    true,
  );
  const pastCards = sortByDate(
    filteredBookings.filter((b) => b.status !== "cancelled" && !isUpcoming(b.date)),
    false,
  );
  const sortedDisplayed = sortByDate(
    filteredBookings,
    activeTab !== "past" && activeTab !== "cancelled",
  );

  const bfsBaseFiltered = bfsSubTab === "cancelled"
    ? cancelledDelegatedBookings
    : delegatedBookings.filter((b) => {
        if (bfsSubTab === "upcoming") return isUpcoming(b.date) && b.status !== "cancelled";
        if (bfsSubTab === "past")     return !isUpcoming(b.date) && b.status !== "cancelled";
        return true;
      });
  const filteredDelegated = applyBfsFilters(bfsBaseFiltered, bfsSearch, bfsBookingType)
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());

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
          {isLoading ? <MyBookingsStatsSkeleton /> : <BookingStatsCards summary={summary} delegatedCount={delegatedBookings.length} showOnBehalf={canBookForSomeone} />}

          {/* Top-level tabs — "Booked For Someone" only visible with permission */}
          <div className="flex border-b border-[#EBEBF5] overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            {(["myBookings", ...(canBookForSomeone ? ["bookedForSomeone"] : [])] as ("myBookings" | "bookedForSomeone")[]).map((t) => (
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
              <MyBookingsToolbar
                activeTab={activeTab}
                onTabChange={setActiveTab}
                search={mySearch}
                onSearchChange={setMySearch}
                status={myStatus}
                onStatusChange={setMyStatus}
              />

              <div className="flex flex-col gap-3.5">
                {isLoading && <MyBookingsSkeleton />}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 sm:px-5 py-4 text-red-500 text-[13px]">{error}</div>
                )}

                {!isLoading && !error && activeTab === "upcoming" && (
                  <>
                    {upcomingCards.length > 0 ? (
                      upcomingCards.map((booking) => (
                        <BookingCard
                          key={booking.id}
                          booking={booking}
                          onCancelClick={setCancelTarget}
                          onModifyClick={handleModify}
                          onModifyVisit={handleModifyVisit}

                          onAddBooking={handleAddBooking}
                          onCancelVisit={handleCancelVisit}
                          onCancelBooking={handleCancelBookingOnly}
                          showActions={!isToday(booking.date)}
                        />
                      ))
                    ) : (
                      <div className="text-center py-16 text-gray-400 text-[13.5px] bg-white rounded-xl border border-dashed border-gray-200">
                        No upcoming bookings found.
                      </div>
                    )}
                    {pastCards.length > 0 && (
                      <>
                        <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400 mt-2">Past Bookings</p>
                        {pastCards.map((booking) => (
                          <BookingCard
                            key={booking.id}
                            booking={booking}
                            onCancelClick={setCancelTarget}
                            onModifyClick={handleModify}
                            showActions={false}
                          />
                        ))}
                      </>
                    )}
                  </>
                )}

                {!isLoading && !error && activeTab !== "upcoming" && (
                  sortedDisplayed.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 text-[13.5px] bg-white rounded-xl border border-dashed border-gray-200">
                      No {activeTab} bookings found.
                    </div>
                  ) : (
                    sortedDisplayed.map((booking) => (
                      <BookingCard
                        key={booking.id}
                        booking={booking}
                        onCancelClick={setCancelTarget}
                        onModifyClick={handleModify}
                        showActions={activeTab !== "past" && activeTab !== "cancelled"}
                      />
                    ))
                  )
                )}
              </div>
            </>
          )}

          {/* ══ BOOKED FOR SOMEONE PANEL ══ */}
          {topTab === "bookedForSomeone" && (
            <>
              <BfsToolbar
                subTab={bfsSubTab}
                onSubTabChange={setBfsSubTab}
                search={bfsSearch}
                onSearchChange={setBfsSearch}
                bookingType={bfsBookingType}
                onBookingTypeChange={setBfsBookingType}
              />

              <div className="flex flex-col gap-3.5">
                {isLoading ? (
                  <MyBookingsSkeleton />
                ) : filteredDelegated.length === 0 ? (
                  <div className="text-center py-16 text-gray-400 text-[13.5px] bg-white rounded-xl border border-dashed border-gray-200">
                    No {bfsSubTab} delegated bookings found.
                  </div>
                ) : (
                  filteredDelegated.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      onCancelClick={setCancelTarget}
                      onModifyClick={handleModify}
                      onModifyVisit={handleModifyVisit}
                      onAddBooking={handleAddBooking}
                      onCancelBooking={handleCancelBookingOnly}
                      onCancelVisit={handleCancelVisit}
                      showActions={bfsSubTab === "upcoming" && !isToday(booking.date)}
                      variant="delegated"
                    />
                  ))
                )}
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
        cancelMode={cancelMode}
        onConfirm={handleConfirmCancel}
        onClose={clearCancelTarget}
      />
    </>
  );
}