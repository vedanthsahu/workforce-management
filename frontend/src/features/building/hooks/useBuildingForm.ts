"use client";

import { useEffect, useState } from "react";

import { buildingService } from "../services/buildingService";

import {
  CreateBuildingPayload,
  SiteOption,
} from "../types/building.types";

export const useBuildingForm = () => {
  const [loading, setLoading] =
    useState(false);

  const [sites, setSites] =
    useState<SiteOption[]>([]);

  const [formData, setFormData] =
    useState<CreateBuildingPayload>({
      site_id: 0,
      building_code: "",
      building_name: "",
      status: "ACTIVE",
    });

  const fetchSites = async () => {
    try {
      const data =
        await buildingService.getSites({
          page: 1,
        });

      setSites(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const handleChange = (
    field: keyof CreateBuildingPayload,
    value: string | number
  ) => {
    setFormData((prev) => {
      if (field === "site_id") {
        // Default the status field to match the chosen office so a new
        // building under an inactive office doesn't default to ACTIVE
        // (the backend rejects that combination anyway) -- still
        // overridable by hand afterwards.
        const site = sites.find((s) => s.site_id === String(value));
        return {
          ...prev,
          site_id: value as number,
          status: site?.status ?? prev.status,
        };
      }
      return { ...prev, [field]: value };
    });
  };

 const handleSubmit = async () => {
  try {
    setLoading(true);

    const response =
      await buildingService.createBuilding(
        formData
      );

    return response;
  } finally {
    setLoading(false);
  }
};

  return {
    loading,
    sites,
    formData,

    handleChange,
    handleSubmit,
  };
};