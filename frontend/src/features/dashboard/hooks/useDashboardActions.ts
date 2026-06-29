"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  cancelBooking as cancelBookingApi,
  fetchSeatAmenities,
} from "@/features/bookings/services/bookings.service";

import type { Booking } from "../types/dashboard.types";

type UseDashboardActionsParams = {
  canBookSelf: boolean;
  canCancelOwn: boolean;
  handleCancelBooking: (bookingId: string) => Promise<void>;
};

export function useDashboardActions({
  canBookSelf,
  canCancelOwn,
  handleCancelBooking,
}: UseDashboardActionsParams) {
  const router = useRouter();
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);

  const handleCancelClick = (booking: Booking) => {
    if (canCancelOwn) setCancelTarget(booking);
  };

  const handleConfirmCancel = async (reason: string) => {
    if (!cancelTarget) return;
    await cancelBookingApi(cancelTarget.id, reason);
    await handleCancelBooking(cancelTarget.id);
    setCancelTarget(null);
  };

  // Resolves the seat's amenity preferences (falling back to display names
  // when the API has none) and routes to the booking form pre-filled for modification.
  const handleModifyBooking = async (booking: Booking) => {
    if (!canBookSelf) return;

    let resolvedKeys: string[] = [];
    if (booking.floorId && booking.rawSeatId) {
      try {
        resolvedKeys = await fetchSeatAmenities(
          booking.floorId,
          booking.rawSeatId,
          booking.fromDate ?? booking.date,
        );
      } catch {
        resolvedKeys = [];
      }
    }

    const params = new URLSearchParams({
      modifyBookingId: booking.id,
      fromDate: booking.fromDate ?? booking.date,
      toDate: booking.toDate ?? booking.date,
      locationName: booking.location,
      buildingName: booking.building ?? "",
      floorName: booking.floor,
      seatLabel: booking.seatId,
      seatId: booking.rawSeatId ?? booking.seatId,
    });

    if (resolvedKeys.length > 0) {
      params.set("preferences", resolvedKeys.join(","));
    }

    router.push(`/book?${params.toString()}`);
  };

  return {
    cancelTarget,
    setCancelTarget,
    handleCancelClick,
    handleConfirmCancel,
    handleModifyBooking,
  };
}
