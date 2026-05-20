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

export type LayoutSelection = {
  siteId: string;
  buildingId: string;
  floorId: string;

  siteName: string;
  buildingName: string;
  floorName: string;
};