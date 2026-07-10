// "use client";

// import { useState, useEffect, useCallback } from "react";
// import { createPortal } from "react-dom";
// import { useRouter } from "next/navigation";
// import {
//   Star, X, AlertCircle, MapPin, ArrowRight,
//   CalendarX, Building2, ChevronLeft, ChevronRight,
// } from "lucide-react";
// import axios from "axios";
// import { cn } from "@/lib/utils";
// import type { FavouriteSeat } from "../types/dashboard.types";
// import { fetchAvailability } from "@/features/book/services/Bookingform.service";
// import { axiosInstance } from "@/lib/http/axios";

// // ── Date helpers ──────────────────────────────────────────────────────────────

// function todayDate(): Date {
//   const d = new Date();
//   d.setHours(0, 0, 0, 0);
//   return d;
// }

// function toDateStr(d: Date): string {
//   return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// }

// function fromDateStr(s: string): Date {
//   const [y, m, d] = s.split("-").map(Number);
//   return new Date(y, m - 1, d);
// }

// function firstOfMonth(d: Date): string {
//   return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
// }

// function lastOfMonth(d: Date): string {
//   return toDateStr(new Date(d.getFullYear(), d.getMonth() + 1, 0));
// }

// // ── Types ─────────────────────────────────────────────────────────────────────

// const SESSION_KEY = "favDialogState";

// interface SavedDialogState {
//   date: string;
//   avail: AvailState;
// }

// interface Props {
//   seat: FavouriteSeat;
//   secondFavSeat: FavouriteSeat | null;
//   open: boolean;
//   onClose: () => void;
//   restoreOnOpen?: boolean;
// }

// type AvailState =
//   | { phase: "idle" }
//   | { phase: "checking" }
//   | { phase: "self_conflict"; message: string }
//   | { phase: "unavailable"; secondAvailable: boolean | null };

// type DayStatus = "available" | "booked" | "blocked";

// // ── URL builders ─────────────────────────────────────────────────────────────

// function buildBookUrl(seat: FavouriteSeat, date: string): string {
//   const p = new URLSearchParams({ fromDate: date, toDate: date, step: "2", source: "dashboard" });
//   if (seat.siteId)     p.set("siteId",     seat.siteId);
//   if (seat.buildingId) p.set("buildingId", seat.buildingId);
//   if (seat.floorId)    p.set("floorId",    seat.floorId);
//   if (seat.id)         p.set("seatId",     seat.id);
//   return `/book?${p.toString()}`;
// }

// function buildBrowseUrl(seat: FavouriteSeat, date: string): string {
//   const p = new URLSearchParams({ fromDate: date, toDate: date, step: "2", source: "dashboard" });
//   if (seat.siteId)     p.set("siteId",     seat.siteId);
//   if (seat.buildingId) p.set("buildingId", seat.buildingId);
//   if (seat.floorId)    p.set("floorId",    seat.floorId);
//   return `/book?${p.toString()}`;
// }

// // ── API helpers ───────────────────────────────────────────────────────────────

// async function checkSelfEligibility(date: string): Promise<void> {
//   await axiosInstance.post("/bookings/eligibility", {
//     start_date: date,
//     end_date: date,
//     is_guest_booking: false,
//   });
// }

// async function isSeatAvailable(seat: FavouriteSeat, date: string): Promise<boolean> {
//   if (!seat.floorId) return false;
//   const seats = await fetchAvailability({ floorId: seat.floorId, fromDate: date });
//   const match = seats.find((s) => s.seat_id === seat.id);
//   if (!match) return false;
//   return match.availability.status === "FULLY_AVAILABLE";
// }

// // ── Inline mini-calendar ──────────────────────────────────────────────────────

// const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

// interface CalendarProps {
//   selected: Date | undefined;
//   onSelect: (d: Date) => void;
//   month: Date;
//   onMonthChange: (m: Date) => void;
//   dayStatuses: Map<string, DayStatus>;
//   loading: boolean;
// }

// function BookingCalendar({ selected, onSelect, month, onMonthChange, dayStatuses, loading }: CalendarProps) {
//   const today   = todayDate();
//   const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
//   const lastDay  = new Date(month.getFullYear(), month.getMonth() + 1, 0);

//   // Build day grid (nulls for padding before first day)
//   const cells: (Date | null)[] = Array(firstDay.getDay()).fill(null);
//   for (let d = 1; d <= lastDay.getDate(); d++) {
//     cells.push(new Date(month.getFullYear(), month.getMonth(), d));
//   }
//   while (cells.length % 7 !== 0) cells.push(null);

//   const monthLabel = month.toLocaleDateString("en-US", { month: "long", year: "numeric" });

