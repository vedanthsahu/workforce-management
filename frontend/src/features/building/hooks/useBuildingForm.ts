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
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit =
    async (): Promise<boolean> => {
      try {
        setLoading(true);

        await buildingService.createBuilding(
          formData
        );

        return true;
      } catch (error) {
        console.error(error);
        return false;
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