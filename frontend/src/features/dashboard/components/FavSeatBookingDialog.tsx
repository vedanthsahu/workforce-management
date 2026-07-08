"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Star, X, CalendarDays, AlertCircle, MapPin, ArrowRight, CalendarX, Building2 } from "lucide-react";
import axios from "axios";
import type { FavouriteSeat } from "../types/dashboard.types";
import { fetchAvailability } from "@/features/book/services/Bookingform.service";
import { axiosInstance } from "@/lib/http/axios";

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}


const SESSION_KEY = "favDialogState";

interface SavedDialogState {
  date: string;
  avail: AvailState;
}

interface Props {
  seat: FavouriteSeat;
  secondFavSeat: FavouriteSeat | null;
  open: boolean;
  onClose: () => void;
  restoreOnOpen?: boolean;
}

type AvailState =
  | { phase: "idle" }
  | { phase: "checking" }
  | { phase: "self_conflict"; message: string }
  | { phase: "unavailable"; secondAvailable: boolean | null };

function buildBookUrl(seat: FavouriteSeat, date: string): string {
  const params = new URLSearchParams({ fromDate: date, toDate: date, step: "2", source: "dashboard" });
  if (seat.siteId)     params.set("siteId",     seat.siteId);
  if (seat.buildingId) params.set("buildingId", seat.buildingId);
  if (seat.floorId)    params.set("floorId",    seat.floorId);
  if (seat.id)         params.set("seatId",     seat.id);
  return `/book?${params.toString()}`;
}

function buildBrowseUrl(seat: FavouriteSeat, date: string): string {
  const params = new URLSearchParams({ fromDate: date, toDate: date, step: "2", source: "dashboard" });
  if (seat.siteId)     params.set("siteId",     seat.siteId);
  if (seat.buildingId) params.set("buildingId", seat.buildingId);
  if (seat.floorId)    params.set("floorId",    seat.floorId);
  return `/book?${params.toString()}`;
}

async function checkSelfEligibility(date: string): Promise<void> {
  await axiosInstance.post("/bookings/eligibility", {
    start_date: date,
    end_date: date,
    is_guest_booking: false,
  });
}

async function isSeatAvailable(seat: FavouriteSeat, date: string): Promise<boolean> {
  if (!seat.floorId) return false;
  const seats = await fetchAvailability({ floorId: seat.floorId, fromDate: date });
  const match = seats.find((s) => s.seat_id === seat.id);
  if (!match) return false;
  return match.availability.status === "FULLY_AVAILABLE";
}

