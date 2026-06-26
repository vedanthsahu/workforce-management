"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelBooking, cancelGuestBooking, guestVisitWorkflow } from "../services/bookings.service";
import { FALLBACK_PREFERENCE_NAMES } from "../utils/constants";
import type { Booking } from "../types/bookings.types";

type CancelMode = "booking" | "visit";

type UseBookingActionsParams = {
  handleCancelBooking: (bookingId: string) => Promise<void>;
  handleCancelDelegatedBooking: (booking: Booking, mode: "visit" | "booking") => void;
};

export function useBookingActions({ handleCancelBooking, handleCancelDelegatedBooking }: UseBookingActionsParams) {
  const router = useRouter();
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelMode, setCancelMode] = useState<CancelMode>("booking");

  // ── Cancel handlers ──

  const handleConfirmCancel = async (reason: string) => {
    if (!cancelTarget) return;

    const visitId = cancelTarget.guestVisitId ?? cancelTarget.id;
    const isVisitType = cancelTarget.bookingType === "visit" || cancelTarget.bookingType === "guest";

    const workflowBase = {
      host_user_id: cancelTarget.hostUserId ? Number(cancelTarget.hostUserId) : 1,
      site_id:      cancelTarget.siteId ? Number(cancelTarget.siteId) : 1,
      building_id:  cancelTarget.buildingId ? Number(cancelTarget.buildingId) : 1,
      visit_date:   cancelTarget.fromDate || cancelTarget.date,
      guest_type:   cancelTarget.guestType || "OTHER",
      cancellation_reason: reason.trim() || null,
    };

    if (cancelMode === "visit" && isVisitType) {
      await guestVisitWorkflow(visitId, "CANCEL_VISIT", workflowBase);
      handleCancelDelegatedBooking(cancelTarget, "visit");
    } else if (cancelMode === "booking" && cancelTarget.bookingType === "guest") {
      await guestVisitWorkflow(visitId, "CANCEL_BOOKING", workflowBase);
      handleCancelDelegatedBooking(cancelTarget, "booking");
    } else if (cancelTarget.bookingType === "guest") {
      await cancelGuestBooking(cancelTarget.id, reason);
      await handleCancelBooking(cancelTarget.id);
    } else {
      await cancelBooking(cancelTarget.id, reason);
      await handleCancelBooking(cancelTarget.id);
    }

    setCancelTarget(null);
    setCancelMode("booking");
  };

  const handleCancelClick = (booking: Booking) => {
    setCancelMode("booking");
    setCancelTarget(booking);
  };

  const handleCancelVisit = (booking: Booking) => {
    setCancelMode("visit");
    setCancelTarget(booking);
  };

  const handleCancelBookingOnly = (booking: Booking) => {
    setCancelMode("booking");
    setCancelTarget(booking);
  };

  const clearCancelTarget = () => {
    setCancelTarget(null);
    setCancelMode("booking");
  };

  // ── Modify handlers ──

  const handleModify = (booking: Booking) => {
    const hasRealPrefs = (booking.preferences ?? []).length > 0;
    const isGuest = booking.bookingType === "guest";

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

    if (isGuest) {
      params.set("isGuestModify", "true");
      if (booking.bookedForGuestId) params.set("guestId", booking.bookedForGuestId);
      if (booking.bookedForName)    params.set("bookingForName", booking.bookedForName);
    } else if (booking.bookingType === "employee" && booking.bookedForUserId) {
      params.set("bookedForUserId", booking.bookedForUserId);
      if (booking.bookedForName) params.set("bookingForName", booking.bookedForName);
    }

    router.push(`/book?${params.toString()}`);
  };

  const handleModifyVisit = (booking: Booking) => {
    const visitId = booking.guestVisitId ?? booking.id;
    const hasBooking = !!booking.seatId;
    const action = hasBooking ? "MODIFY_VISIT_AND_BOOKING" : "MODIFY_VISIT_ONLY";

    const params = new URLSearchParams({
      editVisitId: visitId,
      action,
    });

    if (booking.guestName)      params.set("guestName", booking.guestName);
    if (booking.guestEmail)     params.set("guestEmail", booking.guestEmail);
    if (booking.guestType)      params.set("guestType", booking.guestType);
    if (booking.purposeOfVisit) params.set("purposeOfVisit", booking.purposeOfVisit);
    if (booking.fromDate)       params.set("visitDate", booking.fromDate);
    if (booking.toDate)         params.set("endDate", booking.toDate);
    if (booking.startTime && /^\d{2}:\d{2}/.test(booking.startTime))
      params.set("startTime", booking.startTime);
    if (booking.endTime && /^\d{2}:\d{2}/.test(booking.endTime))
      params.set("endTime", booking.endTime);
    if (booking.location)       params.set("locationName", booking.location);
    if (booking.hostName)       params.set("hostName", booking.hostName);
    if (booking.hostUserId)     params.set("hostUserId", booking.hostUserId);
    if (booking.siteId)         params.set("siteId", booking.siteId);
    if (booking.buildingId)     params.set("buildingId", booking.buildingId);
    if (booking.floorId)        params.set("floorId", booking.floorId);
    if (hasBooking) {
      if (booking.seatId) params.set("seatId", booking.seatId);
      params.set("modifyBookingId", booking.id);
    }

    router.push(`/book-for-someone?${params.toString()}`);
  };

  const handleModifyVisitAndBooking = (booking: Booking) => {
    const visitId = booking.guestVisitId ?? booking.id;
    const params = new URLSearchParams({
      editVisitId: visitId,
      action: "MODIFY_VISIT_AND_BOOKING",
      modifyBookingId: booking.id,
    });

    if (booking.guestName)  params.set("guestName", booking.guestName);
    if (booking.guestEmail) params.set("guestEmail", booking.guestEmail);
    if (booking.fromDate)   params.set("visitDate", booking.fromDate);
    if (booking.toDate)     params.set("endDate", booking.toDate);
    if (booking.startTime)  params.set("startTime", booking.startTime);
    if (booking.endTime)    params.set("endTime", booking.endTime);
    if (booking.location)   params.set("locationName", booking.location);
    if (booking.building)   params.set("buildingName", booking.building);
    if (booking.floor)      params.set("floorName", booking.floor);
    if (booking.seat)       params.set("seatLabel", booking.seat);
    if (booking.seatId)     params.set("seatId", booking.seatId);
    if (booking.hostName)   params.set("hostName", booking.hostName);

    router.push(`/book-for-someone?${params.toString()}`);
  };

  const handleAddBooking = (booking: Booking) => {
    const visitId = booking.guestVisitId ?? booking.id;
    const params = new URLSearchParams({
      visitId,
      fromDate: booking.fromDate,
      toDate:   booking.toDate,
    });

    if (booking.siteId)           params.set("siteId", booking.siteId);
    if (booking.buildingId)       params.set("buildingId", booking.buildingId);
    if (booking.floorId)          params.set("floorId", booking.floorId);
    if (booking.location)         params.set("locationName", booking.location);
    if (booking.building)         params.set("buildingName", booking.building);
    if (booking.floor)            params.set("floorName", booking.floor);
    if (booking.bookedForGuestId) params.set("guestId", booking.bookedForGuestId);
    if (booking.guestName)        params.set("bookingForName", booking.guestName);
    if (booking.hostUserId)       params.set("hostUserId", booking.hostUserId);
    params.set("isGuestModify", "true");

    router.push(`/book?${params.toString()}`);
  };

  return {
    cancelTarget,
    cancelMode,
    setCancelTarget: handleCancelClick,
    clearCancelTarget,
    handleConfirmCancel,
    handleModify,
    handleModifyVisit,
    handleModifyVisitAndBooking,
    handleAddBooking,
    handleCancelVisit,
    handleCancelBookingOnly,
  };
}
