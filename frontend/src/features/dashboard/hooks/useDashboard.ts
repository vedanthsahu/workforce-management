"use client";

import { useCallback, useEffect, useState } from "react";

import type { DashboardData } from "../types/dashboard.types";
import { DashboardSectionError, getDashboardData } from "../services/dashboard.service";
import { MAX_VISIBLE_BOOKINGS } from "../utils/constants";

type HookState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "fatal"; error: DashboardSectionError }
  | { status: "ready"; data: DashboardData; sectionErrors: DashboardSectionError[] };

export function useDashboard() {
  const [state, setState] = useState<HookState>({ status: "idle" });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    const result = await getDashboardData();

    if (!result.ok) {
      setState({ status: "fatal", error: result.fatal });
      return;
    }

    setState({ status: "ready", data: result.data, sectionErrors: result.errors });
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Cancel an upcoming booking ────────────────────────────────────────────
  // Now accepts an optional reason string, exactly like the bookings page flow.
  // The actual API call (POST /{id}/cancel) is handled by the caller (DashboardPage)
  // via cancelBookingApi before this is called — this function only updates local state.
  const handleCancelBooking = useCallback(async (bookingId: string) => {
    if (state.status !== "ready") return;
    // Optimistically remove from upcoming list
    setState((prev) => {
      if (prev.status !== "ready") return prev;
      return {
        ...prev,
        data: {
          ...prev.data,
          upcomingBookings: prev.data.upcomingBookings.filter((b) => b.id !== bookingId),
        },
      };
    });
  }, [state.status]);

  // Derived values
  const data               = state.status === "ready" ? state.data : null;
  const visibleBookings    = data?.upcomingBookings.slice(0, MAX_VISIBLE_BOOKINGS) ?? [];
  const totalBookingsCount = data?.upcomingBookings.length ?? 0;
  const sectionErrors      = state.status === "ready" ? state.sectionErrors : [];

  return {
    isLoading:           state.status === "idle" || state.status === "loading",
    isFatal:             state.status === "fatal",
    fatalError:          state.status === "fatal" ? state.error : null,
    data,
    sectionErrors,
    refetch:             load,
    visibleBookings,
    totalBookingsCount,
    handleCancelBooking,
  };
}