export type BookingType = "internal" | "visitor";

export type GuestType =
  | "INTERVIEW_CANDIDATE"
  | "CUSTOMER"
  | "VENDOR"
  | "PARTNER"
  | "CONTRACTOR"
  | "OTHER";

export type PurposeOfVisit =
  | "INTERVIEW"
  | "MEETING"
  | "WORKSHOP"
  | "VENDOR_VISIT"
  | "CUSTOMER_VISIT"
  | "OTHER";

export type SeatRequired = "yes" | "no" | null;

export interface Employee {
  id: string;
  name: string;
  employeeId?: string;
  department?: string;
  email: string;
  role: string;
  status: string;
}

export interface Guest {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  organization?: string;
}

export interface Site {
  id: string;
  name: string;
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
}

export interface VisitDetails {
  guestType: GuestType;
  purposeOfVisit: PurposeOfVisit;
  hostEmployee: Employee | null;
  siteId: string;
  buildingId: string;
  floorId: string;
  visitDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  additionalNotes: string;
}

export interface BookingFormState {
  step: number;
  bookingType: BookingType;
  selectedEmployee: Employee | null;
  selectedGuest: Guest | null;
  visitDetails: VisitDetails;
  seatRequired: SeatRequired;
}

// ─── Service input / response types ──────────────────────────────────────────

export interface CreateGuestInput {
  fullName: string;
  email?: string;
  phone?: string;
  organization?: string;
}

export interface CreateGuestVisitInput {
  guestId: string;
  hostUserId: string;
  siteId: string;
  buildingId: string;
  floorId?: string;
  visitDate: string;
  guestType: GuestType;
  purposeOfVisit?: PurposeOfVisit | null;
  startTime?: string | null;
  endTime?: string | null;
  notes?: string | null;
}

export interface GuestVisitResponse {
  guest_visit_id: string;
  visit_status: string;
}

export interface EligibilityResponse {
  eligible: boolean;
  message: string;
}
