"use client";

import { useEffect, useState } from "react";
import { fetchQuickPickSeats, fetchTomorrowBooking } from "../services/Bookingform.service";
import { QuickPickSeat, TomorrowBooking } from "../types/Bookingform.types";

// Backs the Step 1 right-hand sidebar ("Tomorrow, already booked" +
// "Quick picks"). Both calls are self/own-booking data (dashboard favourite
// seats + the user's own future bookings) — callers should only render this
// for the logged-in user's own booking flow, not book-for-someone/guest/modify.
export function useBookingSidebar() {
  const [tomorrow, setTomorrow] = useState<TomorrowBooking | null>(null);
  const [quickPicks, setQuickPicks] = useState<QuickPickSeat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([fetchTomorrowBooking(), fetchQuickPickSeats()]).then(
      ([tomorrowResult, quickPicksResult]) => {
        if (cancelled) return;
        setTomorrow(tomorrowResult.status === "fulfilled" ? tomorrowResult.value : null);
        setQuickPicks(quickPicksResult.status === "fulfilled" ? quickPicksResult.value : []);
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return { tomorrow, quickPicks, loading };
}
