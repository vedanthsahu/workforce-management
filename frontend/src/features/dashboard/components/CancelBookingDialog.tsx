"use client";

import { useState } from "react";
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

type CancelBookingDialogProps = {
  open: boolean;
  booking: Booking | null;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
};

export function CancelBookingDialog({ open, booking, onConfirm, onClose }: CancelBookingDialogProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(reason);
      setReason("");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) {
      setReason("");
      onClose();
    }
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
        <div className="py-2">
          <Label
            htmlFor="cancel-reason-dash"
            className="text-[12.5px] font-medium text-gray-600 mb-1.5 block"
          >
            Reason for cancellation{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </Label>
          <Textarea
            id="cancel-reason-dash"
            placeholder="e.g. Working from home, schedule change…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="text-[13px] resize-none h-20"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => { setReason(""); onClose(); }}
            className="text-[12.5px]"
          >
            Keep Booking
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className="bg-red-500 hover:bg-red-600 text-white text-[12.5px] disabled:opacity-50"
          >
            {loading ? "Cancelling…" : "Yes, Cancel"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
