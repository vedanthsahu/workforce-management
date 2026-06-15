import { axiosInstance } from "@/lib/http/axios";
import { Building, CreateLayoutPayload, Floor, Site } from "../types/layout.types";

export const layoutService = {
  async createLayout(payload: CreateLayoutPayload) {
    const formData = new FormData();

    formData.append("file", payload.file);
    formData.append("site_id", String(payload.site_id));
    formData.append("building_id", String(payload.building_id));
    formData.append("floor_id", String(payload.floor_id));
    formData.append("layout_name", payload.layout_name);
    formData.append("status", payload.status);
    formData.append("layout_metadata", "{}");

    // FastAPI receives list[str] when the same key is repeated
    payload.seat_ids.forEach((id) => formData.append("seat_ids", id));

    const { data } = await axiosInstance.post("/admin/floor-layouts", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return data;
  },

  async getSites(): Promise<Site[]> {
    const { data } = await axiosInstance.get("/sites", {
      params: { status: "ACTIVE" },
    });
    return data;
  },

  async getBuildings(site_id: number): Promise<Building[]> {
    const { data } = await axiosInstance.get("/buildings", {
      params: { site_id },
    });
    return data;
  },

  async getFloors(building_id: number): Promise<Floor[]> {
    const { data } = await axiosInstance.get(`/buildings/${building_id}/floors`);
    return data;
  },

  async getLayoutsByFloor(floor_id: number) {
    const { data } = await axiosInstance.get(
      `/admin/floor-layouts/floors/${floor_id}`
    );

    return data;
  },
};
