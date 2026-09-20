"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarClock, History, Info, Sparkles, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { useBookingSidebar } from "../hooks/useBookingSidebar";
import { QuickPickSeat } from "../types/Bookingform.types";
import { fmtDate } from "../utils/bookingFormHelpers";

interface Props {
  /** Current form dates — quick picks jump straight to review using these, not "today" */
  fromDate: string;
  toDate: string;
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

export const BookingSidebar: React.FC<Props> = ({ fromDate, toDate }) => {
  const router = useRouter();
  const { tomorrow, quickPicks, loading } = useBookingSidebar();

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-52 rounded-2xl bg-gray-100 animate-pulse" />
        <div className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
      </div>
    );
  }

  if (!tomorrow && quickPicks.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {tomorrow && (
        <div className="bg-white border border-[#EBEBF5] rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
              <CalendarClock size={17} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-[13.5px] sm:text-[14px] font-bold text-[#1A1A2E]">Tomorrow&apos;s Booking</p>
              <p className="text-[11px] sm:text-[11.5px] text-gray-400">{fmtDate(tomorrow.bookingDate)}</p>
            </div>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-100 mb-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
              Already booked
            </div>
            <p className="text-[15px] font-bold leading-tight">
              Seat {tomorrow.seatCode ?? "—"}
              {tomorrow.floorName ? `, ${tomorrow.floorName}` : ""}
            </p>
            <p className="text-[12px] text-indigo-100 mt-0.5">
              {[tomorrow.siteName, tomorrow.buildingName].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
        </div>
      )}

      {quickPicks.length > 0 && (
        <div className="bg-white border border-[#EBEBF5] rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
              <Sparkles size={17} className="text-amber-500" />
            </div>
            <div>
              <p className="text-[13.5px] sm:text-[14px] font-bold text-[#1A1A2E]">Quick Picks</p>
              <p className="text-[11px] sm:text-[11.5px] text-gray-400">Your favourite seats, one tap away</p>
            </div>
          </div>

          <div className="border border-[#EBEBF5] rounded-xl divide-y divide-[#EBEBF5] overflow-hidden">
            {quickPicks.map((seat) => {
              const style = QUICK_PICK_STYLE[seat.tag];
              const Icon = style.icon;
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
                    <p className="text-[13px] font-bold text-[#1A1A2E] truncate" title={`Seat ${seat.label}`}>
                      Seat {seat.label}
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
                    onClick={() => router.push(buildQuickPickUrl(seat, fromDate, toDate))}
                    className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors", style.goBg, style.goText, style.goHoverBg)}
                    aria-label={`Book seat ${seat.label}`}
                  >
                    <ArrowRight size={13} />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="flex items-start gap-2">
            <Info size={13} className="text-gray-300 mt-0.5 shrink-0" />
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Quick picks use your booking history — your selected dates stay the same, only the seat changes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
