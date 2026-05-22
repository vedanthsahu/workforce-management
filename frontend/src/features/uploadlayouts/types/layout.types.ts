export type UploadPayload = {
  file: File;
  site_id: number;
  building_id: number;
  floor_id: number;
};

export type CreateLayoutPayload = {
  site_id: number;
  building_id: number;
  floor_id: number;
  layout_name: string;
  layout_file_url: string;
  status: "DRAFT" | "PUBLISHED";
  layout_metadata: Record<string, any>;
};

export type Props = {
  formData: {
    site: string;
    building: string;
    floor: string;
    layoutName: string;
  };
};