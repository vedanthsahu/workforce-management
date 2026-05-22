"use client";

import { useDashboard } from "../hooks/useDashboard";
import { useAuthContext } from "@/features/auth/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  CalendarDays, Users, Repeat2, Info, CircleCheck,
  RefreshCw, ArrowUp, ArrowDown, ExternalLink, ChevronRight,
  Star, TrendingUp, Trophy,
} from "lucide-react";
import type {
  Booking, FavouriteSeat, TeamMember, TodayBookingInfo, WeekDay,
} from "../types/dashboard.types";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { FatalErrorScreen } from "./dashboarderror";
import { useState, useCallback } from "react";
import {
  cancelBooking as cancelBookingApi,
  fetchSeatAmenities,
} from "@/features/bookings/services/bookings.service";
import { usePermissions } from "../hooks/usePermissions";

// ─── Route map ────────────────────────────────────────────────────────────────

const ROUTE_MAP: Record<string, string> = {
  dashboard:     "/dashboard",
  book:          "/book",
  bookings:      "/mybookings",
  team:          "/team-booking",
  schedule:      "/schedule",
  find:          "/find-teammates",
  notifications: "/notifications",
  favourites:    "/preferences",
};

// ─── Cancel Dialog ────────────────────────────────────────────────────────────

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
    try { await onConfirm(reason); setReason(""); }
    finally { setLoading(false); }
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) { setReason(""); onClose(); }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[#1A1A2E]">Cancel Booking</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-500 text-[13px]">
            {booking && (
              <span>
                Are you sure you want to cancel your booking at{" "}
                <strong className="text-gray-700">
                  {booking.location} · {booking.floor} · Seat {booking.seatId}
                </strong>{" "}
                on <strong className="text-gray-700">{booking.date}</strong>?
                This action cannot be undone.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-2">
          <Label
            htmlFor="cancel-reason-dash"
            className="text-[12.5px] font-medium text-gray-600 mb-1.5 block"
          >
            Reason for cancellation{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </Label>
          <Textarea
            id="cancel-reason-dash"
            placeholder="e.g. Working from home, schedule change…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="text-[13px] resize-none h-20"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => { setReason(""); onClose(); }}
            className="text-[12.5px]"
          >
            Keep Booking
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className="bg-red-500 hover:bg-red-600 text-white text-[12.5px] disabled:opacity-50"
          >
            {loading ? "Cancelling…" : "Yes, Cancel"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// ─── Hero Banner ──────────────────────────────────────────────────────────────

function HeroBanner({
  userName, todayBooking, teamInOfficeCount, nextBookingDate,
  onCancelToday, onBookNow, onModifyToday,
  canCancelOwn, canBookSelf,
}: {
  userName: string;
  todayBooking: TodayBookingInfo;
  teamInOfficeCount: number;
  nextBookingDate: string;
  onCancelToday: () => void;
  onBookNow: () => void;
  onModifyToday: () => void;
  canCancelOwn: boolean;
  canBookSelf: boolean;
}) {
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
          <Button
            size="sm"
            onClick={onBookNow}
            className="bg-white text-indigo-700 hover:bg-indigo-50 hover:scale-[1.03] active:scale-[0.97] transition-all duration-150 text-[11.5px] font-semibold shrink-0 h-[32px] px-4 rounded-xl shadow-md shadow-indigo-900/20 border-0 self-start sm:self-auto z-10"
          >
            Book Now →
          </Button>
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
        {/* {(canCancelOwn || canBookSelf) && (
          <div className="flex gap-1.5">
            {canCancelOwn && (
              <Button
                size="sm" variant="ghost"
                className="text-indigo-200/80 hover:bg-white/10 hover:text-white text-[11px] h-[30px] px-3 rounded-xl border border-white/20 shadow-none transition-all duration-150 active:scale-95"
                onClick={onCancelToday}
              >
                Cancel
              </Button>
            )}
            {canBookSelf && (
              <Button
                size="sm"
                className="bg-white text-indigo-700 hover:bg-indigo-50 text-[11px] font-semibold h-[30px] px-3.5 rounded-xl shadow-md shadow-indigo-900/20 border-0 hover:scale-[1.03] active:scale-[0.97] transition-all duration-150"
                onClick={onModifyToday}
              >
                Modify →
              </Button>
            )}
          </div>
        )} */}
      </div>
    </div>
  );
}

// ─── Week Strip ───────────────────────────────────────────────────────────────

function WeekStrip({ days }: { days: WeekDay[] }) {
  const todayIdx = days.findIndex((d) => d.isToday);
  return (
    <div className="bg-white border border-gray-100 rounded-2xl px-3 py-3 flex items-center gap-2 overflow-x-auto scrollbar-none shadow-sm animate-fade-in-up" style={{ animationDelay: "60ms" }}>
      {days.map((day, idx) => {
        const isAdjacent = todayIdx !== -1 && Math.abs(idx - todayIdx) === 1;
        return (
          <div
            key={`${day.dayLabel}-${day.date}`}
            className={cn(
              "flex flex-col items-center justify-center flex-1 min-w-[44px] h-[64px] rounded-xl cursor-pointer transition-all duration-200 select-none gap-1 border-2 hover:scale-[1.04] active:scale-[0.97]",
              day.isToday
                ? "bg-indigo-600 border-indigo-500 shadow-md shadow-indigo-200"
                : isAdjacent
                ? "bg-gray-50 border-emerald-200 hover:border-emerald-300"
                : "bg-gray-50 border-transparent hover:bg-gray-100 hover:border-gray-200"
            )}
          >
            <span className={cn("text-[9px] font-semibold uppercase tracking-wider leading-none", day.isToday ? "text-indigo-200" : "text-gray-400")}>
              {day.isToday ? "Today" : day.dayLabel}
            </span>
            <span className={cn("text-[16px] font-bold leading-none", day.isToday ? "text-white" : "text-gray-700")}>
              {day.date}
            </span>
            <span className={cn("w-[5px] h-[5px] rounded-full transition-colors", day.hasBooking ? "bg-emerald-400" : "bg-red-300")} />
          </div>
        );
      })}
    </div>
  );
}

// ─── Stat Cards ───────────────────────────────────────────────────────────────

function StatCards({
  daysInOffice, trend, teamInOffice, officeVisitsThisYear, teamRank,
}: {
  daysInOffice: number; trend: number; teamInOffice: number;
  officeVisitsThisYear: number; teamRank: number;
}) {
  const rankSuffix = (n: number) => n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <div className="group bg-white border border-blue-100 rounded-2xl p-3 relative overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 animate-fade-in-up cursor-pointer" style={{ animationDelay: "120ms" }}>
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 to-transparent" />
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Days in office</p>
          <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors duration-200">
            <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
          </div>
        </div>
        <p className="text-[24px] font-bold text-gray-900 leading-none">
          {daysInOffice}<span className="text-[12px] font-normal text-gray-400 ml-1">/mo</span>
        </p>
        <p className="text-[10.5px] text-gray-400 mt-1">this month</p>
        {trend !== 0 && (
          <div className={cn("inline-flex items-center gap-1 mt-1.5 text-[10.5px] font-medium px-1.5 py-0.5 rounded-md", trend > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500")}>
            {trend > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            <span>{Math.abs(trend)} vs last</span>
          </div>
        )}
      </div>

      <div className="group bg-white border border-emerald-100 rounded-2xl p-3 relative overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 animate-fade-in-up cursor-pointer" style={{ animationDelay: "160ms" }}>
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-transparent" />
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Team present</p>
          <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-200 transition-colors duration-200">
            <Users className="w-3.5 h-3.5 text-emerald-600" />
          </div>
        </div>
        <p className="text-[24px] font-bold text-gray-900 leading-none">{teamInOffice}</p>
        <p className="text-[10.5px] text-gray-400 mt-1">in office today</p>
        <div className="inline-flex items-center gap-1.5 mt-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          <span className="text-[10px] text-emerald-500 font-medium">Live</span>
        </div>
      </div>

      <div className="bg-white border border-violet-100 rounded-xl p-3 relative overflow-hidden col-span-2 sm:col-span-1">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 to-transparent" />
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Office visits</p>
          <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
            <TrendingUp className="w-3.5 h-3.5 text-violet-500" />
          </div>
        </div>
        <p className="text-[24px] font-bold text-gray-900 leading-none">
          {officeVisitsThisYear}<span className="text-[12px] font-normal text-gray-400 ml-1">this year</span>
        </p>
        <div className="mt-2 bg-indigo-600 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-[13px] font-bold text-white">#{teamRank}</span>
            <span className="text-[10px] text-violet-300">team rank</span>
          </div>
          <div className="flex items-center gap-1">
            <Trophy className="w-3 h-3 text-violet-300" />
            <span className="text-[10px] text-violet-300">{teamRank}{rankSuffix(teamRank)} place</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Booking Card ─────────────────────────────────────────────────────────────

function BookingCard({
  booking, onCancel, onModify, canCancelOwn, canBookSelf,
}: {
  booking: Booking;
  onCancel: (booking: Booking) => void;
  onModify: (booking: Booking) => void;
  canCancelOwn: boolean;
  canBookSelf: boolean;
}) {
  const isConfirmed = booking.status === "Confirmed";
  return (
    <div className="group bg-white border border-gray-100 rounded-xl overflow-hidden flex hover:border-gray-200 hover:shadow-sm transition-all duration-200 animate-fade-in-up">
      <div className={cn(
        "w-[3px] shrink-0 self-stretch rounded-l-xl transition-all duration-300",
        isConfirmed ? "bg-emerald-400 group-hover:bg-emerald-500" : "bg-yellow-400 group-hover:bg-yellow-500"
      )} />
      <div className="flex-1 px-4 py-3.5 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <p className="text-[12.5px] font-semibold text-gray-900 leading-snug">
            {booking.location} · {booking.floor}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn(
              "text-[10px] font-semibold px-2 py-[3px] rounded-md transition-colors",
              isConfirmed ? "bg-emerald-50 text-emerald-700" : "bg-yellow-50 text-yellow-700"
            )}>
              {booking.status}
            </span>
            {booking.isRecurring && (
              <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                <Repeat2 className="w-3 h-3" />
                Recurring
              </span>
            )}
          </div>
        </div>
        <p className="text-[11px] text-gray-400 mt-1 leading-snug">
          Seat {booking.seatId} · {booking.date} · {booking.startTime} – {booking.endTime}
        </p>
        {(canCancelOwn || canBookSelf) && (
          <div className="flex items-center mt-3 pt-2.5 border-t border-gray-50 gap-2">
            {canBookSelf && (
              <Button
                variant="outline" size="sm"
                className="h-[22px] text-[11px] px-2.5 rounded-md border-gray-200 text-gray-600 shadow-none font-normal hover:bg-gray-50 hover:border-gray-300 active:scale-95 transition-all duration-150"
                onClick={() => onModify(booking)}
              >
                Modify
              </Button>
            )}
            {canCancelOwn && (
              <Button
                variant="ghost" size="sm"
                className="h-[22px] text-[11px] px-2.5 rounded-md text-red-500 hover:text-red-600 hover:bg-red-50 shadow-none font-normal active:scale-95 transition-all duration-150"
                onClick={() => onCancel(booking)}
              >
                Cancel
              </Button>
            )}
          </div>
        )}
        {booking.managerNote && (
          <p className="text-[10px] text-gray-400 mt-1.5 italic">{booking.managerNote}</p>
        )}
      </div>
    </div>
  );
}

// ─── Upcoming Bookings ────────────────────────────────────────────────────────

function UpcomingBookings({
  bookings, onCancel, onModify, totalCount, onViewAll, canCancelOwn, canBookSelf,
}: {
  bookings: Booking[];
  onCancel: (booking: Booking) => void;
  onModify: (booking: Booking) => void;
  totalCount: number;
  onViewAll: () => void;
  canCancelOwn: boolean;
  canBookSelf: boolean;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <p className="text-[12.5px] font-semibold text-gray-900">Upcoming bookings</p>
        {totalCount > 2 && (
          <button
            onClick={onViewAll}
            className="text-[11px] text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-0.5 transition-colors"
          >
            View all ({totalCount})
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
      <div className="p-3 space-y-2.5">
        {bookings.length === 0 ? (
          <div className="px-1 py-6 flex flex-col items-center gap-2">
            <CalendarDays className="w-8 h-8 text-gray-200" />
            <p className="text-[11px] text-gray-400 text-center">
              No upcoming bookings.
              {canBookSelf && <><br />Book a seat to get started.</>}
            </p>
          </div>
        ) : (
          bookings.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              onCancel={onCancel}
              onModify={onModify}
              canCancelOwn={canCancelOwn}
              canBookSelf={canBookSelf}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Team in Office ───────────────────────────────────────────────────────────

function TeamInOffice({
  members, inOfficeCount, remoteCount, onFindTeammates, canViewTeammates, canBookSelf,
}: {
  members: TeamMember[];
  inOfficeCount: number;
  remoteCount: number;
  onFindTeammates?: () => void;
  canViewTeammates: boolean;
  canBookSelf: boolean;
}) {
  if (!canViewTeammates) return null;

  const floorCounts: Record<string, number> = {};
  for (const m of members) {
    if (m.floor && m.floor !== "—") floorCounts[m.floor] = (floorCounts[m.floor] ?? 0) + 1;
  }
  const topFloor = Object.entries(floorCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <p className="text-[12.5px] font-semibold text-gray-900">Team in office today</p>
        <span className="text-[11px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
          {inOfficeCount} in · {remoteCount} remote
        </span>
      </div>
      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {members.length === 0 ? (
          <p className="text-[11px] text-gray-400 col-span-2 px-1 py-2">No teammates in office today.</p>
        ) : (
          members.map((m, i) => (
            <div
              key={m.id}
              className="flex items-center gap-2.5 bg-gray-50 rounded-xl px-2.5 py-2 border border-transparent hover:bg-gray-100 hover:border-gray-200 hover:-translate-y-0.5 hover:shadow-sm active:scale-[0.98] transition-all duration-200 cursor-default group animate-fade-in-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ring-2 ring-white group-hover:ring-gray-200 group-hover:scale-105 transition-all duration-200"
                style={{ backgroundColor: m.avatarColor || "#E8E8E8", color: "#555" }}
              >
                {m.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11.5px] font-medium text-gray-800 leading-tight truncate">{m.name}</p>
                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                  {m.floor && m.floor !== "—" && (
                    <span className="text-[10px] text-gray-400 leading-tight">{m.floor}</span>
                  )}
                  {m.floor && m.floor !== "—" && m.seatCode && (
                    <span className="text-[10px] text-gray-300">·</span>
                  )}
                  {m.seatCode && (
                    <span className="text-[10px] text-gray-400 leading-tight">{m.seatCode}</span>
                  )}
                  {!m.floor && !m.seatCode && (
                    <span className="text-[10px] text-gray-400 leading-tight">—</span>
                  )}
                </div>
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            </div>
          ))
        )}
      </div>
      {topFloor && (
        <div className="px-4 pb-3">
          <p className="text-[10.5px] text-gray-400">
            Most of your team is on{" "}
            <span className="text-indigo-600 font-medium">{topFloor}</span> today.{" "}
            {canBookSelf && (
              <button
                onClick={onFindTeammates}
                className="text-indigo-600 hover:underline hover:text-indigo-800 transition-colors"
              >
                Book nearby →
              </button>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Favourite Seat ───────────────────────────────────────────────────────────

function FavouriteSeatCard({
  seat, onQuickBook, canBookSelf,
}: {
  seat: FavouriteSeat | null;
  onQuickBook?: () => void;
  canBookSelf: boolean;
}) {
  if (!seat) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-[12.5px] font-semibold text-gray-900">Favourite seat</p>
        </div>
        <div className="p-3">
          <div className="px-1 py-6 flex flex-col items-center gap-2">
            <Star className="w-8 h-8 text-gray-200" />
            <p className="text-[11px] text-gray-400 text-center">
              No favourite seat saved yet.<br />Star a seat when booking to save it.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const avatarLabel = seat.label.replace(/^seat\s*/i, "").slice(0, 4);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <p className="text-[12.5px] font-semibold text-gray-900">Favourite seat</p>
        {canBookSelf && (
          <button
            onClick={onQuickBook}
            className="text-[11px] text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-0.5 transition-colors"
          >
            Quick book →
          </button>
        )}
      </div>
      <div className="p-3">
        <div
          onClick={canBookSelf ? onQuickBook : undefined}
          className={cn(
            "flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2.5 transition-colors duration-200 group",
            canBookSelf && "hover:bg-indigo-100/60 cursor-pointer"
          )}
        >
          <div className="w-10 h-10 rounded-xl bg-orange-400 flex items-center justify-center shrink-0 group-hover:bg-orange-500 transition-colors duration-200">
            <span className="text-white text-[10px] font-bold leading-none text-center px-0.5">{avatarLabel}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[12px] font-semibold text-gray-900 leading-snug">{seat.label}</p>
              <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0 group-hover:scale-110 transition-transform duration-200" />
            </div>
            <p className="text-[10.5px] text-gray-500 leading-snug">{seat.location}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{seat.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-[120px] bg-indigo-100 rounded-2xl" />
      <div className="h-[82px] bg-gray-100 rounded-2xl" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="h-[100px] bg-blue-50 rounded-2xl" />
        <div className="h-[100px] bg-emerald-50 rounded-2xl" />
        <div className="h-[100px] bg-violet-50 rounded-2xl col-span-2 sm:col-span-1" />
      </div>
      <div className="h-[110px] bg-gray-100 rounded-2xl" />
      <div className="h-[110px] bg-gray-100 rounded-2xl" />
    </div>
  );
}

// ─── Dashboard Page — content only, no layout shell ──────────────────────────

export default function DashboardPage() {
  const {
    data, isLoading, isFatal, fatalError, refetch,
    visibleBookings, totalBookingsCount, handleCancelBooking,
  } = useDashboard();

  const { user } = useAuthContext();
  const router   = useRouter();
  const currentUser = user ?? data?.user ?? null;

  const { can } = usePermissions();
  const canBookSelf      = can("seat:book_self");
  const canCancelOwn     = can("booking:cancel_own");
  const canViewOwn       = can("booking:view_own");
  const canViewTeammates = can("teammate:view");

  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);

  const handleNavigate = useCallback((id: string) => {
    const path = ROUTE_MAP[id];
    if (path) router.push(path);
  }, [router]);

  const goBook          = () => handleNavigate("book");
  const goBookings      = () => handleNavigate("bookings");
  const goFindTeammates = () => handleNavigate("find");

  const handleCancelClick   = (booking: Booking) => { if (canCancelOwn) setCancelTarget(booking); };

  const handleConfirmCancel = async (reason: string) => {
    if (!cancelTarget) return;
    await cancelBookingApi(cancelTarget.id, reason);
    await handleCancelBooking(cancelTarget.id);
    setCancelTarget(null);
  };

  const handleCancelTodayClick = () => {
    if (!data?.todayBooking?.bookingId || !canCancelOwn) return;
    setCancelTarget({
      id:          data.todayBooking.bookingId,
      location:    "Office",
      floor:       data.todayBooking.floor ?? "",
      date:        new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      startTime:   "9:00 AM",
      endTime:     "6:00 PM",
      status:      "Confirmed",
      isRecurring: false,
      seatId:      data.todayBooking.seatCode ?? "",
      managerNote: "",
    });
  };

  const handleModifyBooking = async (booking: Booking) => {
    if (!canBookSelf) return;
    let prefKeys: string[] = (booking as any).preferences ?? [];
    if (prefKeys.length === 0 && booking.floorId && booking.rawSeatId) {
      prefKeys = await fetchSeatAmenities(booking.floorId, booking.rawSeatId, booking.fromDate ?? booking.date);
    }
    const params = new URLSearchParams({
      modifyBookingId: booking.id,
      fromDate:        booking.fromDate ?? booking.date,
      toDate:          booking.toDate   ?? booking.date,
      locationName:    booking.location,
      buildingName:    booking.building ?? "",
      floorName:       booking.floor,
      seatLabel:       booking.seatId,
      seatId:          booking.rawSeatId ?? booking.seatId,
    });
    if (prefKeys.length) params.set("preferences", prefKeys.join(","));
    router.push(`/book?${params.toString()}`);
  };

  const handleModifyToday = async () => {
    if (!data?.todayBooking?.bookingId || !canBookSelf) return;
    await handleModifyBooking({
      id:          data.todayBooking.bookingId,
      location:    "Office",
      floor:       data.todayBooking.floor ?? "",
      date:        new Date().toISOString().split("T")[0],
      startTime:   "9:00 AM",
      endTime:     "6:00 PM",
      status:      "Confirmed",
      isRecurring: false,
      seatId:      data.todayBooking.seatCode ?? "",
      managerNote: "",
    });
  };

  const handleQuickBook = () => {
    if (!canBookSelf) return;
    data?.favouriteSeat ? router.push(`/book?seatId=${data.favouriteSeat.id}`) : goBook();
  };

  // ── No SidebarProvider, no AppSidebar, no top bar — layout.tsx owns all of that
  return (
    <>
      <style>{`
        @keyframes fadeIn    { from { opacity: 0; }                             to { opacity: 1; } }
        @keyframes fadeInUp  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in     { animation: fadeIn    0.35s ease both; }
        .animate-fade-in-up  { animation: fadeInUp  0.4s  ease both; }
      `}</style>

      {isLoading ? (
        <DashboardSkeleton />
      ) : isFatal && fatalError ? (
        <FatalErrorScreen error={fatalError} onRetry={refetch} />
      ) : data ? (
        <div className="space-y-4">
          <HeroBanner
            userName={currentUser?.name ?? currentUser?.display_name ?? "there"}
            todayBooking={data.todayBooking}
            teamInOfficeCount={data.stats.teamInOffice}
            nextBookingDate={data.nextBookingDate}
            onCancelToday={handleCancelTodayClick}
            onBookNow={goBook}
            onModifyToday={handleModifyToday}
            canCancelOwn={canCancelOwn}
            canBookSelf={canBookSelf}
          />

          <WeekStrip days={data.weekDays} />

          <StatCards
            daysInOffice={data.daysInOffice}
            trend={data.stats.trend}
            teamInOffice={data.stats.teamInOffice}
            officeVisitsThisYear={data.stats.officeVisitsThisYear}
            teamRank={data.stats.teamRank}
          />

          <div
            className="flex flex-col lg:flex-row gap-4 lg:gap-5 items-start animate-fade-in-up"
            style={{ animationDelay: "240ms" }}
          >
            <div className="flex-1 min-w-0 w-full space-y-4">
              {canViewOwn && (
                <UpcomingBookings
                  bookings={visibleBookings}
                  onCancel={handleCancelClick}
                  onModify={handleModifyBooking}
                  totalCount={totalBookingsCount}
                  onViewAll={goBookings}
                  canCancelOwn={canCancelOwn}
                  canBookSelf={canBookSelf}
                />
              )}
              <TeamInOffice
                members={data.teamInOfficeToday}
                inOfficeCount={data.stats.teamInOffice}
                remoteCount={data.stats.teamRemoteCount}
                onFindTeammates={goFindTeammates}
                canViewTeammates={canViewTeammates}
                canBookSelf={canBookSelf}
              />
            </div>

            {canBookSelf && (
              <div className="w-full lg:w-[258px] lg:shrink-0 space-y-4">
                <FavouriteSeatCard
                  seat={data.favouriteSeat}
                  onQuickBook={handleQuickBook}
                  canBookSelf={canBookSelf}
                />
              </div>
            )}
          </div>
        </div>
      ) : null}

      <CancelDialog
        open={cancelTarget !== null}
        booking={cancelTarget}
        onConfirm={handleConfirmCancel}
        onClose={() => setCancelTarget(null)}
      />
    </>
  );
}