//   return (
//     <div>
//       {/* Month nav */}
//       <div className="flex items-center justify-between mb-3 px-1">
//         <button
//           onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
//           className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
//         >
//           <ChevronLeft className="w-4 h-4 text-gray-500" />
//         </button>
//         <div className="flex items-center gap-2">
//           <span className="text-[13px] font-semibold text-gray-800">{monthLabel}</span>
//           {loading && (
//             <span className="w-3 h-3 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
//           )}
//         </div>
//         <button
//           onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
//           className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
//         >
//           <ChevronRight className="w-4 h-4 text-gray-500" />
//         </button>
//       </div>

//       {/* Day-of-week headers */}
//       <div className="grid grid-cols-7 mb-1">
//         {DOW.map((d) => (
//           <p key={d} className="text-center text-[10.5px] font-semibold text-gray-400 py-1">{d}</p>
//         ))}
//       </div>

//       {/* Day cells */}
//       <div className="grid grid-cols-7 gap-y-1">
//         {cells.map((date, i) => {
//           if (!date) return <div key={i} />;

//           const dateStr    = toDateStr(date);
//           const isPast     = date < today;
//           const isToday    = date.getTime() === today.getTime();
//           const isSelected = selected ? toDateStr(selected) === dateStr : false;
//           const status     = dayStatuses.get(dateStr);
//           const isAvail    = status === "available";
//           const isBooked   = status === "booked";
//           const isBlocked  = status === "blocked";
//           // Booked = fav seat taken, but user can still pick the date to try 2nd fav / browse all
//           const isDisabled = isPast || isBlocked;

//           return (
//             <button
//               key={dateStr}
//               onClick={() => !isDisabled && onSelect(date)}
//               disabled={isDisabled}
//               className={cn(
//                 "relative flex flex-col items-center justify-center w-full aspect-square rounded-lg text-[12.5px] font-medium transition-all duration-100",
//                 isSelected
//                   ? "bg-indigo-600 text-white font-bold shadow-sm"
//                   : isDisabled
//                     ? "cursor-not-allowed"
//                     : "hover:bg-indigo-50 cursor-pointer",
//                 !isSelected && isToday   && "ring-1 ring-indigo-400",
//                 !isSelected && isPast    && "text-gray-300",
//                 !isSelected && isAvail   && "text-emerald-700 font-semibold",
//                 !isSelected && isBooked  && "text-red-300 line-through",
//                 !isSelected && isBlocked && "text-gray-300",
//                 !isSelected && !isPast && !isAvail && !isBooked && !isBlocked && "text-gray-700",
//               )}
//             >
//               {date.getDate()}
//               {/* Status dot */}
//               {!isPast && !isSelected && (isAvail || isBooked) && (
//                 <span
//                   className={cn(
//                     "absolute bottom-[3px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full",
//                     isAvail  ? "bg-emerald-500" : "bg-red-400",
//                   )}
//                 />
//               )}
//             </button>
//           );
//         })}
//       </div>

//       {/* Legend */}
//       <div className="flex items-center gap-4 mt-3 px-1">
//         <span className="flex items-center gap-1.5 text-[10.5px] text-gray-500">
//           <span className="w-2 h-2 rounded-full bg-emerald-500" />
//           Available
//         </span>
//         <span className="flex items-center gap-1.5 text-[10.5px] text-gray-500">
//           <span className="w-2 h-2 rounded-full bg-red-400" />
//           Booked
//         </span>
//         <span className="flex items-center gap-1.5 text-[10.5px] text-gray-500">
//           <span className="w-2 h-2 rounded-full bg-indigo-500" />
//           Selected
//         </span>
//       </div>
//     </div>
//   );
// }

// // ── Dialog ────────────────────────────────────────────────────────────────────

// export default function FavSeatBookingDialog({
//   seat, secondFavSeat, open, onClose, restoreOnOpen,
// }: Props) {
//   const router = useRouter();

//   const [selectedDate, setSelectedDate] = useState<Date | undefined>(todayDate);
//   const [date, setDate]                 = useState<string>(toDateStr(todayDate()));
//   const [avail, setAvail]               = useState<AvailState>({ phase: "idle" });
//   const [mounted, setMounted]           = useState(false);
//   const [displayMonth, setDisplayMonth] = useState<Date>(() => {
//     const d = new Date(); d.setDate(1); return d;
//   });
//   const [dayStatuses, setDayStatuses]   = useState<Map<string, DayStatus>>(new Map());
//   const [calLoading, setCalLoading]     = useState(false);

//   useEffect(() => { setMounted(true); }, []);

//   const fetchMonthAvailability = useCallback(async (month: Date) => {
//     if (!seat.floorId) return;
//     setCalLoading(true);
//     const todayD = todayDate();
//     const mStart = new Date(month.getFullYear(), month.getMonth(), 1);
//     // Clamp start to today — past dates have no booking value
//     const fromDate = mStart < todayD ? toDateStr(todayD) : firstOfMonth(month);
//     const toDate   = lastOfMonth(month);

//     try {
//       // Entire visible month is already past — nothing to fetch
//       if (fromDate > toDate) return;

