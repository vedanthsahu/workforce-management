"use client";

import { useEffect, useState } from "react";

import { buildingService } from "../services/buildingService";
import { codeWithParent, uniqueCode } from "@/lib/codeGenerator";

import {
  CreateBuildingPayload,
  SiteOption,
} from "../types/building.types";

export const useBuildingForm = () => {
  const [loading, setLoading] =
    useState(false);

  const [sites, setSites] =
    useState<SiteOption[]>([]);

  // Existing building codes for the selected office, fetched so the
  // generated code can be disambiguated (e.g. ROX, ROX-01) before submit.
  const [existingBuildingCodes, setExistingBuildingCodes] =
    useState<string[]>([]);

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

  // Buildings existing under the selected office, refetched whenever the
  // office changes -- their codes are what the generated code must avoid.
  useEffect(() => {
    if (!formData.site_id) {
      setExistingBuildingCodes([]);
      return;
    }
    buildingService.getBuildings({ site_id: formData.site_id }).then(
      (buildings) => setExistingBuildingCodes(buildings.map((b) => b.building_code)),
      (error) => console.error("Failed to load existing building codes", error)
    );
  }, [formData.site_id]);

  // Building code is derived from the parent office's code + the building
  // name, not typed by hand -- keep it in sync with whichever changed, and
  // disambiguate against buildings that already exist under this office.
  useEffect(() => {
    const site = sites.find((s) => s.site_id === String(formData.site_id));
    const base = codeWithParent(site?.site_code ?? "", formData.building_name);
    const generated = uniqueCode(base, existingBuildingCodes);
    setFormData((prev) =>
      prev.building_code === generated ? prev : { ...prev, building_code: generated }
    );
  }, [formData.site_id, formData.building_name, sites, existingBuildingCodes]);

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