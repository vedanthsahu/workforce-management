import { axiosInstance } from "@/lib/http/axios";

import type { CreateLayoutPayload, UploadPayload } from "@/features/uploadlayouts/types/layout.types";
import { Payload } from "recharts/types/component/DefaultTooltipContent";


export const layoutService = {

  async uploadSvg(payload: UploadPayload) {
    const formData = new FormData();

    formData.append("file", payload.file);
    formData.append("site_id", String(payload.site_id));
    formData.append("building_id", String(payload.building_id));
    formData.append("floor_id", String(payload.floor_id));

    const { data } = await axiosInstance.post(
      "/admin/floor-layouts/upload-svg",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return data; // { object_url: string }
  },

  async createLayout(payload: any) {
    const { data } = await axiosInstance.post(
      "/admin/floor-layouts",
      payload
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
