// // Re-exported from existing layout.types — keep in sync with your layout.types file
// export interface Layout {
//   layout_id: string;
//   floor_id: string;
//   layout_name: string;
//   layout_file_url: string;
//   is_published: boolean;
//   status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
// }

// export interface LayoutSeatStats {
//   total_seats: number;
//   configured_seats: number;
//   unconfigured_seats: number;
//   non_bookable_seats: number;
// }

export interface Preference {
  preference_id: string;
  preference_name: string;
  preference_type: string;
  description: string;
  icon_name: string;
}

/**
 * DO NOT define types here — import them directly from the existing
 * managelayout feature to avoid duplicate-type assignment errors.
 *
 * Re-exporting avoids the "Type X is not assignable to type X" error
 * that TypeScript throws when two separate files define the same shape.
 */
export type {
  Layout,
  LayoutSeatStats,
  Site,
  Building,
  Floor,
} from "@/features/managelayout/types/layout.types";