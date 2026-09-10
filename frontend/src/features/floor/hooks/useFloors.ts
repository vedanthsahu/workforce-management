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

    // A filter saved before navigating away (e.g. after creating a floor)
    // takes priority; otherwise load every floor for the tenant up front.
    const saved = sessionStorage.getItem("floorSelection");
    if (saved) {
      restoreSelection(saved);
    } else {
      fetchFloors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    } catch (error) {
      console.error(error);
    }
  };

  const fetchFloors = async (siteId?: string, buildingId?: string) => {
    try {
      setLoading(true);

      const response = await floorService.getAllFloors({
        site_id: siteId,
        building_id: buildingId,
      });
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

    if (siteId) {
      await fetchBuildings(siteId);
    }

    await fetchFloors(siteId || undefined, undefined);
  };

  const handleBuildingChange = async (buildingId: string) => {
    setSelectedBuilding(buildingId);

    await fetchFloors(selectedSite || undefined, buildingId || undefined);
  };

  const refreshFloors = async () => {
    await fetchFloors(selectedSite || undefined, selectedBuilding || undefined);
    await fetchDashboardSummary();
  };

  const restoreSelection = async (saved: string) => {
    try {
      const { site_id, building_id } = JSON.parse(saved);

      setSelectedSite(site_id || "");
      setSelectedBuilding(building_id || "");

      if (site_id) {
        await fetchBuildings(site_id);
      }

      await fetchFloors(site_id || undefined, building_id || undefined);

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
