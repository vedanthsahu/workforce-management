"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { securityService } from "../services/security.service";
import type {
  GuestType,
  ModifyVisitPayload,
  PurposeOfVisit,
  Visitor,
} from "../types/security.types";

interface UseModifyVisitFormOptions {
  visitor: Visitor | null;
  onPatch: (id: string, patch: Partial<Visitor>) => void;
  onSuccess: () => void;
}

/**
 * 🚧 DUMMY — modify is not wired to the backend yet (low priority for now).
 * securityService.modifyVisit() only simulates a network call under the
 * hood. Once PATCH /guest-visits/{id} is ready, just uncomment the real
 * axios call inside that service method — nothing here needs to change.
 *
 * All form state for the Edit Visit modal lives here, not in the component.
 */
export const useModifyVisitForm = ({ visitor, onPatch, onSuccess }: UseModifyVisitFormOptions) => {
  const [visitDate, setVisitDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [guestType, setGuestType] = useState<GuestType | "">("");
  const [purposeOfVisit, setPurposeOfVisit] = useState<PurposeOfVisit | "">("");
  const [notes, setNotes] = useState("");
  const [siteId, setSiteId] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [floorId, setFloorId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed the form whenever a different visitor is opened in the modal
  useEffect(() => {
    if (!visitor) return;
    setVisitDate(visitor.visitDate ?? "");
    setStartTime(visitor.startTime ?? "");
    setEndTime(visitor.endTime ?? "");
    setGuestType((visitor.guestType as GuestType) ?? "");
    setPurposeOfVisit((visitor.purpose as PurposeOfVisit) ?? "");
    setNotes(visitor.notes ?? "");
    setSiteId("");
    setBuildingId("");
    setFloorId("");
    setError(null);
  }, [visitor]);

  const handleSubmit = async () => {
    if (!visitor) return;

    if (!visitDate) {
      setError("Visit date is required.");
      return;
    }
    if (!startTime || !endTime) {
      setError("Start time and end time are required.");
      return;
    }

    const payload: ModifyVisitPayload = {
      visit_date: visitDate,
      start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
      end_time: endTime.length === 5 ? `${endTime}:00` : endTime,
    };

    if (visitor.hostUserId) payload.host_user_id = Number(visitor.hostUserId);
    if (siteId) payload.site_id = Number(siteId);
    if (buildingId) payload.building_id = Number(buildingId);
    if (floorId) payload.floor_id = Number(floorId);
    if (guestType) payload.guest_type = guestType;
    if (purposeOfVisit) payload.purpose_of_visit = purposeOfVisit;
    if (notes.trim()) payload.notes = notes.trim();

    try {
      setLoading(true);
      setError(null);
      await securityService.modifyVisit(visitor.guestVisitId, payload);

      // Optimistic UI patch only — nothing is persisted on the backend yet.
      onPatch(visitor.id, {
        visitDate,
        startTime,
        endTime,
        guestType: guestType || visitor.guestType,
        purpose: purposeOfVisit || visitor.purpose,
        notes: notes.trim(),
        bookingStatus: "MODIFIED",
      });
      toast.success("Visit updated (demo only — not saved to backend yet)");
      onSuccess();
    } catch (err) {
      console.error("Modify visit failed", err);
      setError("Failed to modify visit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return {
    visitDate, setVisitDate,
    startTime, setStartTime,
    endTime, setEndTime,
    guestType, setGuestType,
    purposeOfVisit, setPurposeOfVisit,
    notes, setNotes,
    siteId, setSiteId,
    buildingId, setBuildingId,
    floorId, setFloorId,
    loading,
    error,
    setError,
    handleSubmit,
  };
};