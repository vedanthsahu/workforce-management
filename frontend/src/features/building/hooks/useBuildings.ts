"use client";

import { useEffect, useState } from "react";

import { buildingService } from "../services/buildingService";

import {
  Building,
  BuildingStatsSummary,
  SiteOption,
} from "../types/building.types";

export const useBuildings = () => {
  const [buildings, setBuildings] =
    useState<Building[]>([]);

  const [sites, setSites] =
    useState<SiteOption[]>([]);

  const [selectedSiteId, setSelectedSiteId] =
    useState<string>("");

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [stats, setStats] =
    useState<BuildingStatsSummary | null>(
      null
    );

  // FETCH SITES
  const fetchSites = async () => {
    try {
      const data =
        await buildingService.getSites({
          page: 1,
        });

      setSites(data);

      // auto-select first site
      if (
        data.length > 0 &&
        !selectedSiteId
      ) {
        setSelectedSiteId(
          data[0].site_id
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // FETCH BUILDINGS
  const fetchBuildings = async (
    siteId?: string
  ) => {
    try {
      if (!siteId) return;

      setLoading(true);
      setError("");

      const data =
        await buildingService.getBuildings(
          {
            site_id: Number(siteId),
            page: 1,
          }
        );

      setBuildings(data);
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to fetch buildings"
      );
    } finally {
      setLoading(false);
    }
  };

  // FETCH STATS
  const fetchStats = async () => {
    try {
      const data =
        await buildingService.getBuildingStats();

      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  // INITIAL LOAD
  useEffect(() => {
    fetchSites();
    fetchStats();
  }, []);

  // FETCH BUILDINGS WHEN SITE CHANGES
  useEffect(() => {
    if (selectedSiteId) {
      fetchBuildings(
        selectedSiteId
      );
    }
  }, [selectedSiteId]);

  return {
    buildings,
    sites,

    stats,

    loading,
    error,

    search,
    setSearch,

    selectedSiteId,
    setSelectedSiteId,

    fetchBuildings,
    fetchSites,
  };
};
