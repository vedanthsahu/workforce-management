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
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoadingSites(true);
    void blockedSeatsService
      .getSites()
      .then((items) => {
        if (!cancelled) {
          setSites(items);
          setLocationError("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSites([]);
          setLocationError("Unable to load offices. Refresh the page and try again.");
        }
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
    setLocationError("");
    try {
      setBuildings(await blockedSeatsService.getBuildings(siteId));
    } catch {
      setBuildings([]);
      setLocationError("Unable to load buildings for the selected office.");
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
    setLocationError("");
    try {
      setFloors(await blockedSeatsService.getFloors(buildingId));
    } catch {
      setFloors([]);
      setLocationError("Unable to load floors for the selected building.");
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
    locationError,
    loadBuildings,
    loadFloors,
    setBuildings,
    setFloors,
  };
}
