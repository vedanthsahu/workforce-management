"use client";

import Link from "next/link";
import { CalendarDays, Users } from "lucide-react";

import type { TodayBookingInfo } from "../types/dashboard.types";

type HeroBannerProps = {
  userName: string;
  todayBooking: TodayBookingInfo;
  teamInOfficeCount: number;
  nextBookingDate: string;
  canBookSelf: boolean;
};

export function HeroBanner({
  userName,
  todayBooking,
  teamInOfficeCount,
  nextBookingDate,
  canBookSelf,
}: HeroBannerProps) {
  if (!todayBooking.hasTodayBooking) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-indigo-700 px-5 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 relative overflow-hidden animate-fade-in">
        <div className="absolute w-48 h-48 rounded-full bg-white/[0.04] -top-16 -right-8 pointer-events-none" />
        <div className="absolute w-28 h-28 rounded-full bg-white/[0.05] top-4 right-32 pointer-events-none" />
        <div className="absolute w-16 h-16 rounded-full bg-indigo-500/30 bottom-0 left-1/2 pointer-events-none" />
        <div className="min-w-0 z-10">
          <p className="text-white font-bold text-[21px] leading-snug tracking-tight">
            No seat booked for today, {userName} 👋
          </p>
          <p className="text-indigo-300 text-[11.5px] mt-1 mb-3 leading-snug">
            Your team is mostly in — {teamInOfficeCount} teammate{teamInOfficeCount !== 1 ? "s" : ""} present today
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-indigo-100 text-[10.5px] font-medium px-2.5 py-[5px] rounded-full border border-white/10 transition-all hover:bg-white/20">
              <Users className="w-3 h-3 shrink-0" />
              {teamInOfficeCount} teammate{teamInOfficeCount !== 1 ? "s" : ""} in office
            </span>
            {nextBookingDate !== "—" && (
              <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-indigo-100 text-[10.5px] font-medium px-2.5 py-[5px] rounded-full border border-white/10">
                <CalendarDays className="w-3 h-3 shrink-0" />
                Next booking: {nextBookingDate}
              </span>
            )}
          </div>
        </div>
         {canBookSelf && (
          <Link
            href="/book"
            className="inline-flex items-center justify-center bg-white text-blue-800 hover:bg-indigo-50 hover:scale-[1.03] active:scale-[0.97] transition-all duration-150 text-[11.5px] font-semibold shrink-0 h-8 px-4 rounded-xl shadow-md shadow-indigo-900/20 self-start sm:self-auto z-10"
          >
            Book Now →
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-indigo-700 px-5 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden animate-fade-in">
      <div className="absolute w-52 h-52 rounded-full bg-white/[0.04] -top-20 right-28 pointer-events-none" />
      <div className="absolute w-32 h-32 rounded-full bg-white/[0.04] -bottom-10 right-10 pointer-events-none" />
      <div className="absolute w-20 h-20 rounded-full bg-indigo-500/20 top-2 left-1/3 pointer-events-none" />
      <div className="min-w-0 flex flex-col gap-2.5 z-10">
        <p className="text-white font-bold text-[26px] leading-tight tracking-tight">
          Good morning, {userName} 👋
        </p>
        <p className="text-indigo-300/80 text-[11.5px] leading-snug">
          {todayBooking.floor ?? "Office"} · {teamInOfficeCount} teammate{teamInOfficeCount !== 1 ? "s" : ""} in office
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 bg-white/10 text-indigo-100 text-[10.5px] font-medium px-2.5 py-[5px] rounded-full border border-white/10 hover:bg-white/20 transition-colors">
            <Users className="w-3 h-3 shrink-0" />
            {teamInOfficeCount} teammate{teamInOfficeCount !== 1 ? "s" : ""} in office
          </span>
          {nextBookingDate !== "—" && (
            <span className="inline-flex items-center gap-1.5 bg-white/10 text-indigo-100 text-[10.5px] font-medium px-2.5 py-[5px] rounded-full border border-white/10">
              <CalendarDays className="w-3 h-3 shrink-0" />
              Next booking: {nextBookingDate}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 z-10 shrink-0 self-start sm:self-auto">
        <div className="bg-white/10 border border-white/25 rounded-2xl px-5 py-3 text-center min-w-[88px] hover:bg-white/15 transition-colors duration-200 cursor-default">
          <p className="text-indigo-300/70 text-[9px] uppercase tracking-widest mb-1 font-medium">Seat</p>
          <p className="text-white font-bold text-[24px] leading-none tracking-tight">{todayBooking.seatCode}</p>
          <p className="text-indigo-300/60 text-[9px] mt-1">{todayBooking.floor ?? "Office"}</p>
        </div>
      </div>
    </div>
  );
}
