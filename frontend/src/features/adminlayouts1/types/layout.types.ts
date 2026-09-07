export type LayoutItem = {
  name: string;
  version: string;
  status: string;
  date: string;
  user: string;
};

export type Site = {
  site_id: string;
  site_name: string;
};

export type Building = {
  building_id: string;
  building_name: string;
  site_id: string;
};

export type Floor = {
  floor_id: string;
  floor_name: string;
  building_id: string;
};

export type LayoutTableItem = {
  id: string;
  name: string;
  version: number;
  status: string;
  published: string;
  date: string;
  user: string;
  file: string;
};

export type LayoutApiResponse = {
  layout_id: string;
  tenant_id?: string;
  site_id: string;
  building_id: string;
  floor_id: string;
  site_name?: string;
  building_name?: string;
  floor_name?: string;
  layout_name: string;
  layout_file_url: string;
  version_no: number;
  is_published: boolean;
  status: string;
  created_at: string;
  updated_at?: string | null;
  uploaded_by_user_id: string;
  uploaded_by_name: string | null;
  updated_by_user_id?: string | null;
  updated_by_name?: string | null;
  published_by_user_id?: string | null;
  published_by_name?: string | null;
  published_at?: string | null;
};

export type LayoutSelection = {
  siteId: string;
  buildingId: string;
  floorId: string;
  siteName: string;
  buildingName: string;
  floorName: string;
};
