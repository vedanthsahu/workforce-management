import { axiosInstance } from "@/lib/http/axios";

import {
  Building,
  BuildingStatsSummary,
  SiteOption,
  CreateBuildingPayload,
  UpdateBuildingPayload,
} from "../types/building.types";

export const buildingService = {
  // GET BUILDINGS
  async getBuildings(params: {
    site_id?: number;
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<Building[]> {
    const { data } = await axiosInstance.get("/buildings", { params });

    return data;
  },

  // GET SITES DROPDOWN
  async getSites(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<SiteOption[]> {
    const { data } = await axiosInstance.get("/sites", { params });

    return data;
  },

  // CREATE BUILDING
  async createBuilding(payload: CreateBuildingPayload): Promise<Building> {
    const { data } = await axiosInstance.post("/buildings", payload);

    return data;
  },

  // UPDATE BUILDING
  async updateBuilding(
    building_id: string,
    payload: UpdateBuildingPayload
  ): Promise<Building> {
    const { data } = await axiosInstance.patch(
      `/buildings/${building_id}`,
      payload
    );

    return data;
  },

  // DASHBOARD STATS
  async getBuildingStats(): Promise<BuildingStatsSummary> {
    const { data } = await axiosInstance.get("/admin/dashboard/summary");

    return {
      total_buildings: data.total_buildings,
      active_buildings: data.active_buildings,
      inactive_buildings: data.inactive_buildings,
      total_seats: data.total_seats,
    };
  },
};