export default function FavSeatBookingDialog({ seat, secondFavSeat, open, onClose, restoreOnOpen }: Props) {
  const router = useRouter();
  const [date, setDate] = useState(todayStr);
  const [avail, setAvail] = useState<AvailState>({ phase: "idle" });
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    router.prefetch("/book");
    if (restoreOnOpen) {
      try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as SavedDialogState;
          setDate(saved.date);
          setAvail(saved.avail);
          sessionStorage.removeItem(SESSION_KEY);
        }
      } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || !mounted) return null;

  const handleClose = () => {
    setAvail({ phase: "idle" });
    onClose();
  };

  const navigateWithState = (url: string) => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ date, avail } satisfies SavedDialogState));
    onClose();
    router.push(url);
  };

  const handleContinue = async () => {
    setAvail({ phase: "checking" });

    // Step 1: confirm the user has no existing booking on this date
    try {
      await checkSelfEligibility(date);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        const detail = err.response.data?.detail;
        const msg =
          typeof detail === "object" && detail?.message
            ? detail.message
            : "You already have a booking on this date.";
        setAvail({ phase: "self_conflict", message: msg });
      } else {
        setAvail({ phase: "self_conflict", message: "Unable to verify eligibility. Please try again." });
      }
      return;
    }

    // Step 2: check the specific fav seat is available
    try {
      const firstOk = await isSeatAvailable(seat, date);
      if (firstOk) {
        navigateWithState(buildBookUrl(seat, date));
        return;
      }

      let secondAvailable: boolean | null = null;
      if (secondFavSeat) {
        secondAvailable = await isSeatAvailable(secondFavSeat, date);
      }
      setAvail({ phase: "unavailable", secondAvailable });
    } catch {
      setAvail({ phase: "unavailable", secondAvailable: null });
    }
  };

  const handleBookSecond = () => {
    if (!secondFavSeat) return;
    navigateWithState(buildBookUrl(secondFavSeat, date));
  };

  const handleBrowseAll = () => {
    navigateWithState(buildBrowseUrl(seat, date));
  };

  const isSelfConflict = avail.phase === "self_conflict";
  const isUnavailable  = avail.phase === "unavailable";
  const hasError       = isSelfConflict || isUnavailable;
  const isChecking     = avail.phase === "checking";

  // Split location into parts for display
  const [floorPart, sitePart] = seat.location.split(" · ");

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-end sm:justify-center bg-black/50 backdrop-blur-sm">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={handleClose} />

      <div className="relative w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl bg-white shadow-2xl overflow-hidden flex flex-col">

        {/* ── Gradient header ── */}
        <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 px-5 pt-5 pb-7 overflow-hidden shrink-0">
          {/* Decorative circles */}
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute right-6 top-16 w-20 h-20 rounded-full bg-white/10" />
          <div className="absolute -left-6 bottom-0 w-28 h-28 rounded-full bg-white/5" />

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors z-10"
          >
            <X size={15} className="text-white" />
          </button>

          {/* Favourite badge */}
          <div className="flex items-center gap-1.5 mb-3">
            <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span className="text-xs font-semibold text-white/80 uppercase tracking-widest">Favourite Seat</span>
          </div>

          {/* Seat code */}
          <h2 className="text-2xl font-bold text-white leading-none mb-1">{seat.label}</h2>

          {/* Location pills */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {floorPart && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-indigo-100 bg-white/15 rounded-full px-2.5 py-1">
                <Building2 className="w-3 h-3" />
                {floorPart}
              </span>
            )}
            {sitePart && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-indigo-100 bg-white/15 rounded-full px-2.5 py-1">
                <MapPin className="w-3 h-3" />
                {sitePart}
              </span>
            )}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="px-5 pt-4 pb-4 space-y-3">

          {/* Date card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3">
            <label className="flex items-center gap-1.5 text-[10.5px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              <CalendarDays className="w-3 h-3 text-indigo-400" />
              Select booking date
            </label>
            <input
              type="date"
              value={date}
              min={todayStr()}
              onChange={(e) => {
                setDate(e.target.value);
                setAvail({ phase: "idle" });
              }}
              className="w-full text-sm font-medium border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 text-gray-800 bg-gray-50"
            />
          </div>

          {/* ── Self-conflict error ── */}
          {isSelfConflict && (
            <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
              <CalendarX className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-amber-900 leading-snug">You already have a booking on this date</p>
                <p className="text-[11px] text-amber-600 mt-0.5">Please pick a different date to continue.</p>
              </div>
            </div>
          )}

          {/* ── Seat unavailability ── */}
          {isUnavailable && (
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-red-900 leading-snug">{seat.label} is already booked</p>
                  <p className="text-[11px] text-red-600 mt-0.5">Someone else has reserved this seat on this date.</p>
                </div>
              </div>

              {/* Second fav available */}
              {secondFavSeat && (avail as { phase: "unavailable"; secondAvailable: boolean | null }).secondAvailable === true && (
                <button
                  onClick={handleBookSecond}
                  className="w-full flex items-center justify-between gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2.5 hover:bg-indigo-100 transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                    <div className="text-left min-w-0">
                      <p className="text-[11.5px] font-semibold text-indigo-900 leading-none">Book {secondFavSeat.label} instead</p>
                      <p className="text-[10.5px] text-indigo-500 mt-0.5">{secondFavSeat.location} · available</p>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-500 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}

              {/* Second fav also unavailable */}
              {secondFavSeat && (avail as { phase: "unavailable"; secondAvailable: boolean | null }).secondAvailable === false && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <p className="text-[11px] text-amber-700"><span className="font-semibold">{secondFavSeat.label}</span> is also booked.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 pb-6 pt-2 space-y-2.5 shrink-0 border-t border-gray-50">
          {!hasError ? (
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 py-3 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleContinue}
                disabled={!date || isChecking}
                className="flex-[2] py-3 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-200"
              >
                {isChecking ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Checking…
                  </>
                ) : (
                  <>Continue to Book <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          ) : isSelfConflict ? (
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 py-3 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setAvail({ phase: "idle" })}
                className="flex-[2] py-3 text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors flex items-center justify-center gap-2"
              >
                <CalendarDays className="w-4 h-4" />
                Pick another date
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBrowseAll}
                className="flex-[2] py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-200"
              >
                <MapPin className="w-3.5 h-3.5" />
                Browse all seats
              </button>
            </div>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
}
