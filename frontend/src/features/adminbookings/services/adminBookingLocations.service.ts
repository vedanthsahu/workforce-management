import { axiosInstance } from "@/lib/http/axios";

import {
  AdminBookingSiteOption,
  AdminBookingBuildingOption,
  AdminBookingFloorOption,
} from "../types/adminBooking.types";

export const adminBookingLocationsService = {
  async getSites(): Promise<AdminBookingSiteOption[]> {
    const { data } = await axiosInstance.get("/sites");

    return data;
  },

  async getBuildings(siteId: string): Promise<AdminBookingBuildingOption[]> {
    const { data } = await axiosInstance.get("/buildings", {
      params: { site_id: siteId },
    });

    return data;
  },

  async getFloors(buildingId: string): Promise<AdminBookingFloorOption[]> {
    const { data } = await axiosInstance.get(`/buildings/${buildingId}/floors`);

    return data;
  },
};
