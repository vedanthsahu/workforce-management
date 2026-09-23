"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarClock, CalendarPlus, History, Info, Sparkles, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useBookingSidebar } from "../hooks/useBookingSidebar";
import { QuickPickSeat } from "../types/Bookingform.types";
import { fmtDate } from "../utils/bookingFormHelpers";
import { extractApiErrorMessage, isQuickPickSeatAvailable } from "../services/Bookingform.service";

interface Props {
  /** Current form dates — quick picks jump straight to review using these, not "today" */
  fromDate: string;
  toDate: string;
  /** Reports a conflict up to the page's own error banner (top of Book a
   * Space) instead of navigating — a conflicting quick pick stays on this
   * page rather than taking the admin to Review & Confirm for a space that
   * isn't actually bookable. */
  onConflict: (message: string) => void;
}

function buildQuickPickUrl(seat: QuickPickSeat, fromDate: string, toDate: string): string {
  const params = new URLSearchParams({ fromDate, toDate, step: "3", source: "book", spaceType: "SEAT" });
  if (seat.siteId) params.set("siteId", seat.siteId);
  if (seat.buildingId) params.set("buildingId", seat.buildingId);
  if (seat.floorId) params.set("floorId", seat.floorId);
  params.set("seatId", seat.id);
  params.set("seatLabel", seat.label);
  if (seat.floor) params.set("floorName", seat.floor);
  return `/book?${params.toString()}`;
}

