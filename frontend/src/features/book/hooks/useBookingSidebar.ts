"use client";

import { useEffect, useState } from "react";
import { fetchQuickPickSeats, fetchNextBooking, isQuickPickSeatAvailable } from "../services/Bookingform.service";
import { QuickPickSeat, NextBooking } from "../types/Bookingform.types";

// Backs the Step 1 right-hand sidebar ("Tomorrow"/"Next booking" +
// "Quick picks"). Both calls are self/own-booking data (dashboard favourite
// seats + the user's own future bookings) — callers should only render this
// for the logged-in user's own booking flow, not book-for-someone/guest/modify.
//
// fromDate/toDate gate the Quick Picks list itself, not just the click: a
// favourite/frequent seat only shows up here if it's actually free for the
// currently selected date(s) (defaulting to today) — re-checked whenever
// those dates change. A seat that's booked (by anyone) for that date isn't
// offered as a one-tap shortcut at all, rather than only failing once
// clicked.
export function useBookingSidebar(fromDate: string, toDate: string) {
  const [nextBooking, setNextBooking] = useState<NextBooking | null>(null);
  const [quickPicks, setQuickPicks] = useState<QuickPickSeat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.allSettled([fetchNextBooking(), fetchQuickPickSeats()]).then(
      async ([nextBookingResult, quickPicksResult]) => {
        if (cancelled) return;
        setNextBooking(nextBookingResult.status === "fulfilled" ? nextBookingResult.value : null);

        const candidates = quickPicksResult.status === "fulfilled" ? quickPicksResult.value : [];
        if (candidates.length === 0) {
          setQuickPicks([]);
          setLoading(false);
          return;
        }

        const availability = await Promise.allSettled(
          candidates.map((seat) => isQuickPickSeatAvailable(seat, fromDate, toDate))
        );
        if (cancelled) return;

        // A rejected check (including the availability endpoint's own
        // "you already have another active booking this date" conflict —
        // see user_has_active_booking_in_range in booking_service.py,
        // which applies uniformly regardless of which seat) is treated the
        // same as "not available": don't offer a shortcut that's already
        // known to fail.
        setQuickPicks(
          candidates.filter((_, i) => {
            const result = availability[i];
            return result.status === "fulfilled" && result.value;
          })
        );
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [fromDate, toDate]);

  return { nextBooking, quickPicks, loading };
}
