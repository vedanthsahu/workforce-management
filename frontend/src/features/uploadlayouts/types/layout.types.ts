export type SelectOption = {
  id: number;
  name: string;
};

export type LayoutFormState = {
  site: SelectOption | null;
  building: SelectOption | null;
  floor: SelectOption | null;
  layoutName: string;
  file: File | null;
  description?: string;
};

export type LayoutSummaryData = Pick<
  LayoutFormState,
  "site" | "building" | "floor" | "layoutName"
>;

export type Site = {
  site_id: number;
  site_name: string;
  status?: string;
};

export type Building = {
  building_id: number;
  building_name: string;
};

export type Floor = {
  floor_id: number;
  floor_name?: string;
  floor_code?: string;
};

export type CreateLayoutPayload = {
  file: File;
  site_id: number;
  building_id: number;
  floor_id: number;
  layout_name: string;
  status: "DRAFT";
  seat_ids: string[];
};
