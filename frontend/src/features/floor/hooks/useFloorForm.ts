import { useEffect, useState } from "react";
import axios from "axios";

import { floorService } from "../services/floorService";
import { FloorSite, FloorBuilding } from "../types/floor.types";
import { codeWithParent, uniqueCode } from "@/lib/codeGenerator";

export const useFloorForm = () => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [sites, setSites] = useState<FloorSite[]>([]);
  const [buildings, setBuildings] = useState<FloorBuilding[]>([]);

  // Existing floor codes for the selected building, fetched so the
  // generated code can be disambiguated (e.g. GRO, GRO-01) before submit.
  const [existingFloorCodes, setExistingFloorCodes] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    site_id: "",
    building_id: "",
    floor_code: "",
    floor_name: "",
    status: "ACTIVE",
  });

  useEffect(() => {
    fetchSites();
  }, []);

  // Floors existing under the selected building, refetched whenever the
  // building changes -- their codes are what the generated code must avoid.
  useEffect(() => {
    if (!formData.building_id) {
      setExistingFloorCodes([]);
      return;
    }
    floorService.getFloors(Number(formData.building_id)).then(
      (floors) => setExistingFloorCodes(floors.map((f) => f.floor_code)),
      (error) => console.error("Failed to load existing floor codes", error)
    );
  }, [formData.building_id]);

  // Floor code is derived from the parent building's code + the floor name,
  // not typed by hand -- keep it in sync with whichever changed, and
  // disambiguate against floors that already exist under this building.
  useEffect(() => {
    const building = buildings.find((b) => b.building_id === formData.building_id);
    const base = codeWithParent(building?.building_code ?? "", formData.floor_name);
    const generated = uniqueCode(base, existingFloorCodes);
    setFormData((prev) =>
      prev.floor_code === generated ? prev : { ...prev, floor_code: generated }
    );
  }, [formData.building_id, formData.floor_name, buildings, existingFloorCodes]);

  const fetchSites = async () => {
    try {
      const response = await floorService.getSites();
      setSites(response);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchBuildings = async (siteId: string) => {
    try {
      const response = await floorService.getBuildings(Number(siteId));
      setBuildings(response);
    } catch (error) {
      console.error(error);
    }
  };

  const handleChange = async (field: string, value: string) => {
    // Default the status field to match the chosen office/building so a
    // new floor under an inactive one doesn't default to ACTIVE (the
    // backend rejects that combination anyway) -- still overridable by
    // hand afterwards. Building is the immediate parent, so its status
    // wins once one is picked; the office's status is just the interim
    // default before that.
    if (field === "site_id") {
      const site = sites.find((s) => s.site_id === value);
      setFormData((prev) => ({
        ...prev,
        site_id: value,
        building_id: "",
        status: site?.status ?? prev.status,
      }));
      await fetchBuildings(value);
      return;
    }

    if (field === "building_id") {
      const building = buildings.find((b) => b.building_id === value);
      setFormData((prev) => ({
        ...prev,
        building_id: value,
        status: building?.status ?? prev.status,
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const createdFloor = await floorService.createFloor({
        site_id: Number(formData.site_id),
        building_id: Number(formData.building_id),
        floor_code: formData.floor_code,
        floor_name: formData.floor_name,
        status: formData.status,
      });

      sessionStorage.setItem(
        "floorSelection",
        JSON.stringify({
          site_id: formData.site_id,
          building_id: formData.building_id,
        })
      );

      return createdFloor.floor_id;
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error?.message ?? error.response?.data?.message
        : undefined;
      setErrorMessage(message || "Failed to create floor. Please try again.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    errorMessage,
    sites,
    buildings,
    formData,
    handleChange,
    handleSubmit,
  };
};
