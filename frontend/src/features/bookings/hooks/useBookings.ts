"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchCurrentBookings,
  fetchFutureBookings,
  fetchPastBookings,
  fetchCancelledBookings,
  fetchDelegatedCurrentBookings,
  fetchDelegatedFutureBookings,
  fetchDelegatedPastBookings,
  fetchDelegatedCancelledVisits,
  deriveBookingSummary,
  fetchTeamGroups,
  fetchCurrentUser,
} from "../services/bookings.service";
import { Booking, BookingSummary, BookingTab } from "../types/bookings.types";
import type { ApiTeamGroup } from "@/features/dashboard/types/dashboard.types";

interface UseBookingsReturn {
  displayedBookings: Booking[];
  delegatedBookings: Booking[];
  cancelledDelegatedBookings: Booking[];
  summary:           BookingSummary;
  activeTab:         BookingTab;
  isLoading:         boolean;
  error:             string | null;
  setActiveTab:      (tab: BookingTab) => void;
  handleCancelBooking: (bookingId: string) => Promise<void>;
  handleCancelDelegatedBooking: () => void;
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
  const [delegatedBookings, setDelegatedBookings] = useState<Booking[]>([]);
  const [cancelledDelegatedBookings, setCancelledDelegatedBookings] = useState<Booking[]>([]);
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
      const [user, groups] = await Promise.all([
        fetchCurrentUser(),
        fetchTeamGroups(),
      ]);
      const uid = user.user_id;
      setCurrentUserId(uid);
      setTeamGroups(groups);

      const [current, future, past, cancelled, delCurrent, delFuture, delPast, delCancelled] = await Promise.all([
        fetchCurrentBookings(uid),
        fetchFutureBookings(uid),
        fetchPastBookings(uid),
        fetchCancelledBookings(uid),
        fetchDelegatedCurrentBookings(uid),
        fetchDelegatedFutureBookings(uid),
        fetchDelegatedPastBookings(uid),
        fetchDelegatedCancelledVisits(),
      ]);

      setCurrentBookings(current);
      setFutureBookings(future);
      setPastBookings(past);
      setCancelledBookings(cancelled);
      const allDelegated = [...delCurrent, ...delFuture, ...delPast];
      const visitIdsWithBooking = new Set(
        allDelegated
          .filter((b) => b.bookingType === "guest" && b.guestVisitId)
          .map((b) => b.guestVisitId),
      );
      const merged = allDelegated.filter(
        (b) => !(b.bookingType === "visit" && visitIdsWithBooking.has(b.id)),
      );
      setDelegatedBookings(merged);
      setCancelledDelegatedBookings(delCancelled);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // ── FIX 2: Cancel — strip status tags and prepend so newest appears first ─
  // Prepending to cancelledBookings (instead of appending) means the freshly
  // cancelled entry is at the top of the list before the descending date sort
  // in MyBookingsPage kicks in. Filtering out "confirmed"-variant tags prevents
  // the green Confirmed chip from appearing on a cancelled card until refresh.

  const handleCancelBooking = useCallback(
    async (bookingId: string) => {
      const target =
        currentBookings.find((b) => b.id === bookingId) ??
        futureBookings.find((b) => b.id === bookingId);

      if (target) {
        setCancelledBookings((prev) => [
          // Prepend so newest cancelled booking is first
          {
            ...target,
            status: "cancelled" as const,
            // Strip "confirmed" / status-style tags — only show the Cancelled badge
            tags: (target.tags ?? []).filter(
              (t) =>
                t.variant !== "confirmed" &&
                t.label.toLowerCase() !== "confirmed"
            ),
          },
          ...prev,
        ]);
      }

      setCurrentBookings((prev) => prev.filter((b) => b.id !== bookingId));
      setFutureBookings((prev)  => prev.filter((b) => b.id !== bookingId));
    },
    [currentBookings, futureBookings],
  );

  const handleCancelDelegatedBooking = useCallback(
    () => { loadBookings(); },
    [loadBookings],
  );

  // ── Displayed bookings per tab ────────────────────────────────────────────
  const displayedBookings: Booking[] = (() => {
    switch (activeTab) {
      case "upcoming":
        return [...currentBookings, ...futureBookings]
          .filter((b) => b.status !== "cancelled")
          .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
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
    delegatedBookings,
    cancelledDelegatedBookings,
    summary,
    activeTab,
    isLoading,
    error,
    setActiveTab,
    handleCancelBooking,
    handleCancelDelegatedBooking,
    refreshBookings: loadBookings,
  };
}