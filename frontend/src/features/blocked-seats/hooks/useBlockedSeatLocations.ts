import { useCallback, useEffect, useState } from "react";
import { blockedSeatsService } from "../services/blockedSeatsService";
import type { LocationOption } from "../types/blockedSeats.types";

export function useBlockedSeatLocations() {
  const [sites, setSites] = useState<LocationOption[]>([]);
  const [buildings, setBuildings] = useState<LocationOption[]>([]);
  const [floors, setFloors] = useState<LocationOption[]>([]);
  useEffect(() => { blockedSeatsService.getSites().then(setSites).catch(console.error); }, []);
  const loadBuildings = useCallback(async (siteId: string) => { setFloors([]); setBuildings(siteId ? await blockedSeatsService.getBuildings(siteId) : []); }, []);
  const loadFloors = useCallback(async (buildingId: string) => { setFloors(buildingId ? await blockedSeatsService.getFloors(buildingId) : []); }, []);
  return { sites, buildings, floors, loadBuildings, loadFloors, setBuildings, setFloors };
}
