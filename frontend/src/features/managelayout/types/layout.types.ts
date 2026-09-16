export interface Site {
  id: string;
  name: string;
  city: string;
  country: string;
  timezone: string;
}

export interface Building {
  id: string;
  siteId: string;
  name: string;
}

export interface Floor {
  id: string;
  buildingId: string;
  name: string;
  number: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout types
// ─────────────────────────────────────────────────────────────────────────────

export type LayoutStatus = "PUBLISHED" | "SCHEDULED" | "ARCHIVED" | "DRAFT";

export interface LayoutMetadata {
  width?: number;
  height?: number;
  source?: string;
  description?: string;
  [key: string]: unknown;
}

export interface Layout {
  layout_id: string;
  tenant_id: string;
  site_id: string;
  building_id: string;
  floor_id: string;
  site_name: string;
  building_name: string;
  floor_name: string;
  layout_name: string;
  layout_file_url: string;
  file_storage_provider: string;
  layout_type: string;
  version_no: number;
  is_published: boolean;
  layout_metadata: LayoutMetadata;
  uploaded_by_user_id: string;
  uploaded_by_name: string;
  uploaded_by_email: string;
  uploaded_by_role: string;
  uploaded_by_department: string;
  uploaded_by_job_title: string;
  published_by_user_id: string | null;
  published_at: string | null;
  status: LayoutStatus;
  effective_from: string | null;
  effective_till: string | null;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout scheduling policy — resolved business-rule values, not raw catalog
// rows. See GET /business-rules/layout-policy.
// ─────────────────────────────────────────────────────────────────────────────

export interface LayoutPolicy {
  employee_max_advance_days: number;
  buffer_days: number;
  // Earliest a new layout can be scheduled to take effect, in days from
  // today (employee_max_advance_days + buffer_days).
  min_advance_days: number;
  visibility_days: {
    draft: number;
    archived: number;
    deleted: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Seat stats — returned by a separate summary endpoint
// ─────────────────────────────────────────────────────────────────────────────

export interface LayoutSeatStats {
  layout_id: string;
  total_seats: number;
  configured_seats: number;
  unconfigured_seats: number;
  non_bookable_seats: number;
  bookable_seats: number;
  inactive_seats?: number;
}