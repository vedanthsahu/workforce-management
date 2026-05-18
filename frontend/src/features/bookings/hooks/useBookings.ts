// "use client";

// import { useState, useEffect, useCallback } from "react";
// import {
//   fetchCurrentBookings,
//   fetchFutureBookings,
//   fetchPastBookings,
//   fetchCancelledBookings,
//   cancelBooking,
//   deriveBookingSummary,
//   fetchTeamGroups,
//   fetchCurrentUser,
// } from "../services/bookings.service";
// import { Booking, BookingSummary, BookingTab } from "../types/bookings.types";
// import type { ApiTeamGroup } from "@/features/dashboard/types/dashboard.types";

// interface UseBookingsReturn {
//   displayedBookings: Booking[];
//   summary: BookingSummary;
//   activeTab: BookingTab;
//   isLoading: boolean;
//   error: string | null;
//   setActiveTab: (tab: BookingTab) => void;
//   handleCancelBooking: (bookingId: string) => Promise<void>;
//   refreshBookings: () => void;
// }

// export function useBookings(): UseBookingsReturn {
//   const [activeTab, setActiveTab] = useState<BookingTab>("upcoming");
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   const [currentBookings, setCurrentBookings] = useState<Booking[]>([]);
//   const [futureBookings, setFutureBookings] = useState<Booking[]>([]);
//   const [pastBookings, setPastBookings] = useState<Booking[]>([]);
//   const [cancelledBookings, setCancelledBookings] = useState<Booking[]>([]);
//   const [teamGroups, setTeamGroups] = useState<ApiTeamGroup[]>([]);
//   const [currentUserId, setCurrentUserId] = useState<string>("");
//   const [summary, setSummary] = useState<BookingSummary>({
//     upcomingCount: 0,
//     nextBookingDate: null,
//     completedThisMonth: 0,
//     daysInOffice: 0,
//     teamInOffice: 0,
//   });

//   const loadBookings = useCallback(async () => {
//     setIsLoading(true);
//     setError(null);
//     try {
//       const [current, future, past, cancelled, groups, user] = await Promise.all([
//         fetchCurrentBookings(),
//         fetchFutureBookings(),
//         fetchPastBookings(),
//         fetchCancelledBookings(),
//         fetchTeamGroups(),
//         fetchCurrentUser(),
//       ]);

//       setCurrentBookings(current);
//       setFutureBookings(future);
//       setPastBookings(past);
//       setCancelledBookings(cancelled);
//       setTeamGroups(groups);
//       setCurrentUserId(user.user_id);
//       setSummary(deriveBookingSummary(current, future, past, groups, user.user_id));
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Failed to load bookings");
//     } finally {
//       setIsLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     loadBookings();
//   }, [loadBookings]);

//   // Does NOT call cancelBooking — the page already did that.
//   // Only updates local state optimistically.
//   const handleCancelBooking = useCallback(
//     async (bookingId: string) => {
//       const markCancelled = (list: Booking[]): Booking[] =>
//         list.map((b) => (b.id === bookingId ? { ...b, status: "cancelled" as const } : b));

//       setCurrentBookings((prev) => {
//         const updated = markCancelled(prev);
//         setFutureBookings((fut) => {
//           const updatedFut = markCancelled(fut);
//           setPastBookings((past) => {
//             setSummary(deriveBookingSummary(updated, updatedFut, past, teamGroups, currentUserId));
//             return past;
//           });
//           return updatedFut;
//         });
//         return updated;
//       });

//       setCancelledBookings((prev) => {
//         const target =
//           currentBookings.find((b) => b.id === bookingId) ??
//           futureBookings.find((b) => b.id === bookingId);
//         return target ? [...prev, { ...target, status: "cancelled" as const }] : prev;
//       });
//     },
//     [teamGroups, currentUserId, currentBookings, futureBookings]
//   );

//   const displayedBookings = (() => {
//     switch (activeTab) {
//       case "upcoming":
//         return [...currentBookings, ...futureBookings].filter((b) => b.status !== "cancelled");
//       case "past":
//         return pastBookings;
//       case "recurring":
//         return [...currentBookings, ...futureBookings].filter(
//           (b) => b.isRecurring && b.status !== "cancelled"
//         );
//       case "cancelled":
//         return cancelledBookings;
//       default:
//         return [];
//     }
//   })();

