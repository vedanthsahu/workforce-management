import { useEffect, useState } from "react";

import { floorService } from "../services/floorService";
import {
  Floor,
  FloorSite,
  FloorBuilding,
  FloorStatsSummary,
} from "../types/floor.types";

export const useFloors = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [sites, setSites] = useState<FloorSite[]>([]);
  const [buildings, setBuildings] = useState<FloorBuilding[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [stats, setStats] = useState<FloorStatsSummary | null>(null);

  const [selectedSite, setSelectedSite] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState("");

  useEffect(() => {
    fetchSites();
    fetchDashboardSummary();
  }, []);

  // Auto-load the default site/building selection once sites are available
  useEffect(() => {
    const loadDefaultSelection = async () => {
      if (sites.length === 0) return;

      const defaultSiteId = "5";
      const defaultBuildingId = "7";

      await handleSiteChange(defaultSiteId);
      await handleBuildingChange(defaultBuildingId);
    };

    loadDefaultSelection();
  }, [sites]);

  // Restore a selection saved before navigating away (e.g. after creating a floor)
  useEffect(() => {
    restoreSelection();
  }, [sites]);

  const fetchSites = async () => {
    try {
      const response = await floorService.getSites();
      setSites(response);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchDashboardSummary = async () => {
    try {
      const response = await floorService.getDashboardSummary();
      setStats(response);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchBuildings = async (siteId: string) => {
    try {
      const response = await floorService.getBuildings(Number(siteId));
      setBuildings(response);

      if (response.length > 0) {
        const firstBuildingId = String(response[0].building_id);
        setSelectedBuilding(firstBuildingId);
        await fetchFloors(firstBuildingId);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchFloors = async (buildingId: string) => {
    try {
      setLoading(true);

      const response = await floorService.getFloors(Number(buildingId));
      setFloors(response);
      setError("");
    } catch (error) {
      console.error(error);
      setError("Failed to load floors");
    } finally {
      setLoading(false);
    }
  };

  const handleSiteChange = async (siteId: string) => {
    setSelectedSite(siteId);
    setSelectedBuilding("");
    setBuildings([]);
    setFloors([]);

    if (!siteId) return;
    await fetchBuildings(siteId);
  };

  const handleBuildingChange = async (buildingId: string) => {
    setSelectedBuilding(buildingId);
    setFloors([]);

    if (!buildingId) return;
    await fetchFloors(buildingId);
  };

  const refreshFloors = async () => {
    if (selectedBuilding) {
      await fetchFloors(selectedBuilding);
    }

    await fetchDashboardSummary();
  };

  const restoreSelection = async () => {
    const saved = sessionStorage.getItem("floorSelection");
    if (!saved) return;

    try {
      const { site_id, building_id } = JSON.parse(saved);

      await handleSiteChange(site_id);
      await handleBuildingChange(building_id);

      sessionStorage.removeItem("floorSelection");
    } catch (error) {
      console.error(error);
    }
  };

  return {
    loading,
    error,

    sites,
    buildings,
    floors,

    stats,

    selectedSite,
    selectedBuilding,

    handleSiteChange,
    handleBuildingChange,

    fetchFloors,
    refreshFloors,
  };
};
