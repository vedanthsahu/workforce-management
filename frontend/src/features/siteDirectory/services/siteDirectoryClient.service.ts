import { axiosInstance } from "@/lib/http/axios";
import { CreateSiteDirectoryPayload } from "../types/siteDirectory.types";

// Client Component only — used to create a site from the browser
export const siteDirectoryClientService = {
  async createSite(payload: CreateSiteDirectoryPayload) {
    const { data } = await axiosInstance.post("/sites", payload);
    return data;
  },
};
