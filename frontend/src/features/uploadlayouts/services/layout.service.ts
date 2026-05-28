import { axiosInstance } from "@/lib/http/axios";

export const layoutService = {

async createLayout(payload: any) {
  const formData = new FormData();

  formData.append("file", payload.file);
  formData.append("site_id", String(payload.site_id));
  formData.append("building_id", String(payload.building_id));
  formData.append("floor_id", String(payload.floor_id));
  formData.append("layout_name", payload.layout_name);
  formData.append("status", payload.status);

  // IMPORTANT: MUST MATCH SWAGGER
  formData.append("layout_metadata", "{}");

  const { data } = await axiosInstance.post(
    "/admin/floor-layouts",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return data;
},

async getSites() {
  const { data } = await axiosInstance.get("/sites");
  return data;
},

async getBuildings(site_id: number) {
  const { data } = await axiosInstance.get("/buildings", {
      params: { site_id },
    });
    return data;
},

async getFloors(building_id: number) {
   const { data } = await axiosInstance.get(
      `/buildings/${building_id}/floors`
    );
    return data;
},
};
