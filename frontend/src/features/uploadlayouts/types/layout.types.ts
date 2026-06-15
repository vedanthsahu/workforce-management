export type SelectOption = {
  id: number;
  name: string;
  code?: string;
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

export type FloorLayoutInfo = {
  layoutId?: string | null;
  layoutName?: string | null;
  layoutStatus?: string | null;
  layoutIsPublished?: boolean | null;
  layoutVersionNo?: number | null;
  layoutFileUrl?: string | null;
  layoutCount?: number | null;
};

export type Site = {
  site_id: number;
  site_name: string;
  site_code?: string;
  status?: string;
};

export type Building = {
  building_id: number;
  building_name: string;
  building_code?: string;
};

export type Floor = {
  floor_id: number;
  floor_name?: string;
  floor_code?: string;
  layout_id?: string | null;
  layout_name?: string | null;
  layout_status?: string | null;
  layout_is_published?: boolean | null;
  layout_version_no?: number | null;
  layout_file_url?: string | null;
  layout_count?: number | null;
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
