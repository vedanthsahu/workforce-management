"use client";

import { useEffect, useState } from "react";

import { buildingService } from "../services/buildingService";
import { floorService } from "@/features/floor/services/floorService";
import { officeService } from "@/features/offices/services/office.service";
import { ReactivateChecklistItem } from "@/features/offices/components/ReactivateChecklist";

import { Building } from "../types/building.types";

type OfficeInfo = { name: string; status: string };

export const useEditBuilding = (
  building: Building,
  onSuccess: (buildingId: string) => void,
  open: boolean
) => {
  const [loading, setLoading] =
    useState(false);

  const [formData, setFormData] =
    useState({
      building_name:
        building.building_name,

      status:
        building.status,
    });

  // Inactive floors offered for reactivation when the building is being
  // switched from INACTIVE back to ACTIVE — mirrors the office-level flow
  // in EditOfficeModal; reactivating a building alone does not cascade back
  // up to its floors (see location_service.py).
  const [inactiveFloors, setInactiveFloors] = useState<ReactivateChecklistItem[]>([]);
  const [selectedFloorIds, setSelectedFloorIds] = useState<string[]>([]);

  // Read-only ancestor context: which office this building belongs to, and
  // its current status. Purely informational -- a building can't reactivate
  // its own office from here, but seeing the office is INACTIVE explains
  // why this building's own reactivation may be rejected.
  const [officeInfo, setOfficeInfo] = useState<OfficeInfo | null>(null);
  const [officeInfoLoading, setOfficeInfoLoading] = useState(false);

  // Re-sync from the source building every time the modal opens — not just
  // when `building` changes — so a Cancel (which never touches `building`)
  // discards any unsaved dropdown edits instead of leaving them staged for
  // the next open. The modal stays mounted between opens (parent only
  // toggles `open`, it doesn't unmount on close), so the initial useState
  // and a `[building]`-only effect would only run once per building.
  useEffect(() => {
    if (!open) return;
    setFormData({
      building_name: building.building_name,
      status: building.status,
    });
    setSelectedFloorIds([]);
    setInactiveFloors([]);
  }, [open, building]);

  useEffect(() => {
    if (!open) {
      setOfficeInfo(null);
      return;
    }
    let cancelled = false;
    setOfficeInfoLoading(true);
    officeService
      .getSiteById(building.site_id)
      .then((site) => {
        if (cancelled) return;
        setOfficeInfo({ name: site.site_name, status: site.status });
      })
      .catch((error) => console.error(error))
      .finally(() => {
        if (!cancelled) setOfficeInfoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, building.site_id]);

  const isReactivating = open && building.status === "INACTIVE" && formData.status === "ACTIVE";

  useEffect(() => {
    if (!isReactivating) {
      setSelectedFloorIds([]);
      setInactiveFloors([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const floors = await floorService.getFloors(Number(building.building_id), "INACTIVE");
        if (cancelled) return;
        setInactiveFloors(floors.map((f) => ({ id: f.floor_id, name: f.floor_name })));
      } catch (error) {
        console.error(error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isReactivating, building.building_id]);

  const toggleFloor = (id: string) => {
    setSelectedFloorIds((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };

  // The office is INACTIVE too, so activating this building must reactivate
  // it in the same request (shown as the locked "Office" row in the
  // checklist) -- otherwise the backend rejects the building activation.
  const officeNeedsReactivation = isReactivating && officeInfo?.status === "INACTIVE";

  const handleChange = (
    field: "building_name" | "status",
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleUpdate = async () => {
    try {
      setLoading(true);
      await buildingService.updateBuilding(building.building_id, {
        building_name: formData.building_name,
        status: formData.status,
        ...(officeNeedsReactivation ? { reactivate_office: true } : {}),
        ...(isReactivating && selectedFloorIds.length > 0
          ? { reactivate_floor_ids: selectedFloorIds.map(Number) }
          : {}),
      });
      onSuccess(String(building.building_id)); // ← pass id back
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    formData,
    inactiveFloors,
    selectedFloorIds,
    isReactivating,
    toggleFloor,
    officeInfo,
    officeInfoLoading,
    officeNeedsReactivation,

    handleChange,
    handleUpdate,
  };
};