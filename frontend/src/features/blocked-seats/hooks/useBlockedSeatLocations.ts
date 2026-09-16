import { useCallback, useEffect, useState } from "react";
import { blockedSeatsService } from "../services/blockedSeatsService";
import type { LocationOption } from "../types/blockedSeats.types";

export function useBlockedSeatLocations() {
  const [sites, setSites] = useState<LocationOption[]>(
    () => blockedSeatsService.getCachedSites() ?? [],
  );
  const [buildings, setBuildings] = useState<LocationOption[]>([]);
  const [floors, setFloors] = useState<LocationOption[]>([]);
  const [loadingSites, setLoadingSites] = useState(
    () => !blockedSeatsService.getCachedSites(),
  );
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [loadingFloors, setLoadingFloors] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingSites(true);
    void blockedSeatsService
      .getSites()
      .then((items) => {
        if (!cancelled) setSites(items);
      })
      .catch(() => {
        if (!cancelled) setSites([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSites(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadBuildings = useCallback(async (siteId: string) => {
    setFloors([]);
    setLoadingFloors(false);
    if (!siteId) {
      setBuildings([]);
      setLoadingBuildings(false);
      return;
    }
    const cached = blockedSeatsService.getCachedBuildings(siteId);
    if (cached) {
      setBuildings(cached);
      setLoadingBuildings(false);
      return;
    }
    setLoadingBuildings(true);
    try {
      setBuildings(await blockedSeatsService.getBuildings(siteId));
    } catch {
      setBuildings([]);
    } finally {
      setLoadingBuildings(false);
    }
  }, []);

  const loadFloors = useCallback(async (buildingId: string) => {
    if (!buildingId) {
      setFloors([]);
      setLoadingFloors(false);
      return;
    }
    const cached = blockedSeatsService.getCachedFloors(buildingId);
    if (cached) {
      setFloors(cached);
      setLoadingFloors(false);
      return;
    }
    setLoadingFloors(true);
    try {
      setFloors(await blockedSeatsService.getFloors(buildingId));
    } catch {
      setFloors([]);
    } finally {
      setLoadingFloors(false);
    }
  }, []);

  return {
    sites,
    buildings,
    floors,
    loadingSites,
    loadingBuildings,
    loadingFloors,
    loadBuildings,
    loadFloors,
    setBuildings,
    setFloors,
  };
}