//       const allSeats = await fetchAvailability({ floorId: seat.floorId, fromDate, toDate, calendarMode: true });

//       // Coerce both sides to string; fall back to seat_code match if seat_id differs
//       const match = allSeats.find(
//         (s) => String(s.seat_id) === String(seat.id) || s.seat_code === seat.seatCode
//       );
//       if (!match?.availability) return;

//       const av  = match.availability;
//       const map = new Map<string, DayStatus>();
//       // Normalize to YYYY-MM-DD in case API returns datetime-like strings
//       const key = (d: string) => String(d).substring(0, 10);

//       (av.available_dates   ?? []).forEach((d: string) => map.set(key(d), "available"));
//       (av.booked_dates      ?? []).forEach((d: string) => map.set(key(d), "booked"));
//       (av.blocked_dates     ?? []).forEach((d: string) => map.set(key(d), "blocked"));
//       (av.unavailable_dates ?? []).forEach((d: string) => {
//         if (!map.has(key(d))) map.set(key(d), "blocked");
//       });
//       (av.daily_statuses ?? []).forEach(
//         ({ booking_date, status }: { booking_date: string; status: string }) => {
//           const k = key(booking_date);
//           if (!map.has(k)) {
//             const s = status.toUpperCase();
//             map.set(k, s === "AVAILABLE" ? "available" : s === "BOOKED" ? "booked" : "blocked");
//           }
//         }
//       );
//       setDayStatuses(map);
//     } catch (err: unknown) {
//       // Backend 404 "no_available_seats" means every seat on the floor is fully
//       // booked/blocked for this range. Mark remaining days as booked so the
//       // calendar stays interactive — clicking still triggers the fallback flow.
//       if (axios.isAxiosError(err) && err.response?.status === 404) {
//         const map    = new Map<string, DayStatus>();
//         const startD = mStart < todayD ? todayD : mStart;
//         const mEnd   = new Date(month.getFullYear(), month.getMonth() + 1, 0);
//         for (let d = new Date(startD); d <= mEnd; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
//           map.set(toDateStr(d), "booked");
//         }
//         setDayStatuses(map);
//       }
//     } finally {
//       setCalLoading(false);
//     }
//   }, [seat.floorId, seat.id, seat.seatCode]);

//   useEffect(() => {
//     if (!open) return;
//     router.prefetch("/book");

//     if (restoreOnOpen) {
//       try {
//         const raw = sessionStorage.getItem(SESSION_KEY);
//         if (raw) {
//           const saved = JSON.parse(raw) as SavedDialogState;
//           const d = fromDateStr(saved.date);
//           setDate(saved.date);
//           setSelectedDate(d);
//           setAvail(saved.avail);
//           setDisplayMonth(new Date(d.getFullYear(), d.getMonth(), 1));
//           sessionStorage.removeItem(SESSION_KEY);
//           fetchMonthAvailability(new Date(d.getFullYear(), d.getMonth(), 1));
//           return;
//         }
//       } catch {}
//     }

//     const now = todayDate();
//     setSelectedDate(now);
//     setDate(toDateStr(now));
//     setAvail({ phase: "idle" });
//     const m = new Date(now.getFullYear(), now.getMonth(), 1);
//     setDisplayMonth(m);
//     fetchMonthAvailability(m);
//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [open]);

//   if (!open || !mounted) return null;

//   const handleClose = () => { setAvail({ phase: "idle" }); onClose(); };

//   const navigateWithState = (url: string) => {
//     sessionStorage.setItem(SESSION_KEY, JSON.stringify({ date, avail } satisfies SavedDialogState));
//     onClose();
//     router.push(url);
//   };

//   const handleDateSelect = (d: Date) => {
//     setSelectedDate(d);
//     setDate(toDateStr(d));
//     setAvail({ phase: "idle" });
//   };

//   const handleMonthChange = (month: Date) => {
//     setDisplayMonth(month);
//     setDayStatuses(new Map());
//     fetchMonthAvailability(month);
//   };

//   const handleContinue = async () => {
//     setAvail({ phase: "checking" });

//     try {
//       await checkSelfEligibility(date);
//     } catch (err) {
//       if (axios.isAxiosError(err) && err.response?.status === 409) {
//         const detail = err.response.data?.detail;
//         const msg = typeof detail === "object" && detail?.message
//           ? detail.message
//           : "You already have a booking on this date.";
//         setAvail({ phase: "self_conflict", message: msg });
//       } else {
//         setAvail({ phase: "self_conflict", message: "Unable to verify eligibility. Please try again." });
//       }
//       return;
//     }

//     try {
//       const firstOk = await isSeatAvailable(seat, date);
//       if (firstOk) { navigateWithState(buildBookUrl(seat, date)); return; }

//       let secondAvailable: boolean | null = null;
//       if (secondFavSeat) secondAvailable = await isSeatAvailable(secondFavSeat, date);
//       setAvail({ phase: "unavailable", secondAvailable });
//     } catch {
//       setAvail({ phase: "unavailable", secondAvailable: null });
//     }
//   };

