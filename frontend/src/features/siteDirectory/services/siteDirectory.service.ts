import { serverFetch } from "@/lib/http/serverFetch";
import { SiteDirectoryEntry } from "../types/siteDirectory.types";

export const siteDirectoryService = {
  // Server Component only — used for the initial page render
  async getSites(): Promise<SiteDirectoryEntry[]> {
    return serverFetch<SiteDirectoryEntry[]>("/sites");
  },
};
