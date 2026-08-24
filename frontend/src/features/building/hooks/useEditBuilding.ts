"use client";

import { useEffect, useState } from "react";

import { buildingService } from "../services/buildingService";

import { Building } from "../types/building.types";

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
  }, [open, building]);

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

    handleChange,
    handleUpdate,
  };
};