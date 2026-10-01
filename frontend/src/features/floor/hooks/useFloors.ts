import { useEffect, useRef, useState } from "react";

import { floorService } from "../services/floorService";
import {
  Floor,
  FloorSite,
  FloorBuilding,
  FloorStatsSummary,
} from "../types/floor.types";

export const useFloors = () => {
  // Table skeleton -- first load only. Later fetches (office/building filter,
  // post-edit refresh) keep the current rows on screen until the new ones
  // arrive, so the table never blanks out while filtering.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Cards have their own API, so their skeleton is tied to it alone --
  // filtering the table never touches the cards.
  const [statsLoading, setStatsLoading] = useState(true);

  // Ignore responses from superseded requests (e.g. fast filter switching).
  const latestFloorsRequest = useRef(0);
  const latestBuildingsRequest = useRef(0);

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
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchBuildings = async (siteId: string) => {
    const requestId = ++latestBuildingsRequest.current;
    try {
      const response = await floorService.getBuildings(Number(siteId));
      if (requestId !== latestBuildingsRequest.current) return;
      setBuildings(response);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchFloors = async (siteId?: string, buildingId?: string) => {
    const requestId = ++latestFloorsRequest.current;
    try {
      const response = await floorService.getAllFloors({
        site_id: siteId,
        building_id: buildingId,
      });
      if (requestId !== latestFloorsRequest.current) return;
      setFloors(response);
      setError("");
    } catch (error) {
      if (requestId !== latestFloorsRequest.current) return;
      console.error(error);
      setError("Failed to load floors");
    } finally {
      if (requestId === latestFloorsRequest.current) setLoading(false);
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
    statsLoading,

    selectedSite,
    selectedBuilding,

    handleSiteChange,
    handleBuildingChange,

    fetchFloors,
    refreshFloors,
  };
};