//   const isSelfConflict = avail.phase === "self_conflict";
//   const isUnavailable  = avail.phase === "unavailable";
//   const hasError       = isSelfConflict || isUnavailable;
//   const isChecking     = avail.phase === "checking";

//   const [floorPart, sitePart] = seat.location.split(" · ");

//   return createPortal(
//     <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-end sm:justify-center bg-black/50 backdrop-blur-sm">
//       <div className="absolute inset-0" onClick={handleClose} />

//       <div className="relative w-full sm:max-w-[420px] sm:rounded-2xl rounded-t-3xl bg-white shadow-2xl flex flex-col max-h-[95dvh] overflow-hidden">

//         {/* ── Gradient header ── */}
//         <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 px-5 pt-5 pb-6 overflow-hidden shrink-0">
//           <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
//           <div className="absolute right-6 top-16 w-20 h-20 rounded-full bg-white/10" />
//           <div className="absolute -left-6 bottom-0 w-28 h-28 rounded-full bg-white/5" />

//           <button
//             onClick={handleClose}
//             className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors z-10"
//           >
//             <X size={15} className="text-white" />
//           </button>

//           <div className="flex items-center gap-1.5 mb-3">
//             <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
//             <span className="text-xs font-semibold text-white/80 uppercase tracking-widest">Favourite Seat</span>
//           </div>
//           <h2 className="text-2xl font-bold text-white leading-none mb-1">{seat.label}</h2>
//           <div className="flex flex-wrap items-center gap-1.5 mt-2">
//             {floorPart && (
//               <span className="flex items-center gap-1 text-[11px] font-medium text-indigo-100 bg-white/15 rounded-full px-2.5 py-1">
//                 <Building2 className="w-3 h-3" />{floorPart}
//               </span>
//             )}
//             {sitePart && (
//               <span className="flex items-center gap-1 text-[11px] font-medium text-indigo-100 bg-white/15 rounded-full px-2.5 py-1">
//                 <MapPin className="w-3 h-3" />{sitePart}
//               </span>
//             )}
//           </div>
//         </div>

//         {/* ── Body ── */}
//         <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 space-y-3">

//           {/* Calendar card */}
//           <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 pt-4 pb-3">
//             <BookingCalendar
//               selected={selectedDate}
//               onSelect={handleDateSelect}
//               month={displayMonth}
//               onMonthChange={handleMonthChange}
//               dayStatuses={dayStatuses}
//               loading={calLoading}
//             />
//           </div>

//           {/* ── Self-conflict error ── */}
//           {isSelfConflict && (
//             <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
//               <CalendarX className="w-4 h-4 text-amber-500 shrink-0" />
//               <div className="min-w-0">
//                 <p className="text-[12px] font-semibold text-amber-900 leading-snug">You already have a booking on this date</p>
//                 <p className="text-[11px] text-amber-600 mt-0.5">Please pick a different date to continue.</p>
//               </div>
//             </div>
//           )}

//           {/* ── Seat unavailability ── */}
//           {isUnavailable && (
//             <div className="space-y-2">
//               <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
//                 <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
//                 <div className="min-w-0">
//                   <p className="text-[12px] font-semibold text-red-900 leading-snug">{seat.label} is already booked</p>
//                   <p className="text-[11px] text-red-600 mt-0.5">Someone else has reserved this seat on this date.</p>
//                 </div>
//               </div>

//               {secondFavSeat && (avail as { phase: "unavailable"; secondAvailable: boolean | null }).secondAvailable === true && (
//                 <button
//                   onClick={() => navigateWithState(buildBookUrl(secondFavSeat, date))}
//                   className="w-full flex items-center justify-between gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2.5 hover:bg-indigo-100 transition-colors group"
//                 >
//                   <div className="flex items-center gap-2 min-w-0">
//                     <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
//                     <div className="text-left min-w-0">
//                       <p className="text-[11.5px] font-semibold text-indigo-900 leading-none">Book {secondFavSeat.label} instead</p>
//                       <p className="text-[10.5px] text-indigo-500 mt-0.5">{secondFavSeat.location} · available</p>
//                     </div>
//                   </div>
//                   <ArrowRight className="w-3.5 h-3.5 text-indigo-500 shrink-0 group-hover:translate-x-0.5 transition-transform" />
//                 </button>
//               )}

//               {secondFavSeat && (avail as { phase: "unavailable"; secondAvailable: boolean | null }).secondAvailable === false && (
//                 <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
//                   <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
//                   <p className="text-[11px] text-amber-700">
//                     <span className="font-semibold">{secondFavSeat.label}</span> is also booked.
//                   </p>
//                 </div>
//               )}
//             </div>
//           )}
//         </div>

