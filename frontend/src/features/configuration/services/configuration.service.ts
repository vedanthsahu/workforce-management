import { axiosInstance } from "@/lib/http/axios";

// ─────────────────────────────────────────────────────────────────────────────
// Business-rule policy — resolved values (tenant override applied where one
// exists, falling back to the catalog default), not raw catalog rows. See
// backend/api/routes/business_rules.py.
// ─────────────────────────────────────────────────────────────────────────────

export interface BookingPolicy {
  employee_max_advance_days: number;
  guest_max_advance_days: number;
}

export interface LayoutVisibilityDays {
  draft: number;
  archived: number;
  deleted: number;
}

export interface LayoutPolicy {
  employee_max_advance_days: number;
  buffer_days: number;
  min_advance_days: number;
  visibility_days: LayoutVisibilityDays;
}

export async function fetchBookingPolicy(): Promise<BookingPolicy> {
  const { data } = await axiosInstance.get<BookingPolicy>("/business-rules/booking-policy");
  return data;
}

export async function updateBookingPolicy(
  patch: Partial<BookingPolicy>,
): Promise<BookingPolicy> {
  const { data } = await axiosInstance.patch<BookingPolicy>("/business-rules/booking-policy", patch);
  return data;
}

export async function fetchLayoutPolicy(): Promise<LayoutPolicy> {
  const { data } = await axiosInstance.get<LayoutPolicy>("/business-rules/layout-policy");
  return data;
}

export async function updateLayoutPolicy(patch: {
  buffer_days?: number;
  visibility_days?: Partial<LayoutVisibilityDays>;
}): Promise<LayoutPolicy> {
  const { data } = await axiosInstance.patch<LayoutPolicy>("/business-rules/layout-policy", patch);
  return data;
}
