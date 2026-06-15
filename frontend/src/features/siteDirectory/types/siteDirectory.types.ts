export interface SiteDirectoryEntry {
  site_id: string;
  site_name: string;
  city: string;
  country: string;
  status: string;
}

export interface CreateSiteDirectoryPayload {
  site_code: string;
  site_name: string;
  city: string;
  country: string;
  timezone: string;
  status: "ACTIVE" | "INACTIVE";
}
