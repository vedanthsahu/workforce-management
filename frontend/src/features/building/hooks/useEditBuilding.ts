"use client";

import { useEffect, useState } from "react";

import { buildingService } from "../services/buildingService";

import { Building } from "../types/building.types";

export const useEditBuilding = (
  building: Building,
  onSuccess: (buildingId: string) => void
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

  useEffect(() => {
    setFormData({
      building_name: building.building_name,
      status: building.status,
    });
  }, [building]);

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