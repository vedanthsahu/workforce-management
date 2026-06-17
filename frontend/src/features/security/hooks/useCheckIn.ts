"use client";

import { useState } from "react";
import { toast } from "sonner";
import { securityService } from "../services/security.service";

export const useCheckIn = (onSuccess?: () => void) => {
  const [checkingInId, setCheckingInId] = useState<string | null>(null);

  const handleCheckIn = async (visitId: string) => {
    setCheckingInId(visitId);
    try {
      await securityService.checkInVisitor({ visit_id: visitId });
      toast.success("Visitor checked in");
      onSuccess?.();
    } catch (err) {
      console.error("Check-in failed", err);
      toast.error("Failed to check in visitor");
    } finally {
      setCheckingInId(null);
    }
  };

  const handleCheckOut = async (visitId: string) => {
    setCheckingInId(visitId);
    try {
      await securityService.checkOutVisitor({ visit_id: visitId });
      toast.success("Visitor checked out");
      onSuccess?.();
    } catch (err) {
      console.error("Check-out failed", err);
      toast.error("Failed to check out visitor");
    } finally {
      setCheckingInId(null);
    }
  };

  return { checkingInId, handleCheckIn, handleCheckOut };
};