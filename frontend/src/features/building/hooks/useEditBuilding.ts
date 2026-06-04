"use client";

import { useState } from "react";

import { buildingService } from "../services/buildingService";

import { Building } from "../types/building.types";

export const useEditBuilding = (
  building: Building,
  onSuccess: () => void
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

  const handleChange = (
    field:
      | "building_name"
      | "status",
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleUpdate =
    async () => {
      try {
        setLoading(true);

        await buildingService.updateBuilding(
          building.building_id,
          {
            building_name:
              formData.building_name,

            status:
              formData.status,
          }
        );

        onSuccess();
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