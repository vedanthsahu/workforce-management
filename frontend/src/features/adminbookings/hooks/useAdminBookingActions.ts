"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  cancelBooking,
  cancelGuestBooking,
  guestVisitWorkflow,
} from "@/features/bookings/services/bookings.service";
import type { AdminBooking } from "../types/adminBooking.types";
import { ADMIN_BOOKINGS_EXPECT_RETURN_KEY } from "../utils/constants";

type CancelMode = "booking" | "visit";

type UseAdminBookingActionsParams = {
  onCancelled: () => void;
};

// Mirrors bookings/hooks/useBookingActions.ts's handleModify/handleModifyVisit/
// handleConfirmCancel so admin uses the exact same routes as the employee
// "My Bookings" and facilitator "Book for Someone" flows:
//   - plain seat booking (or a guest booking with no linked visit)
//     -> POST /bookings/{id}/modify, /bookings/{id}/cancel or /guest-bookings/{id}/cancel
//   - a guest booking linked to a guest-visit invite (booking.guest_visit_id set)
//     -> POST /guest-visits/{id}/workflow, action CANCEL_BOOKING/CANCEL_VISIT/
//        MODIFY_VISIT_ONLY/MODIFY_VISIT_AND_BOOKING, so the visit and the seat
//        can be modified or cancelled independently.
export function useAdminBookingActions({ onCancelled }: UseAdminBookingActionsParams) {
  const router = useRouter();
  const [cancelTarget, setCancelTarget] = useState<AdminBooking | null>(null);
  const [cancelMode, setCancelMode] = useState<CancelMode>("booking");

  const openCancelSeat = (booking: AdminBooking) => {
    setCancelMode("booking");
    setCancelTarget(booking);
  };

  const openCancelVisit = (booking: AdminBooking) => {
    setCancelMode("visit");
    setCancelTarget(booking);
  };

  const closeCancel = () => {
    setCancelTarget(null);
    setCancelMode("booking");
  };

  // CancelBookingDialog tracks its own loading/disabled state around this call.
  const confirmCancel = async (reason: string) => {
    if (!cancelTarget) return;

    if (cancelTarget.person_type === "Guest" && cancelTarget.guest_visit_id) {
      const workflowBase = {
        host_user_id: cancelTarget.host_user_id ? Number(cancelTarget.host_user_id) : 1,
        site_id: cancelTarget.site_id ? Number(cancelTarget.site_id) : 1,
        building_id: cancelTarget.building_id ? Number(cancelTarget.building_id) : 1,
        visit_date: cancelTarget.activity_date,
        guest_type: cancelTarget.guest_type || "OTHER",
        cancellation_reason: reason.trim() || null,
      };
      await guestVisitWorkflow(
        cancelTarget.guest_visit_id,
        cancelMode === "visit" ? "CANCEL_VISIT" : "CANCEL_BOOKING",
        workflowBase,
      );
    } else if (cancelTarget.person_type === "Guest") {
      await cancelGuestBooking(cancelTarget.booking_id, reason);
    } else {
      await cancelBooking(cancelTarget.booking_id, reason);
    }

    closeCancel();
    onCancelled();
  };

  // Pure seat swap — same date, new seat. The visit itself (if any) is untouched.
  const modifySeat = (booking: AdminBooking) => {
    const params = new URLSearchParams({
      modifyBookingId: booking.booking_id,
      fromDate: booking.activity_date,
      toDate: booking.activity_date,
      locationName: booking.site_name,
      buildingName: booking.building_name,
      floorName: booking.floor_name,
      seatLabel: booking.seat_code,
      seatId: booking.seat_id ?? "",
    });

    if (booking.person_name) params.set("bookingForName", booking.person_name);

    if (booking.person_type === "Guest") {
      params.set("isGuestModify", "true");
      if (booking.booked_for_guest_id) params.set("guestId", booking.booked_for_guest_id);
    } else if (booking.booked_for_user_id) {
      params.set("bookedForUserId", booking.booked_for_user_id);
    }

    sessionStorage.setItem(ADMIN_BOOKINGS_EXPECT_RETURN_KEY, "1");
    router.push(`/book?${params.toString()}`);
  };

  // Edit the visit itself (date/time/host/guest type/purpose) — only valid for
  // a guest booking linked to a guest-visit invite (guest_visit_id set).
  const modifyVisit = (booking: AdminBooking) => {
    const visitId = booking.guest_visit_id ?? booking.booking_id;
    const hasSeat = !!booking.seat_id;
    const action = hasSeat ? "MODIFY_VISIT_AND_BOOKING" : "MODIFY_VISIT_ONLY";

    const params = new URLSearchParams({ editVisitId: visitId, action });

    if (booking.person_name) params.set("guestName", booking.person_name);
    if (booking.person_email) params.set("guestEmail", booking.person_email);
    if (booking.guest_type) params.set("guestType", booking.guest_type);
    if (booking.purpose_of_visit) params.set("purposeOfVisit", booking.purpose_of_visit);
    if (booking.activity_date) {
      params.set("visitDate", booking.activity_date);
      params.set("endDate", booking.activity_date);
    }
    if (booking.start_time && /^\d{2}:\d{2}/.test(booking.start_time)) params.set("startTime", booking.start_time);
    if (booking.end_time && /^\d{2}:\d{2}/.test(booking.end_time)) params.set("endTime", booking.end_time);
    if (booking.site_name) params.set("locationName", booking.site_name);
    if (booking.host_name) params.set("hostName", booking.host_name);
    if (booking.host_user_id) params.set("hostUserId", booking.host_user_id);
    if (booking.site_id) params.set("siteId", booking.site_id);
    if (booking.building_id) params.set("buildingId", booking.building_id);
    if (booking.floor_id) params.set("floorId", booking.floor_id);
    if (hasSeat) {
      if (booking.seat_id) params.set("seatId", booking.seat_id);
      if (booking.seat_code) params.set("seatLabel", booking.seat_code);
      if (booking.floor_name) params.set("floorName", booking.floor_name);
      params.set("modifyBookingId", booking.booking_id);
    }

    sessionStorage.setItem(ADMIN_BOOKINGS_EXPECT_RETURN_KEY, "1");
    router.push(`/book-for-someone?${params.toString()}`);
  };

  return {
    cancelTarget,
    cancelMode,
    openCancelSeat,
    openCancelVisit,
    closeCancel,
    confirmCancel,
    modifySeat,
    modifyVisit,
  };
}
