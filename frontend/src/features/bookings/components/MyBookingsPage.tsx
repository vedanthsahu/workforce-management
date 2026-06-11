"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Booking, BookingTab } from "../types/bookings.types";
import { useBookings } from "../hooks/useBookings";
import { AppSidebar } from "@/features/dashboard/components/AppSidebar";
import { useAuthContext } from "@/features/auth/context/AuthContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { cancelBooking } from "../services/bookings.service";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button }   from "@/components/ui/button";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const FALLBACK_PREFERENCE_NAMES = ["Window Seat", "Near Cafeteria"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month:   "short",
    day:     "numeric",
  });
}

function isUpcoming(isoDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(isoDate + "T00:00:00") >= today;
}

function isToday(isoDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(isoDate + "T00:00:00");
  d.setHours(0, 0, 0, 0);
  return d.getTime() === today.getTime();
}

function sortByDate(bookings: Booking[], ascending = true): Booking[] {
  return [...bookings].sort((a, b) => {
    const da = new Date(a.date + "T00:00:00").getTime();
    const db = new Date(b.date + "T00:00:00").getTime();
    return ascending ? da - db : db - da;
  });
}

// ── Tag chip ──────────────────────────────────────────────────────────────────

interface TagProps { label: string; variant: string; }

const TAG_STYLES: Record<string, string> = {
  confirmed: "bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]",
  manager:   "bg-[#E3F2FD] text-[#1565C0] border border-[#90CAF9]",
  zone:      "bg-[#F3E5F5] text-[#6A1B9A] border border-[#CE93D8]",
  sprint:    "bg-[#FFF8E1] text-[#F57F17] border border-[#FFE082]",
  recurring: "bg-[#E8EAF6] text-[#283593] border border-[#9FA8DA]",
};

const BookingTagChip: React.FC<TagProps> = ({ label, variant }) => (
  <span className={cn(
    "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap",
    TAG_STYLES[variant] ?? TAG_STYLES.zone,
  )}>
    {label}
  </span>
);

// ── Cancel Dialog ─────────────────────────────────────────────────────────────

interface CancelDialogProps {
  open:      boolean;
  booking:   Booking | null;
  onConfirm: (reason: string) => Promise<void>;
  onClose:   () => void;
}

