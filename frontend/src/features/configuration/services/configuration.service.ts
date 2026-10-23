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

export async function fetchLayoutPolicy(): Promise<LayoutPolicy> {
  const { data } = await axiosInstance.get<LayoutPolicy>("/business-rules/layout-policy");
  return data;
}

export interface ActivityPolicy {
  // Rows shown in the admin dashboard's Recent Activities table.
  record_count: number;
}

export async function fetchActivityPolicy(): Promise<ActivityPolicy> {
  const { data } = await axiosInstance.get<ActivityPolicy>("/business-rules/activity-policy");
  return data;
}

export interface BlockedSeatPolicy {
  // A block is flagged Upcoming/Expiring Soon if it starts/ends within
  // this many days of today.
  upcoming_days: number;
  expiring_soon_days: number;
  // Expired blocks shown in the Expired tab are restricted to the previous
  // N days from today.
  expired_window_days: number;
  // How many days ahead a block can be created, modified or re-blocked.
  max_advance_days: number;
}

export async function fetchBlockedSeatPolicy(): Promise<BlockedSeatPolicy> {
  const { data } = await axiosInstance.get<BlockedSeatPolicy>("/business-rules/blocked-seat-policy");
  return data;
}

export interface ChatbotPolicy {
  employee_access_enabled: boolean;
}

export async function fetchChatbotPolicy(): Promise<ChatbotPolicy> {
  const { data } = await axiosInstance.get<ChatbotPolicy>(
    "/business-rules/chatbot-policy",
  );
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Writes -- one POST replacing the old one-PATCH-per-policy-area routes (see
// backend/api/routes/business_rules.py). A caller sends only the specific
// settings it's changing, by id (business_rule_service.BUSINESS_RULE_SETTERS
// has the full list), and gets back every policy's fresh resolved state in
// one response -- so a save that affects a derived field on another card
// (e.g. the booking window feeding the layout card's "Effective After
// (Total)") never needs a second round-trip to pick that up.
// ─────────────────────────────────────────────────────────────────────────────

export interface BusinessRules {
  booking_policy: BookingPolicy;
  layout_policy: LayoutPolicy;
  activity_policy: ActivityPolicy;
  blocked_seat_policy: BlockedSeatPolicy;
  chatbot_policy: ChatbotPolicy;
}

export interface BusinessRuleUpdate {
  id: string;
  value: number | boolean;
}

export async function updateBusinessRules(
  updates: BusinessRuleUpdate[],
): Promise<BusinessRules> {
  const { data } = await axiosInstance.post<BusinessRules>("/business-rules", {
    updates,
  });
  return data;
}
