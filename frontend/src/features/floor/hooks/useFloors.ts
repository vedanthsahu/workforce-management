import { useEffect, useState } from "react";

import { floorService } from "../services/floorService";

export const useFloors = () => {
  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [sites, setSites] =
    useState<any[]>([]);

  const [buildings, setBuildings] =
    useState<any[]>([]);

  const [floors, setFloors] =
    useState<any[]>([]);

  const [stats, setStats] =
    useState<any>(null);

  const [selectedSite, setSelectedSite] =
    useState("");

  const [
    selectedBuilding,
    setSelectedBuilding,
  ] = useState("");

  useEffect(() => {
    fetchSites();
    fetchDashboardSummary();
  }, []);

  const fetchSites = async () => {
    try {
      const response =
        await floorService.getSites();

      const activeSites =
        response.filter(
          (site: any) =>
            site.status ===
            "ACTIVE"
        );

      setSites(activeSites);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchDashboardSummary =
    async () => {
      try {
        const response =
          await floorService.getDashboardSummary();

        setStats(response);
      } catch (error) {
        console.error(error);
      }
    };

  const fetchBuildings =
    async (siteId: string) => {
      try {
        const response =
          await floorService.getBuildings(
            Number(siteId)
          );

        setBuildings(response);
      } catch (error) {
        console.error(error);
      }
    };

  const fetchFloors =
    async (
      buildingId: string
    ) => {
      try {
        setLoading(true);

        const response =
          await floorService.getFloors(
            Number(buildingId)
          );

        setFloors(response);

        setError("");
      } catch (error) {
        console.error(error);

        setError(
          "Failed to load floors"
        );
      } finally {
        setLoading(false);
      }
    };

  const handleSiteChange =
    async (
      siteId: string
    ) => {
      setSelectedSite(siteId);

      setSelectedBuilding("");

      setBuildings([]);

      setFloors([]);

      if (!siteId) return;

      await fetchBuildings(
        siteId
      );
    };

  const handleBuildingChange =
    async (
      buildingId: string
    ) => {
      setSelectedBuilding(
        buildingId
      );

      setFloors([]);

      if (!buildingId) return;

      await fetchFloors(
        buildingId
      );
    };

  const refreshFloors =
    async () => {
      if (
        selectedBuilding
      ) {
        await fetchFloors(
          selectedBuilding
        );
      }

      await fetchDashboardSummary();
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