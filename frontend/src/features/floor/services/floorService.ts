import { axiosInstance } from "@/lib/http/axios";

import {
  Floor,
  FloorSite,
  FloorBuilding,
  FloorStatsSummary,
  CreateFloorPayload,
  UpdateFloorPayload,
} from "../types/floor.types";

export const floorService = {
  async getSites(): Promise<FloorSite[]> {
    const { data } = await axiosInstance.get("/sites");

    return data;
  },

  async getBuildings(site_id: number): Promise<FloorBuilding[]> {
    const { data } = await axiosInstance.get("/buildings", {
      params: { site_id },
    });

    return data;
  },

  async getFloors(building_id: number): Promise<Floor[]> {
    const { data } = await axiosInstance.get(`/buildings/${building_id}/floors`);

    return data;
  },

  async getAllFloors(params?: { site_id?: string; building_id?: string }): Promise<Floor[]> {
    const { data } = await axiosInstance.get("/floors", {
      params: {
        site_id: params?.site_id || undefined,
        building_id: params?.building_id || undefined,
      },
    });

    return data;
  },

  async createFloor(payload: CreateFloorPayload): Promise<Floor> {
    const { data } = await axiosInstance.post("/floors", payload);

    return data;
  },

  async updateFloor(floor_id: string, payload: UpdateFloorPayload): Promise<Floor> {
    const { data } = await axiosInstance.patch(`/floors/${floor_id}`, payload);

    return data;
  },

  async getDashboardSummary(): Promise<FloorStatsSummary> {
    const { data } = await axiosInstance.get("/admin/dashboard/summary");

    return data;
  },
};
