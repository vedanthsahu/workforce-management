"use client";

import { useState, useEffect, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDate } from "../utils/bookingHelpers";
import type { Booking } from "../types/bookings.types";

const BOOKING_CANCEL_REASONS = [
  "Schedule change",
  "Working from home",
  "Meeting cancelled",
  "Booked wrong date",
  "Booked wrong seat / location",
  "No longer needed",
  "Out of office / On leave",
  "Other",
];

const VISIT_CANCEL_REASONS = [
  "Visit postponed",
  "Visit cancelled by guest",
  "Guest no longer available",
  "Meeting rescheduled",
  "Incorrect visit details",
  "Security / compliance issue",
  "Host unavailable",
  "Other",
];

type CancelBookingDialogProps = {
  open: boolean;
  booking: Booking | null;
  cancelMode?: "booking" | "visit";
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
};

export function CancelBookingDialog({ open, booking, cancelMode = "booking", onConfirm, onClose }: CancelBookingDialogProps) {
  const [selectedReason, setSelectedReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [loading, setLoading] = useState(false);

  const bType = booking?.bookingType;
  const isPureVisit = bType === "visit";
  const isSeatOnlyCancel = cancelMode === "booking" && bType === "guest";
  const isFullBookingCancel = cancelMode === "visit" && bType === "guest";

  const title = isPureVisit
    ? "Cancel Visit"
    : isSeatOnlyCancel
      ? "Cancel Seat"
      : "Cancel Booking";
  const confirmLabel = isPureVisit
    ? "Yes, Cancel Visit"
    : isSeatOnlyCancel
      ? "Yes, Cancel Seat"
      : "Yes, Cancel Booking";
  const keepLabel = isPureVisit
    ? "Keep Visit"
    : isSeatOnlyCancel
      ? "Keep Seat"
      : "Keep Booking";
  const reasons = cancelMode === "visit" ? VISIT_CANCEL_REASONS : BOOKING_CANCEL_REASONS;

  const finalReason = selectedReason === "Other" ? otherReason.trim() : selectedReason;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(finalReason);
      setSelectedReason("");
      setOtherReason("");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = useCallback(() => {
    setSelectedReason("");
    setOtherReason("");
    onClose();
  }, [onClose]);

  const handleOpenChange = (val: boolean) => {
    if (!val) handleClose();
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-slot='alert-dialog-content']")) return;
      if (target.closest("[data-slot='alert-dialog-overlay']")) handleClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, handleClose]);

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md mx-4 sm:mx-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[#1A1A2E]">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-500 text-[13px]">
            {booking && (
              isPureVisit ? (
                <span>
                  Are you sure you want to cancel the visit for{" "}
                  <strong className="text-gray-700">
                    {booking.guestName ?? booking.bookedForName ?? "this guest"}
                  </strong>{" "}
                  on <strong className="text-gray-700">{formatDate(booking.date)}</strong>?
                  This action cannot be undone.
                </span>
              ) : isSeatOnlyCancel ? (
                <span>
                  Are you sure you want to cancel the seat reservation at{" "}
                  <strong className="text-gray-700">
                    {booking.location} · {booking.floor} · Seat {booking.seat}
                  </strong>{" "}
                  on <strong className="text-gray-700">{formatDate(booking.date)}</strong>?
                  This action cannot be undone.
                </span>
              ) : isFullBookingCancel ? (
                <span>
                  Are you sure you want to cancel the booking for{" "}
                  <strong className="text-gray-700">
                    {booking.guestName ?? booking.bookedForName ?? "this guest"}
                  </strong>{" "}
                  on <strong className="text-gray-700">{formatDate(booking.date)}</strong>?
                  This action cannot be undone.
                </span>
              ) : (
                <span>
                  Are you sure you want to cancel your booking at{" "}
                  <strong className="text-gray-700">
                    {booking.location} · {booking.floor} · Seat {booking.seat}
                  </strong>{" "}
                  on <strong className="text-gray-700">{formatDate(booking.date)}</strong>?
                  This action cannot be undone.
                </span>
              )
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-2 space-y-3">
          <div>
            <Label
              htmlFor="cancel-reason"
              className="text-[12.5px] font-medium text-gray-600 mb-1.5 block"
            >
              Reason for cancellation
            </Label>
            <div className="relative">
              <select
                id="cancel-reason"
                value={selectedReason}
                onChange={(e) => {
                  setSelectedReason(e.target.value);
                  if (e.target.value !== "Other") setOtherReason("");
                }}
                className="w-full h-10 px-3 pr-8 rounded-lg border border-[#EBEBF5] bg-white text-[13px] text-[#1A1A2E] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Select a reason</option>
                {reasons.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </div>

          {selectedReason === "Other" && (
            <div>
              <Label
                htmlFor="cancel-other-reason"
                className="text-[12.5px] font-medium text-gray-600 mb-1.5 block"
              >
                Please specify
              </Label>
              <Textarea
                id="cancel-other-reason"
                placeholder="Enter your reason…"
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                className="text-[13px] resize-none h-20"
              />
            </div>
          )}
        </div>

        <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-0">
          <AlertDialogCancel
            onClick={() => { setSelectedReason(""); setOtherReason(""); onClose(); }}
            className="text-[12.5px] w-full sm:w-auto"
          >
            {keepLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading || !selectedReason || (selectedReason === "Other" && !otherReason.trim())}
            className="bg-red-500 hover:bg-red-600 text-white text-[12.5px] disabled:opacity-50 w-full sm:w-auto"
          >
            {loading ? "Cancelling…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
