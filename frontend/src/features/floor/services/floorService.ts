import { axiosInstance } from "@/lib/http/axios";

export const floorService = {

  async getSites() {
    const { data } =
      await axiosInstance.get("/sites");

    return data;
  },

  async getBuildings(site_id: number) {
    const { data } =
      await axiosInstance.get(
        "/buildings",
        {
          params: {
            site_id,
          },
        }
      );

    return data;
  },

  async getFloors(building_id: number) {
    const { data } =
      await axiosInstance.get(
        `/buildings/${building_id}/floors`
      );

    return data;
  },

  async createFloor(payload: any) {
    const { data } =
      await axiosInstance.post(
        "/floors",
        payload
      );

    return data;
  },

  async updateFloor(
    floor_id: string,
    payload: any
  ) {
    const { data } =
      await axiosInstance.patch(
        `/floors/${floor_id}`,
        payload
      );

    return data;
  },

  async getDashboardSummary() {
  const { data } =
    await axiosInstance.get(
      "/admin/dashboard/summary"
    );

  return data;
},
};