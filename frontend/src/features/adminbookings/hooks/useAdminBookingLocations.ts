import { useEffect, useState } from "react";

import { adminBookingLocationsService } from "../services/adminBookingLocations.service";
import {
  AdminBookingSiteOption,
  AdminBookingBuildingOption,
  AdminBookingFloorOption,
} from "../types/adminBooking.types";

export function useAdminBookingLocations() {
  const [sites, setSites] = useState<AdminBookingSiteOption[]>([]);
  const [buildings, setBuildings] = useState<AdminBookingBuildingOption[]>([]);
  const [floors, setFloors] = useState<AdminBookingFloorOption[]>([]);

  useEffect(() => {
    adminBookingLocationsService
      .getSites()
      .then(setSites)
      .catch((error) => console.error(error));
  }, []);

  const loadBuildings = async (siteId: string) => {
    if (!siteId) {
      setBuildings([]);
      return;
    }
    try {
      const data = await adminBookingLocationsService.getBuildings(siteId);
      setBuildings(data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadFloors = async (buildingId: string) => {
    if (!buildingId) {
      setFloors([]);
      return;
    }
    try {
      const data = await adminBookingLocationsService.getFloors(buildingId);
      setFloors(data);
    } catch (error) {
      console.error(error);
    }
  };

  return { sites, buildings, floors, loadBuildings, loadFloors, setBuildings, setFloors };
}
