"use client";

import { useEffect, useRef, useState } from "react";
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

  // Table skeleton -- first load only. Later fetches (post-edit refresh)
  // keep the current rows on screen until the new ones arrive, so the user
  // never sees the table blank out.
  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [stats, setStats] =
    useState<BuildingStatsSummary | null>(
      null
    );

  // Cards have their own API, so their skeleton is tied to it alone --
  // filtering the table never touches the cards.
  const [statsLoading, setStatsLoading] =
    useState(true);

  // Ignore responses from superseded requests (e.g. overlapping refreshes).
  const latestBuildingsRequest = useRef(0);

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
  // Always loads every building for the tenant. The office filter and the
  // office dropdown's options are derived client-side on the page (the
  // status cards narrow which offices are listed), so filtering never
  // needs a refetch.
  const fetchBuildings = async () => {
  const requestId = ++latestBuildingsRequest.current;
  try {
    const data =
      await buildingService.getBuildings({
        page: 1,
      });

    if (requestId !== latestBuildingsRequest.current) return;
    setError("");
    setBuildings(data);
  } catch (err) {
    if (requestId !== latestBuildingsRequest.current) return;
    const message = axios.isAxiosError(err) ? err.message : undefined;
    setError(message || "Failed to fetch buildings");
  } finally {
    if (requestId === latestBuildingsRequest.current) setLoading(false);
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
    } finally {
      setStatsLoading(false);
    }
  };

  // INITIAL LOAD
  useEffect(() => {
    fetchSites();
    fetchStats();
    fetchBuildings();
  }, []);

  return {
    buildings,
    sites,

    stats,
    statsLoading,

    loading,
    error,

    search,
    setSearch,

    selectedSiteId,
    setSelectedSiteId,

    fetchBuildings,
    fetchSites,
    fetchStats,
  };
};
