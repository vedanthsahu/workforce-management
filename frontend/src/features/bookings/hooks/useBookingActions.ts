"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelBooking } from "../services/bookings.service";
import { FALLBACK_PREFERENCE_NAMES } from "../utils/constants";
import type { Booking } from "../types/bookings.types";

type UseBookingActionsParams = {
  handleCancelBooking: (bookingId: string) => Promise<void>;
};

export function useBookingActions({ handleCancelBooking }: UseBookingActionsParams) {
  const router = useRouter();
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);

  const handleConfirmCancel = async (reason: string) => {
    if (!cancelTarget) return;
    await cancelBooking(cancelTarget.id, reason);
    await handleCancelBooking(cancelTarget.id);
    setCancelTarget(null);
  };

  const handleModify = (booking: Booking) => {
    const hasRealPrefs = (booking.preferences ?? []).length > 0;

    const params = new URLSearchParams({
      modifyBookingId: booking.id,
      fromDate:        booking.fromDate,
      toDate:          booking.toDate,
      locationName:    booking.location,
      buildingName:    booking.building,
      floorName:       booking.floor,
      seatLabel:       booking.seat,
      seatId:          booking.seatId ?? "",
    });

    if (hasRealPrefs) {
      params.set("preferences", booking.preferences!.join(","));
    } else {
      params.set("preferenceNames", FALLBACK_PREFERENCE_NAMES.join(","));
    }

    router.push(`/book?${params.toString()}`);
  };

  return {
    cancelTarget,
    setCancelTarget,
    handleConfirmCancel,
    handleModify,
  };
}