// Shared with BookaSeatSkeleton.tsx (the page's own initial-load skeleton)
// so both loading states render the exact same white cards — not just a
// solid grey block — for this sidebar area.
export function BookingSidebarSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white border border-[#EBEBF5] rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-2.5 w-36" />
          </div>
        </div>
        <Skeleton className="h-20 rounded-xl" />
      </div>

      <div className="bg-white border border-[#EBEBF5] rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-2.5 w-40" />
          </div>
        </div>
        <div className="border border-[#EBEBF5] rounded-xl divide-y divide-[#EBEBF5] overflow-hidden">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 px-3.5 py-3">
              <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2.5 w-16" />
              </div>
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type PickState = "idle" | "checking";

const QUICK_PICK_STYLE: Record<QuickPickSeat["tag"], {
  tagLabel: string;
  icon: React.ElementType;
  iconBg: string;
  iconText: string;
  tagBg: string;
  tagText: string;
  goBg: string;
  goText: string;
  goHoverBg: string;
}> = {
  favourite: {
    tagLabel: "Favourite",
    icon: Star,
    iconBg: "bg-amber-50", iconText: "text-amber-500",
    tagBg: "bg-amber-50", tagText: "text-amber-600",
    goBg: "bg-amber-500", goText: "text-white", goHoverBg: "hover:bg-amber-600",
  },
  frequent: {
    tagLabel: "Frequently booked",
    icon: History,
    iconBg: "bg-indigo-50", iconText: "text-indigo-500",
    tagBg: "bg-indigo-50", tagText: "text-indigo-600",
    goBg: "bg-indigo-50", goText: "text-indigo-600", goHoverBg: "hover:bg-indigo-100",
  },
};

export const BookingSidebar: React.FC<Props> = ({ fromDate, toDate, onConflict }) => {
  const router = useRouter();
  const { nextBooking, quickPicks, loading } = useBookingSidebar(fromDate, toDate);
  const [pickState, setPickState] = useState<Record<string, PickState>>({});

  const handleQuickPick = async (seat: QuickPickSeat) => {
    setPickState((prev) => ({ ...prev, [seat.id]: "checking" }));
    try {
      const available = await isQuickPickSeatAvailable(seat, fromDate, toDate);
      setPickState((prev) => ({ ...prev, [seat.id]: "idle" }));
      if (available) {
        router.push(buildQuickPickUrl(seat, fromDate, toDate));
        return;
      }
      // Stay on this page — report the conflict to the page's own top
      // banner instead of navigating anywhere.
      onConflict(`Space ${seat.label} is already booked for the selected date(s). Please choose a different space.`);
    } catch (err) {
      // The availability endpoint itself can 409 for reasons that have
      // nothing to do with this specific seat (e.g. the admin already has
      // another active booking in this date range — see
      // user_has_active_booking_in_range in booking_service.py, checked
      // before the seat-level query even runs). That's a real, deterministic
      // conflict, not a transient blip — proceeding anyway would just land
      // on Review & Confirm for a booking guaranteed to fail. Only a
      // genuinely unexpected failure (network drop, 500) should still
      // report itself as a conflict rather than silently pushing forward.
      setPickState((prev) => ({ ...prev, [seat.id]: "idle" }));
      onConflict(extractApiErrorMessage(err, "Unable to check availability for this space right now. Please try again."));
    }
  };

  if (loading) {
    return <BookingSidebarSkeleton />;
  }

  // Both cards always render — an admin with neither an upcoming booking nor
  // any favourites shouldn't see this whole column go blank (or, if it were
  // instead swapped for one giant filler, blow past the height of the form
  // beside it). Each card just falls back to a short, friendly empty state
  // sized the same as its populated version.
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white border border-[#EBEBF5] rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
            <CalendarClock size={17} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-[13.5px] sm:text-[14px] font-bold text-[#1A1A2E]">
              {nextBooking ? (nextBooking.isTomorrow ? "Tomorrow's Booking" : "Next Booking") : "Upcoming Bookings"}
            </p>
            <p className="text-[11px] sm:text-[11.5px] text-gray-400">
              {nextBooking ? fmtDate(nextBooking.bookingDate) : "Nothing on your calendar yet"}
            </p>
          </div>
        </div>

        {nextBooking ? (
          <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-100 mb-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
              Already booked
            </div>
            <p className="text-[15px] font-bold leading-tight">
              Space {nextBooking.seatCode ?? "—"}
              {nextBooking.floorName ? `, ${nextBooking.floorName}` : ""}
            </p>
            <p className="text-[12px] text-indigo-100 mt-0.5">
              {[nextBooking.siteName, nextBooking.buildingName].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-gray-50 border border-dashed border-gray-200 p-4 flex flex-col items-center text-center gap-2">
            <div className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center">
              <CalendarPlus size={16} className="text-gray-400" />
            </div>
            <p className="text-[12px] text-gray-500 leading-relaxed">
              No upcoming bookings — reserve a space below and it&apos;ll show up here.
            </p>
          </div>
        )}
      </div>

      {/* Quick Picks — hidden entirely rather than shown empty: with the
          list now filtered to only seats actually free on the selected
          date(s) (see useBookingSidebar), an empty result means there's
          genuinely nothing to offer as a shortcut right now, not just that
          the admin has no favourites yet. */}
      {quickPicks.length > 0 && (
        <div className="bg-white border border-[#EBEBF5] rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
              <Sparkles size={17} className="text-amber-500" />
            </div>
            <div>
              <p className="text-[13.5px] sm:text-[14px] font-bold text-[#1A1A2E]">Quick Picks</p>
              <p className="text-[11px] sm:text-[11.5px] text-gray-400">Your favourite spaces, one tap away</p>
            </div>
          </div>

          <div className="border border-[#EBEBF5] rounded-xl divide-y divide-[#EBEBF5] overflow-hidden">
            {quickPicks.map((seat) => {
              const style = QUICK_PICK_STYLE[seat.tag];
              const Icon = style.icon;
              const state = pickState[seat.id] ?? "idle";
              return (
                <div key={`${seat.tag}-${seat.id}`} className="flex items-center gap-3 px-3.5 py-3 hover:bg-gray-50/80 transition-colors">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                      style.iconBg,
                      style.iconText
                    )}
                  >
                    <Icon size={17} className={seat.tag === "favourite" ? "fill-current" : ""} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-[#1A1A2E] truncate" title={`Space ${seat.label}`}>
                      Space {seat.label}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0", style.tagBg, style.tagText)}>
                        {style.tagLabel}
                      </span>
                      <span className="text-[11px] text-gray-400 truncate">{seat.floor || "—"}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuickPick(seat)}
                    disabled={state === "checking"}
                    className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors disabled:opacity-60", style.goBg, style.goText, style.goHoverBg)}
                    aria-label={`Book space ${seat.label}`}
                  >
                    {state === "checking" ? (
                      <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ArrowRight size={13} />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="flex items-start gap-2">
            <Info size={13} className="text-gray-300 mt-0.5 shrink-0" />
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Quick picks use your booking history — your selected dates stay the same, only the space changes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
