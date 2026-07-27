"use client";

import { useState, useCallback } from "react";
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
import type { Booking } from "../types/dashboard.types";

// Same preset reasons as the My Bookings cancel dialog's employee list
// (features/bookings/components/CancelBookingDialog.tsx), kept in sync.
// The dashboard's "current booking" is always an employee booking (self or
// on_behalf) — guests never show up here, so no guest branching is needed.
const BOOKING_CANCEL_REASONS = [
  "Schedule change",
  "Meeting cancelled",
  "Booked wrong date",
  "Booked wrong seat / location",
  "No longer needed",
  "Out of office / On leave",
  "Work From Home",
  "Other",
];

type CancelBookingDialogProps = {
  open: boolean;
  booking: Booking | null;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
};

export function CancelBookingDialog({ open, booking, onConfirm, onClose }: CancelBookingDialogProps) {
  const [selectedReason, setSelectedReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[#1A1A2E]">Cancel Booking</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-500 text-[13px]">
            {booking && (
              <span>
                Are you sure you want to cancel your booking at{" "}
                <strong className="text-gray-700">
                  {booking.location} · {booking.floor} · Seat {booking.seatId}
                </strong>{" "}
                on <strong className="text-gray-700">{booking.date}</strong>?
                This action cannot be undone.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-2 space-y-3">
          <div>
            <Label
              htmlFor="cancel-reason-dash"
              className="text-[12.5px] font-medium text-gray-600 mb-1.5 block"
            >
              Reason for cancellation
            </Label>
            <div className="relative">
              <select
                id="cancel-reason-dash"
                value={selectedReason}
                onChange={(e) => {
                  setSelectedReason(e.target.value);
                  if (e.target.value !== "Other") setOtherReason("");
                }}
                className="w-full h-10 px-3 pr-8 rounded-lg border border-[#EBEBF5] bg-white text-[13px] text-[#1A1A2E] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Select a reason</option>
                {BOOKING_CANCEL_REASONS.map((r) => (
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
                htmlFor="cancel-other-reason-dash"
                className="text-[12.5px] font-medium text-gray-600 mb-1.5 block"
              >
                Please specify
              </Label>
              <Textarea
                id="cancel-other-reason-dash"
                placeholder="Enter your reason…"
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                className="text-[13px] resize-none h-20"
              />
            </div>
          )}
        </div>
        <AlertDialogFooter >
          <AlertDialogCancel
            onClick={handleClose}
            className="text-[12.5px]"
          >
            Keep Booking
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading || !selectedReason || (selectedReason === "Other" && !otherReason.trim())}
            className="ml-3 bg-red-500 hover:bg-red-600 text-white text-[12.5px] disabled:opacity-50"
          >
            {loading ? "Cancelling…" : "Yes, Cancel"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
