// import { axiosInstance } from "@/lib/http/axios";
// import { Office ,UpdateOfficePayload ,OfficeStatsSummary,} from "../types/office.types";


// export const officeService = {
//   // GET ALL SITES
//   async getSites(params?: {
//     page?: number;
//     limit?: number;
//     search?: string;
//     status?: string;
//   }): Promise<Office[]> {
//     const { data } = await axiosInstance.get("/sites", {
//       params,
//     });
//     return data;
//   },
//   //  UPDATE SITE
//   async updateSite(
//     site_id: string,
//     payload: UpdateOfficePayload
//   ) {

//     const { data } = await axiosInstance.patch(
//       `/sites/${site_id}`,
//       payload
//     );

//     return data;
//   },

//   async getOfficeStats(): Promise<OfficeStatsSummary> {

//   const { data } = await axiosInstance.get(
//     "/admin/dashboard/summary"
//   );

//   return {
//     total_offices: data.total_offices,
//     active_sites: data.active_sites,
//     inactive_sites: data.inactive_sites,
//     total_seats: data.total_seats,
//   };
// },
// };



import { axiosInstance } from "@/lib/http/axios";
import {
  Office,
  UpdateOfficePayload,
  OfficeStatsSummary,
  CreateOfficePayload,
} from "../types/office.types";


export const officeService = {
  // GET ALL SITES
  async getSites(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<Office[]> {
    const { data } = await axiosInstance.get("/sites", {
      params,
    });

    return data;
  },

  // CREATE SITE
  async createSite(
    payload: CreateOfficePayload
  ) {
    const { data } = await axiosInstance.post(
      "/sites",
      payload
    );


    return data;
  },

  // CREATE SITE
  // async createSite(
  //   payload: CreateOfficePayload
  // ) {
  //   const { data } = await axiosInstance.post(
  //     "/sites",
  //     payload
  //   );

  //   return data;
  // },

  

  // UPDATE SITE
  async updateSite(
    site_id: string,
    payload: UpdateOfficePayload
  ) {
    const { data } = await axiosInstance.patch(
      `/sites/${site_id}`,
      payload
    );

    return data;
  },

  async getOfficeStats(): Promise<OfficeStatsSummary> {
    const { data } = await axiosInstance.get(
      "/admin/dashboard/summary"
    );

    return {
      total_offices: data.total_offices,
      active_sites: data.active_sites,
      inactive_sites: data.inactive_sites,
      total_seats: data.total_seats,
    };
  },
};