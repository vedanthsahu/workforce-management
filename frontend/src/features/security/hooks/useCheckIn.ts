"use client";

import { useState } from "react";
import { toast } from "sonner";
import { securityService } from "../services/security.service";

/**
 * Check-in / check-out — real API, no request body, just the guest_visit_id
 * in the path: POST /guest-visits/{guest_visit_id}/check-in | check-out
 */
// `onSuccess` is awaited so the row's button stays in its busy state until
// the refreshed data lands, instead of briefly flashing the old status.
export const useCheckIn = (onSuccess?: () => void | Promise<void>) => {
  const [checkingInId, setCheckingInId] = useState<string | null>(null);

  const handleCheckIn = async (guestVisitId: string) => {
    setCheckingInId(guestVisitId);
    try {
      await securityService.checkInVisit(guestVisitId);
      toast.success("Visitor checked in");
      await onSuccess?.();
    } catch (err) {
      console.error("Check-in failed", err);
      toast.error("Failed to check in visitor");
    } finally {
      setCheckingInId(null);
    }
  };

  const handleCheckOut = async (guestVisitId: string) => {
    setCheckingInId(guestVisitId);
    try {
      await securityService.checkOutVisit(guestVisitId);
      toast.success("Visitor checked out");
      await onSuccess?.();
    } catch (err) {
      console.error("Check-out failed", err);
      toast.error("Failed to check out visitor");
    } finally {
      setCheckingInId(null);
    }
  };

  return { checkingInId, handleCheckIn, handleCheckOut };
};