//         {/* ── Footer ── */}
//         <div className="shrink-0 px-4 pb-5 pt-3 border-t border-gray-100 space-y-2">
//           {/* Selected date label */}
//           {selectedDate && (
//             <p className="text-center text-[11px] text-gray-400">
//               Selected:{" "}
//               <span className="font-semibold text-indigo-600">
//                 {selectedDate.toLocaleDateString("en-US", {
//                   weekday: "short", month: "short", day: "numeric", year: "numeric",
//                 })}
//               </span>
//             </p>
//           )}

//           {!hasError ? (
//             <div className="flex gap-3">
//               <button
//                 onClick={handleClose}
//                 className="flex-1 py-3 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={handleContinue}
//                 disabled={!date || isChecking}
//                 className="flex-[2] py-3 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-200"
//               >
//                 {isChecking ? (
//                   <>
//                     <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
//                     Checking…
//                   </>
//                 ) : (
//                   <>Continue to Book <ArrowRight className="w-4 h-4" /></>
//                 )}
//               </button>
//             </div>
//           ) : isSelfConflict ? (
//             <div className="flex gap-3">
//               <button
//                 onClick={handleClose}
//                 className="flex-1 py-3 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={() => setAvail({ phase: "idle" })}
//                 className="flex-[2] py-3 text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors flex items-center justify-center gap-2"
//               >
//                 <CalendarX className="w-4 h-4" />
//                 Pick another date
//               </button>
//             </div>
//           ) : (
//             <div className="flex gap-3">
//               <button
//                 onClick={handleClose}
//                 className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={() => navigateWithState(buildBrowseUrl(seat, date))}
//                 className="flex-[2] py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-200"
//               >
//                 <MapPin className="w-3.5 h-3.5" />
//                 Browse all seats
//               </button>
//             </div>
//           )}
//         </div>

//       </div>
//     </div>,
//     document.body
//   );
// }


"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Star, X, AlertCircle, MapPin, ArrowRight,
  CalendarX, Building2, ChevronLeft, ChevronRight,
} from "lucide-react";
import axios from "axios";
import { cn } from "@/lib/utils";
import type { FavouriteSeat } from "../types/dashboard.types";
import { fetchAvailability } from "@/features/book/services/Bookingform.service";
import { axiosInstance } from "@/lib/http/axios";

// ── Date helpers ──────────────────────────────────────────────────────────────

function todayDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fromDateStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function firstOfMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function lastOfMonth(d: Date): string {
  return toDateStr(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

// ── Types ─────────────────────────────────────────────────────────────────────

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

type DayStatus = "available" | "booked" | "blocked";

// ── URL builders ─────────────────────────────────────────────────────────────

function buildBookUrl(seat: FavouriteSeat, date: string): string {
  const p = new URLSearchParams({ fromDate: date, toDate: date, step: "3", source: "dashboard" });
  if (seat.siteId) p.set("siteId", seat.siteId);
  if (seat.buildingId) p.set("buildingId", seat.buildingId);
  if (seat.floorId) p.set("floorId", seat.floorId);
  if (seat.id) p.set("seatId", seat.id);
  if (seat.label) p.set("seatLabel", seat.label);
  if (seat.floor) p.set("floorName", seat.floor);
  return `/book?${p.toString()}`;
}

function buildBrowseUrl(seat: FavouriteSeat, date: string): string {
  const p = new URLSearchParams({ fromDate: date, toDate: date, step: "2", source: "dashboard" });
  if (seat.siteId) p.set("siteId", seat.siteId);
  if (seat.buildingId) p.set("buildingId", seat.buildingId);
  if (seat.floorId) p.set("floorId", seat.floorId);
  return `/book?${p.toString()}`;
}

// ── API helpers ───────────────────────────────────────────────────────────────

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

// ── Inline mini-calendar ──────────────────────────────────────────────────────

const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

interface CalendarProps {
  selected: Date | undefined;
  onSelect: (d: Date) => void;
  month: Date;
  onMonthChange: (m: Date) => void;
  dayStatuses: Map<string, DayStatus>;
  loading: boolean;
}

function BookingCalendar({ selected, onSelect, month, onMonthChange, dayStatuses, loading }: CalendarProps) {
  const today = todayDate();
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  // Build day grid (nulls for padding before first day)
  const cells: (Date | null)[] = Array(firstDay.getDay()).fill(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), d));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = month.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-1.5 px-1">
        <button
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
        </button>
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-semibold text-gray-800">{monthLabel}</span>
          {loading && (
            <span className="w-2.5 h-2.5 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
          )}
        </div>
        <button
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-0.5">
        {DOW.map((d) => (
          <p key={d} className="text-center text-[9.5px] font-semibold text-gray-400 py-0.5">{d}</p>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;

          const dateStr = toDateStr(date);
          const isPast = date < today;
          const isToday = date.getTime() === today.getTime();
          const isSelected = selected ? toDateStr(selected) === dateStr : false;
          const status = dayStatuses.get(dateStr);
          const isAvail = status === "available";
          const isBooked = status === "booked";
          const isBlocked = status === "blocked";
          // Booked = fav seat taken, but user can still pick the date to try 2nd fav / browse all
          const isDisabled = isPast || isBlocked;

          return (
            <button
              key={dateStr}
              onClick={() => !isDisabled && onSelect(date)}
              disabled={isDisabled}
              className={cn(
                "relative flex flex-col items-center justify-center w-full aspect-square rounded-md text-[11px] font-medium transition-all duration-100",
                isSelected
                  ? "bg-indigo-600 text-white font-bold shadow-sm"
                  : isDisabled
                    ? "cursor-not-allowed"
                    : "hover:bg-indigo-50 cursor-pointer",
                !isSelected && isToday && "ring-1 ring-indigo-400",
                !isSelected && isPast && "text-gray-300",
                !isSelected && isAvail && "text-emerald-700 font-semibold",
                !isSelected && isBooked && "text-red-300",
                !isSelected && isBlocked && "text-gray-300",
                !isSelected && !isPast && !isAvail && !isBooked && !isBlocked && "text-gray-700",
              )}
            >
              {date.getDate()}
              {/* Status dot */}
              {!isPast && !isSelected && (isAvail || isBooked) && (
                <span
                  className={cn(
                    "absolute bottom-[2px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full",
                    isAvail ? "bg-emerald-500" : "bg-red-400",
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-1.5 px-1">
        <span className="flex items-center gap-1 text-[9.5px] text-gray-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Available
        </span>
        <span className="flex items-center gap-1 text-[9.5px] text-gray-500">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          Booked
        </span>
        <span className="flex items-center gap-1 text-[9.5px] text-gray-500">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          Selected
        </span>
      </div>
    </div>
  );
}

// ── Dialog ────────────────────────────────────────────────────────────────────

export default function FavSeatBookingDialog({
  seat, secondFavSeat, open, onClose, restoreOnOpen,
}: Props) {
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(todayDate);
  const [date, setDate] = useState<string>(toDateStr(todayDate()));
  const [avail, setAvail] = useState<AvailState>({ phase: "idle" });
  const [mounted, setMounted] = useState(false);
  const [displayMonth, setDisplayMonth] = useState<Date>(() => {
    const d = new Date(); d.setDate(1); return d;
  });
  const [dayStatuses, setDayStatuses] = useState<Map<string, DayStatus>>(new Map());
  const [calLoading, setCalLoading] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchMonthAvailability = useCallback(async (month: Date) => {
    if (!seat.floorId) return;
    setCalLoading(true);
    const todayD = todayDate();
    const mStart = new Date(month.getFullYear(), month.getMonth(), 1);
    // Clamp start to today — past dates have no booking value
    const fromDate = mStart < todayD ? toDateStr(todayD) : firstOfMonth(month);
    const toDate = lastOfMonth(month);

    try {
      // Entire visible month is already past — nothing to fetch
      if (fromDate > toDate) return;

      // Fetch seat availability and the user's own bookings in parallel
      const [allSeats, myBookedDates] = await Promise.all([
        fetchAvailability({ floorId: seat.floorId, fromDate, toDate, calendarMode: true }),
        (async (): Promise<Set<string>> => {
          try {
            const [cur, fut] = await Promise.all([
              axiosInstance.get<{ booking_date: string; from_date?: string | null; to_date?: string | null; booking_status?: string }[]>("/bookings/me/current"),
              axiosInstance.get<{ booking_date: string; from_date?: string | null; to_date?: string | null; booking_status?: string }[]>("/bookings/me/future"),
            ]);
            const dates = new Set<string>();
            [...(cur.data ?? []), ...(fut.data ?? [])].forEach((b) => {
              if ((b.booking_status ?? "").toUpperCase() === "CANCELLED") return;
              const start = b.from_date ?? b.booking_date;
              const end = b.to_date ?? b.booking_date;
              let d = new Date(start + "T00:00:00");
              const endD = new Date(end + "T00:00:00");
              while (d <= endD) { dates.add(toDateStr(d)); d = new Date(d.getTime() + 86400000); }
            });
            return dates;
          } catch { return new Set<string>(); }
        })(),
      ]);

      // Coerce both sides to string; fall back to seat_code match if seat_id differs
      const match = allSeats.find(
        (s) => String(s.seat_id) === String(seat.id) || s.seat_code === seat.seatCode
      );
      if (!match?.availability) return;

      const av = match.availability;
      const map = new Map<string, DayStatus>();
      // Normalize to YYYY-MM-DD in case API returns datetime-like strings
      const key = (d: string) => String(d).substring(0, 10);

      (av.available_dates ?? []).forEach((d: string) => map.set(key(d), "available"));
      (av.booked_dates ?? []).forEach((d: string) => map.set(key(d), "booked"));
      (av.blocked_dates ?? []).forEach((d: string) => map.set(key(d), "blocked"));
      (av.unavailable_dates ?? []).forEach((d: string) => {
        if (!map.has(key(d))) map.set(key(d), "blocked");
      });
      (av.daily_statuses ?? []).forEach(
        ({ booking_date, status }: { booking_date: string; status: string }) => {
          const k = key(booking_date);
          if (!map.has(k)) {
            const s = status.toUpperCase();
            map.set(k, s === "AVAILABLE" ? "available" : s === "BOOKED" ? "booked" : "blocked");
          }
        }
      );

      // Overlay user's own bookings — these dates must show red (self-conflict)
      // regardless of whether the favourite seat itself is physically available.
      myBookedDates.forEach((d) => { if (map.has(d)) map.set(d, "booked"); });

      setDayStatuses(map);
    } catch (err: unknown) {
      // Backend 404 "no_available_seats" means every seat on the floor is fully
      // booked/blocked for this range. Mark remaining days as booked so the
      // calendar stays interactive — clicking still triggers the fallback flow.
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        const map = new Map<string, DayStatus>();
        const startD = mStart < todayD ? todayD : mStart;
        const mEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
        for (let d = new Date(startD); d <= mEnd; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
          map.set(toDateStr(d), "booked");
        }
        setDayStatuses(map);
      }
    } finally {
      setCalLoading(false);
    }
  }, [seat.floorId, seat.id, seat.seatCode]);

  useEffect(() => {
    if (!open) return;
    router.prefetch("/book");

    if (restoreOnOpen) {
      try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as SavedDialogState;
          const d = fromDateStr(saved.date);
          setDate(saved.date);
          setSelectedDate(d);
          setAvail(saved.avail);
          setDisplayMonth(new Date(d.getFullYear(), d.getMonth(), 1));
          sessionStorage.removeItem(SESSION_KEY);
          fetchMonthAvailability(new Date(d.getFullYear(), d.getMonth(), 1));
          return;
        }
      } catch { }
    }

    const now = todayDate();
    setSelectedDate(now);
    setDate(toDateStr(now));
    setAvail({ phase: "idle" });
    const m = new Date(now.getFullYear(), now.getMonth(), 1);
    setDisplayMonth(m);
    fetchMonthAvailability(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || !mounted) return null;

  const handleClose = () => { setAvail({ phase: "idle" }); onClose(); };

  const navigateWithState = (url: string, savedDate: string = date) => {
    // Always restore as idle — navigation means the check passed, no error to carry back.
    // Accept savedDate explicitly to avoid stale closure when called from async context.
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ date: savedDate, avail: { phase: "idle" } } satisfies SavedDialogState));
    onClose();
    router.push(url);
  };

  // Shared eligibility + seat check. autoNavigate=true → go to booking page on success;
  // autoNavigate=false → just surface the reason (used when clicking a red calendar date).
  const runAvailabilityCheck = async (targetDate: string, autoNavigate: boolean) => {
    setAvail({ phase: "checking" });

    try {
      await checkSelfEligibility(targetDate);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        const detail = err.response.data?.detail;
        const msg = typeof detail === "object" && detail?.message
          ? detail.message
          : "You already have a booking on this date.";
        setAvail({ phase: "self_conflict", message: msg });
      } else {
        setAvail({ phase: "self_conflict", message: "Unable to verify eligibility. Please try again." });
      }
      return;
    }

    try {
      const firstOk = await isSeatAvailable(seat, targetDate);
      if (firstOk) {
        if (autoNavigate) {
          navigateWithState(buildBookUrl(seat, targetDate), targetDate);
        } else {
          setAvail({ phase: "idle" }); // seat is free — let user click Continue to Book
        }
        return;
      }

      let secondAvailable: boolean | null = null;
      if (secondFavSeat) secondAvailable = await isSeatAvailable(secondFavSeat, targetDate);
      setAvail({ phase: "unavailable", secondAvailable });
    } catch {
      setAvail({ phase: "unavailable", secondAvailable: null });
    }
  };

  const handleDateSelect = (d: Date) => {
    const dateStr = toDateStr(d);
    setSelectedDate(d);
    setDate(dateStr);
    // Booked (red): reveal reason without navigating; all other dates: check and navigate if OK
    runAvailabilityCheck(dateStr, dayStatuses.get(dateStr) !== "booked");
  };

  const handleMonthChange = (month: Date) => {
    setDisplayMonth(month);
    setDayStatuses(new Map());
    setAvail({ phase: "idle" }); // clear any per-date message when switching months
    fetchMonthAvailability(month);
  };

  const handleContinue = () => runAvailabilityCheck(date, true);

  const isSelfConflict = avail.phase === "self_conflict";
  const isUnavailable = avail.phase === "unavailable";
  const hasError = isSelfConflict || isUnavailable;
  const isChecking = avail.phase === "checking";

  const [floorPart, sitePart] = seat.location.split(" · ");

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-end sm:justify-center bg-black/50 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={handleClose} />

      <div className="relative w-full sm:max-w-[380px] sm:rounded-2xl rounded-t-3xl bg-white shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden">

        {/* ── Gradient header ── */}
        <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 px-4 pt-3.5 pb-3.5 overflow-hidden shrink-0">
          <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute right-6 top-12 w-16 h-16 rounded-full bg-white/10" />
          <div className="absolute -left-6 bottom-0 w-24 h-24 rounded-full bg-white/5" />

          <button
            onClick={handleClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors z-10"
          >
            <X size={14} className="text-white" />
          </button>

          <div className="flex items-center gap-1.5 mb-1.5">
            <Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
            <span className="text-[11px] font-semibold text-white/80 uppercase tracking-widest">Favourite Seat</span>
          </div>
          <h2 className="text-xl font-bold text-white leading-none mb-1">{seat.label}</h2>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {floorPart && (
              <span className="flex items-center gap-1 text-[10.5px] font-medium text-indigo-100 bg-white/15 rounded-full px-2 py-0.5">
                <Building2 className="w-3 h-3" />{floorPart}
              </span>
            )}
            {sitePart && (
              <span className="flex items-center gap-1 text-[10.5px] font-medium text-indigo-100 bg-white/15 rounded-full px-2 py-0.5">
                <MapPin className="w-3 h-3" />{sitePart}
              </span>
            )}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-hidden px-3.5 pt-2.5 pb-1.5">

          {/* Calendar card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 pt-2.5 pb-2">
            <BookingCalendar
              selected={selectedDate}
              onSelect={handleDateSelect}
              month={displayMonth}
              onMonthChange={handleMonthChange}
              dayStatuses={dayStatuses}
              loading={calLoading}
            />
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 px-3.5 pb-3.5 pt-2 border-t border-gray-100 space-y-1.5">
          {/* Selected date label */}
          {selectedDate && (
            <p className="text-center text-[10px] text-gray-400">
              Selected:{" "}
              <span className="font-semibold text-indigo-600">
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "short", month: "short", day: "numeric", year: "numeric",
                })}
              </span>
            </p>
          )}

          {/* ── Self-conflict error ── */}
          {isSelfConflict && (
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
              <CalendarX className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-amber-900 leading-snug">You already have a confirmed booking for</p>
                <p className="text-[12px] font-bold text-amber-700 leading-snug mt-0.5">
                  {selectedDate?.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" }) ?? "this date"}
                </p>
                <p className="text-[10px] text-amber-600 mt-1">Please pick a different date to continue.</p>
              </div>
            </div>
          )}

          {/* ── Seat unavailability ── */}
          {isUnavailable && (() => {
            const secondAvail = (avail as { phase: "unavailable"; secondAvailable: boolean | null }).secondAvailable;

            if (secondFavSeat && secondAvail === false) {
              return (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-red-900 leading-snug">Your favourite seats are unavailable</p>
                    <p className="text-[10px] text-red-600 mt-0.5">Choose a different seat to continue booking.</p>
                  </div>
                </div>
              );
            }

            return (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-red-900 leading-snug">{seat.label} is already booked</p>
                    <p className="text-[10px] text-red-600 mt-0.5">Someone else has reserved this seat on this date.</p>
                  </div>
                </div>

                {secondFavSeat && secondAvail === true && (
                  <button
                    onClick={() => navigateWithState(buildBookUrl(secondFavSeat, date))}
                    className="w-full flex items-center justify-between gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2 hover:bg-indigo-100 transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                      <div className="text-left min-w-0">
                        <p className="text-[10.5px] font-semibold text-indigo-900 leading-none">Book {secondFavSeat.label} instead</p>
                        <p className="text-[9.5px] text-indigo-500 mt-0.5">{secondFavSeat.location} · available</p>
                      </div>
                    </div>
                    <ArrowRight className="w-3 h-3 text-indigo-500 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}
              </div>
            );
          })()}

          {!hasError ? (
            <div className="flex gap-2.5">
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 text-[13px] font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleContinue}
                disabled={!date || isChecking}
                className="flex-[2] py-2.5 text-[13px] font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-200"
              >
                {isChecking ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Checking…
                  </>
                ) : (
                  <>Continue to Book <ArrowRight className="w-3.5 h-3.5" /></>
                )}
              </button>
            </div>
          ) : isSelfConflict ? (
            <div className="flex gap-2.5">
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 text-[13px] font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setAvail({ phase: "idle" })}
                className="flex-[2] py-2.5 text-[13px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors flex items-center justify-center gap-2"
              >
                <CalendarX className="w-3.5 h-3.5" />
                Pick another date
              </button>
            </div>
          ) : (
            <div className="flex gap-2.5">
              <button
                onClick={handleClose}
                className="flex-1 py-2 text-[13px] font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => navigateWithState(buildBrowseUrl(seat, date))}
                className="flex-[2] py-2 text-[13px] font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-200"
              >
                <MapPin className="w-3 h-3" />
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