const CancelDialog: React.FC<CancelDialogProps> = ({
  open, booking, onConfirm, onClose,
}) => {
  const [reason,  setReason]  = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(reason);
      setReason("");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) { setReason(""); onClose(); }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md mx-4 sm:mx-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[#1A1A2E]">Cancel Booking</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-500 text-[13px]">
            {booking && (
              <span>
                Are you sure you want to cancel your booking at{" "}
                <strong className="text-gray-700">
                  {booking.location} · {booking.floor} · Seat {booking.seat}
                </strong>{" "}
                on <strong className="text-gray-700">{formatDate(booking.date)}</strong>?
                This action cannot be undone.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-2">
          <Label
            htmlFor="cancel-reason"
            className="text-[12.5px] font-medium text-gray-600 mb-1.5 block"
          >
            Reason for cancellation{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </Label>
          <Textarea
            id="cancel-reason"
            placeholder="e.g. Working from home, schedule change…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="text-[13px] resize-none h-20"
          />
        </div>

        <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-0">
          <AlertDialogCancel
            onClick={() => { setReason(""); onClose(); }}
            className="text-[12.5px] w-full sm:w-auto"
          >
            Keep Booking
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className="bg-red-500 hover:bg-red-600 text-white text-[12.5px] disabled:opacity-50 w-full sm:w-auto"
          >
            {loading ? "Cancelling…" : "Yes, Cancel"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// ── Booking card ──────────────────────────────────────────────────────────────

interface BookingCardProps {
  booking:       Booking;
  onCancelClick: (booking: Booking) => void;
  onModifyClick: (booking: Booking) => void;
  showActions?:  boolean;
}

const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onCancelClick,
  onModifyClick,
  showActions = true,
}) => {
  const isCancelled = booking.status === "cancelled";

  return (
    <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden flex flex-col hover:shadow-sm transition-shadow duration-200">
      <div className="flex items-stretch">
        {/* Left accent bar */}
        <div className={cn(
          "w-[3px] shrink-0",
          isCancelled
            ? "bg-gray-200"
            : booking.status === "pending"
              ? "bg-amber-400"
              : "bg-indigo-500",
        )} />

        <div className="flex-1 min-w-0 px-4 sm:px-5 py-4">
          {/* Row 1: title + booked-on — stacks on mobile */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4">
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold text-[#1A1A2E] truncate">
                {booking.location} · {booking.floor} · Seat {booking.seat}
              </p>
              <p className="text-[12px] text-gray-500 mt-0.5">
                {formatDate(booking.date)}
                {" · "}
                {booking.isFullDay
                  ? "Full day"
                  : `${booking.startTime} – ${booking.endTime}`}
                {booking.isFullDay && (
                  <span className="ml-2 text-[11px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">
                    Full day
                  </span>
                )}
              </p>
            </div>
            <span className="text-[11px] text-gray-400 whitespace-nowrap sm:mt-0.5">
              Booked {booking.bookedOn}
            </span>
          </div>

          {/* Row 2: tags */}
          {!isCancelled && (
            <div className="flex gap-1.5 flex-wrap mt-2.5">
              {booking.tags.map((tag, i) => (
                <BookingTagChip key={i} label={tag.label} variant={tag.variant} />
              ))}
              {booking.isRecurring && booking.recurringPattern && (
                <BookingTagChip label={booking.recurringPattern} variant="recurring" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cancelled badge */}
      {isCancelled && (
        <div className="flex justify-end px-4 sm:px-5 py-2.5 border-t border-gray-100 bg-[#F7F8FC]">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-semibold bg-red-50 text-red-500 border border-red-200">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M15 9l-6 6M9 9l6 6" strokeLinecap="round" />
            </svg>
            Cancelled
          </span>
        </div>
      )}

      {/* Action footer */}
      {showActions && !isCancelled && (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2 px-4 sm:px-5 py-2.5 border-t border-gray-100 bg-[#F7F8FC]">
          <Button
            variant="outline"
            size="sm"
            className="h-8 sm:h-7 w-full sm:w-auto px-4 text-[12.5px] text-gray-600"
            onClick={() => onModifyClick(booking)}
          >
            Modify
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 sm:h-7 w-full sm:w-auto px-4 text-[12.5px] border-red-200 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 hover:border-red-300"
            onClick={() => onCancelClick(booking)}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
};

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label:       string;
  value:       number | string;
  subLabel?:   string;
  icon:        React.ReactNode;
  accentClass: string;
}

const StatCard: React.FC<StatCardProps> = ({
  label, value, subLabel, icon, accentClass,
}) => (
  <div className={cn(
    "flex-1 bg-white border border-[#EBEBF5] rounded-xl p-4 flex flex-col gap-1",
    "min-w-[140px] sm:min-w-[160px]",
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

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS: { id: BookingTab; label: string }[] = [
  { id: "upcoming",  label: "Upcoming"  },
  { id: "past",      label: "Past"      },
  { id: "cancelled", label: "Cancelled" },
];

// ── Icons ─────────────────────────────────────────────────────────────────────

const CalIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);
const CheckIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const UsersIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const RefreshIcon = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ── Page ──────────────────────────────────────────────────────────────────────

const MyBookingsPage: React.FC = () => {
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

  const { user } = useAuthContext();
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
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

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleConfirmCancel = async (reason: string) => {
    if (!cancelTarget) return;
    await cancelBooking(cancelTarget.id, reason);
    await handleCancelBooking(cancelTarget.id);
    setCancelTarget(null);
  };

  const handleModify = (booking: Booking) => {
    const hasRealPrefs = (booking.preferences ?? []).length > 0;

    const params = new URLSearchParams({
      modifyBookingId: booking.id,
      fromDate:        booking.fromDate,
      toDate:          booking.toDate,
      locationName:    booking.location,
      buildingName:    booking.building,
      floorName:       booking.floor,
      seatLabel:       booking.seat,
      seatId:          booking.seatId ?? "",
    });

    if (hasRealPrefs) {
      params.set("preferences", booking.preferences!.join(","));
    } else {
      params.set("preferenceNames", FALLBACK_PREFERENCE_NAMES.join(","));
    }

    router.push(`/book?${params.toString()}`);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-[#F7F8FC] font-sans overflow-hidden w-full">
        <AppSidebar user={user} />

        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">

          {/* ── Sticky top zone: header + stats + tabs ── */}
          <div className="shrink-0 bg-[#F7F8FC] px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 flex flex-col gap-4 sm:gap-5">

            {/* Header */}
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
                  <span className="text-base leading-none">+</span>
                  New booking
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-gray-400"
                  onClick={refreshBookings}
                >
                  <RefreshIcon />
                </Button>
              </div>
            </div>

            {/* Stat cards — horizontal scroll on mobile */}
            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-1 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
              <StatCard
                label="Upcoming"
                value={summary.upcomingCount}
                subLabel={summary.nextBookingDate ?? undefined}
                icon={<CalIcon />}
                accentClass="border-l-indigo-400"
              />
              <StatCard
                label="Completed this month"
                value={summary.completedThisMonth}
                subLabel={`${summary.daysInOffice} days in office`}
                icon={<CheckIcon />}
                accentClass="border-l-emerald-400"
              />
              <StatCard
                label="Team in office today"
                value={summary.teamInOffice ?? 0}
                subLabel={
                  (summary.teamInOffice ?? 0) === 1
                    ? "1 teammate present"
                    : `${summary.teamInOffice ?? 0} teammates present`
                }
                icon={<UsersIcon />}
                accentClass="border-l-violet-400"
              />
            </div>

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

          </div>{/* end sticky top zone */}

          {/* ── Scrollable card list ── */}
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

            {/* ── Upcoming tab ── */}
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

            {/* ── Past & Cancelled tabs ── */}
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

          </div>{/* end card list */}
          </div>{/* end scrollable zone */}
        </main>
      </div>

      {/* Dialogs */}
      <CancelDialog
        open={cancelTarget !== null}
        booking={cancelTarget}
        onConfirm={handleConfirmCancel}
        onClose={() => setCancelTarget(null)}
      />
    </SidebarProvider>
  );
};

export default MyBookingsPage;