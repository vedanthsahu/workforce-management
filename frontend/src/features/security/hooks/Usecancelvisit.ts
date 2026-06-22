"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { securityService } from "../services/security.service";
import type { Visitor } from "../types/security.types";

interface UseCancelVisitOptions {
  visitor: Visitor | null;
  onPatch: (id: string, patch: Partial<Visitor>) => void;
  onSuccess: () => void;
}

/**
 * 🚧 DUMMY — cancel is not wired to the backend yet (low priority for now).
 * securityService.cancelVisit() only simulates a network call under the
 * hood. Once POST /guest-visits/{id}/cancel is ready, just uncomment the
 * real axios call inside that service method — nothing here needs to change.
 *
 * All form state for the Cancel modal lives here, not in the component.
 */
export const useCancelVisit = ({ visitor, onPatch, onSuccess }: UseCancelVisitOptions) => {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the form whenever a different visitor is opened in the modal
  useEffect(() => {
    setReason("");
    setError(null);
  }, [visitor?.id]);

  const handleSubmit = async () => {
    if (!visitor) return;

    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Please enter a cancellation reason.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await securityService.cancelVisit(visitor.guestVisitId, { cancellation_reason: trimmed });

      // Optimistic UI patch only — nothing is persisted on the backend yet.
      onPatch(visitor.id, { status: "CANCELLED", bookingStatus: "CANCELLED" });
      toast.success("Visit cancelled (demo only — not saved to backend yet)");
      onSuccess();
    } catch (err) {
      console.error("Cancel visit failed", err);
      setError("Failed to cancel visit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return { reason, setReason, loading, error, setError, handleSubmit };
};