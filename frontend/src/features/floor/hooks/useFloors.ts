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

  useEffect(() => {
  const loadDefaultSelection = async () => {
    if (sites.length === 0) return;

    const defaultSiteId = "5";
    const defaultBuildingId = "7";

    await handleSiteChange(defaultSiteId);
    await handleBuildingChange(defaultBuildingId);
  };

  loadDefaultSelection();
  }, [sites]); // auto-load default selection based on known default site and building .

//   useEffect(() => {
//   if (sites.length > 0) {
//     handleSiteChange(
//       sites[0].site_id.toString()
//     );
//   }
// }, [sites]); // auto-select first site on load, which will cascade to auto-select first building and load floors for that building

useEffect(() => {
  restoreSelection();
}, [sites]);
// auto-restore selection on page load, but only after sites have loaded to prevent restoring invalid selections
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

  // const fetchBuildings =
  //   async (siteId: string) => {
  //     try {
  //       const response =
  //         await floorService.getBuildings(
  //           Number(siteId)
  //         );

  //       setBuildings(response);
  //     } catch (error) {
  //       console.error(error);
  //     }
  //   };

  const fetchBuildings =
  async (siteId: string) => {
    try {
      const response =
        await floorService.getBuildings(
          Number(siteId)
        );

      setBuildings(response);

      // Auto-select first building
      if (response.length > 0) {
        const firstBuildingId =
          response[0].building_id.toString();

        setSelectedBuilding(firstBuildingId);

        await fetchFloors(firstBuildingId);
      }

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



    const restoreSelection = async () => {
  const saved =
    sessionStorage.getItem(
      "floorSelection"
    );

  if (!saved) return;

  try {
    const {
      site_id,
      building_id,
    } = JSON.parse(saved);

    await handleSiteChange(
      site_id
    );

    await handleBuildingChange(
      building_id
    );

    sessionStorage.removeItem(
      "floorSelection"
    );
  } catch (error) {
    console.error(error);
  }
};

// Call this function when a new floor is created to save the current selection
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