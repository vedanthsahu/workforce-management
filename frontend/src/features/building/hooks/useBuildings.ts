"use client";

import { useEffect, useState } from "react";
import axios from "axios";

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
    } catch (err) {
      console.error(err);
    }
  };

// FETCH BUILDINGS
  const fetchBuildings = async (
  siteId?: string
) => {
  try {
    setLoading(true);
    setError("");

    const data =
      await buildingService.getBuildings({
        site_id: siteId
          ? Number(siteId)
          : undefined,
        page: 1,
      });

    setBuildings(data);
  } catch (err) {
    const message = axios.isAxiosError(err) ? err.message : undefined;
    setError(message || "Failed to fetch buildings");
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
    fetchBuildings(); 
  }, []);

  // FETCH BUILDINGS WHEN SITE CHANGES
  useEffect(() => {
    
      fetchBuildings(
        selectedSiteId || undefined
      );
    
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