//   return {
//     displayedBookings,
//     summary,
//     activeTab,
//     isLoading,
//     error,
//     setActiveTab,
//     handleCancelBooking,
//     refreshBookings: loadBookings,
//   };
// }


"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchCurrentBookings,
  fetchFutureBookings,
  fetchPastBookings,
  fetchCancelledBookings,
  deriveBookingSummary,
  fetchTeamGroups,
  fetchCurrentUser,
} from "../services/bookings.service";
import { Booking, BookingSummary, BookingTab } from "../types/bookings.types";
import type { ApiTeamGroup } from "@/features/dashboard/types/dashboard.types";

interface UseBookingsReturn {
  displayedBookings: Booking[];
  summary:           BookingSummary;
  activeTab:         BookingTab;
  isLoading:         boolean;
  error:             string | null;
  setActiveTab:      (tab: BookingTab) => void;
  handleCancelBooking: (bookingId: string) => Promise<void>;
  refreshBookings:   () => void;
}

export function useBookings(): UseBookingsReturn {
  const [activeTab, setActiveTab]             = useState<BookingTab>("upcoming");
  const [isLoading, setIsLoading]             = useState(true);
  const [error, setError]                     = useState<string | null>(null);

  const [currentBookings,   setCurrentBookings]   = useState<Booking[]>([]);
  const [futureBookings,    setFutureBookings]     = useState<Booking[]>([]);
  const [pastBookings,      setPastBookings]       = useState<Booking[]>([]);
  const [cancelledBookings, setCancelledBookings]  = useState<Booking[]>([]);
  const [teamGroups,        setTeamGroups]         = useState<ApiTeamGroup[]>([]);
  const [currentUserId,     setCurrentUserId]      = useState<string>("");

  const [summary, setSummary] = useState<BookingSummary>({
    upcomingCount:      0,
    nextBookingDate:    null,
    completedThisMonth: 0,
    daysInOffice:       0,
    teamInOffice:       0,
  });

  // ── Single source of truth for summary ───────────────────────────────────
  useEffect(() => {
    setSummary(
      deriveBookingSummary(
        currentBookings,
        futureBookings,
        pastBookings,
        teamGroups,
        currentUserId,
      )
    );
  }, [currentBookings, futureBookings, pastBookings, teamGroups, currentUserId]);

  // ── Load all data ─────────────────────────────────────────────────────────
  const loadBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [current, future, past, cancelled, groups, user] = await Promise.all([
        fetchCurrentBookings(),
        fetchFutureBookings(),
        fetchPastBookings(),
        fetchCancelledBookings(),
        fetchTeamGroups(),
        fetchCurrentUser(),
      ]);

      setCurrentBookings(current);
      setFutureBookings(future);
      setPastBookings(past);
      setCancelledBookings(cancelled);
      setTeamGroups(groups);
      setCurrentUserId(user.user_id);
      // ✅ No setSummary here — the useEffect above handles it reactively
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // ── Cancel: mutate lists only; summary re-derives via useEffect ───────────
  const handleCancelBooking = useCallback(
    async (bookingId: string) => {
      const target =
        currentBookings.find((b) => b.id === bookingId) ??
        futureBookings.find((b) => b.id === bookingId);

      if (target) {
        setCancelledBookings((prev) => [
          ...prev,
          { ...target, status: "cancelled" as const },
        ]);
      }

      setCurrentBookings((prev) => prev.filter((b) => b.id !== bookingId));
      setFutureBookings((prev)  => prev.filter((b) => b.id !== bookingId));
    },
    [currentBookings, futureBookings],
  );

  // ── Displayed bookings per tab ────────────────────────────────────────────
  const displayedBookings: Booking[] = (() => {
    switch (activeTab) {
      case "upcoming":
        return [...currentBookings, ...futureBookings].filter(
          (b) => b.status !== "cancelled"
        );
      case "past":
        return pastBookings;
      case "recurring":
        return [...currentBookings, ...futureBookings].filter(
          (b) => b.isRecurring && b.status !== "cancelled"
        );
      case "cancelled":
        return cancelledBookings;
      default:
        return [];
    }
  })();

  return {
    displayedBookings,
    summary,
    activeTab,
    isLoading,
    error,
    setActiveTab,
    handleCancelBooking,
    refreshBookings: loadBookings,
  };
}