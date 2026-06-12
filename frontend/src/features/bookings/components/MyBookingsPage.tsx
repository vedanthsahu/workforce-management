"use client";

import type { ReactNode } from "react";
import { RefreshCw, Plus, Calendar, CheckCircle2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBookings } from "../hooks/useBookings";
import { useBookingActions } from "../hooks/useBookingActions";
import { BookingCard } from "./BookingCard";
import { CancelBookingDialog } from "./CancelBookingDialog";
import { TABS } from "../utils/constants";
import { isUpcoming, isToday, sortByDate } from "../utils/bookingHelpers";
import type { BookingSummary } from "../types/bookings.types";

// ── Stat card ─────────────────────────────────────────────────────────────────

type StatCardProps = {
  label: string;
  value: number | string;
  subLabel?: string;
  icon: ReactNode;
  accentClass: string;
};

function StatCard({ label, value, subLabel, icon, accentClass }: StatCardProps) {
  return (
    <div className={cn(
      "flex-1 bg-white border border-[#EBEBF5] rounded-xl p-4 flex flex-col gap-1",
      "min-w-35 sm:min-w-40",
      "border-l-[3px]", accentClass,
    )}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 leading-tight">
          {label}
        </span>
        <span className="text-gray-400 shrink-0">{icon}</span>
      </div>
      <div className="text-[22px] sm:text-[26px] font-bold text-[#1A1A2E] leading-none">{value}</div>
      {subLabel && (
        <div className="text-[11px] sm:text-[11.5px] text-gray-400 mt-1 leading-snug">{subLabel}</div>
      )}
    </div>
  );
}

function BookingStatsCards({ summary }: { summary: BookingSummary }) {
  const teamInOffice = summary.teamInOffice ?? 0;

  return (
    <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-1 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
      <StatCard
        label="Upcoming"
        value={summary.upcomingCount}
        subLabel={summary.nextBookingDate ?? undefined}
        icon={<Calendar className="size-4" />}
        accentClass="border-l-indigo-400"
      />
      <StatCard
        label="Completed this month"
        value={summary.completedThisMonth}
        subLabel={`${summary.daysInOffice} days in office`}
        icon={<CheckCircle2 className="size-4" />}
        accentClass="border-l-emerald-400"
      />
      <StatCard
        label="Team in office today"
        value={teamInOffice}
        subLabel={teamInOffice === 1 ? "1 teammate present" : `${teamInOffice} teammates present`}
        icon={<Users className="size-4" />}
        accentClass="border-l-violet-400"
      />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MyBookingsPage() {
  const {
    displayedBookings,
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

  const upcomingCards = sortByDate(
    displayedBookings.filter((b) => b.status !== "cancelled" && isUpcoming(b.date)),
    true,
  );
  const pastCards = sortByDate(
    displayedBookings.filter((b) => b.status !== "cancelled" && !isUpcoming(b.date)),
    false,
  );

  const sortedDisplayed = sortByDate(
    displayedBookings,
    activeTab !== "past" && activeTab !== "cancelled",
  );

  return (
    <>
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[#F7F8FC]">

        {/* Sticky top zone: header + stats + tabs */}
        <div className="shrink-0 bg-[#F7F8FC] px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 flex flex-col gap-4 sm:gap-5">

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
            <div>
              <h1 className="text-[18px] sm:text-[20px] font-bold text-[#1A1A2E] leading-tight">
                My Bookings
              </h1>
              <p className="text-[12px] sm:text-[12.5px] text-gray-400 mt-0.5">
                Your upcoming and past seat reservations
              </p>
            </div>
            <div className="flex gap-2.5 items-center">
              <Button
                size="sm"
                className="h-8 flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white text-[12.5px] font-semibold gap-1.5"
                onClick={() => router.push("/book")}
              >
                <Plus className="size-4" />
                New booking
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 text-gray-400"
                onClick={refreshBookings}
              >
                <RefreshCw className="size-3.5" />
              </Button>
            </div>
          </div>

          <BookingStatsCards summary={summary} />

          {/* Tabs — scrollable on narrow screens */}
          <div className="flex border-b border-[#EBEBF5] overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 sm:px-5 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors duration-150 whitespace-nowrap shrink-0",
                  activeTab === tab.id
                    ? "border-indigo-600 text-indigo-600 font-semibold"
                    : "border-transparent text-gray-500 hover:text-gray-700",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

        </div>

        {/* Scrollable card list */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex flex-col gap-3">

            {isLoading && (
              <div className="text-center py-12 text-gray-400 text-[13.5px]">
                Loading bookings…
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 sm:px-5 py-4 text-red-500 text-[13px]">
                {error}
              </div>
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
                    <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400 mt-2">
                      Past Bookings
                    </p>
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
