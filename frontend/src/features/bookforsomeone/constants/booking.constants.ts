import { GuestType, PurposeOfVisit } from "../types/booking";

export const GUEST_TYPES: { value: GuestType; label: string }[] = [
  { value: "INTERVIEW_CANDIDATE", label: "Interview Candidate" },
  { value: "CUSTOMER",            label: "Customer" },
  { value: "VENDOR",              label: "Vendor" },
  { value: "PARTNER",             label: "Partner" },
  { value: "CONTRACTOR",          label: "Contractor" },
  { value: "OTHER",               label: "Other" },
];

export const PURPOSE_OF_VISIT: { value: PurposeOfVisit; label: string }[] = [
  { value: "INTERVIEW",      label: "Interview" },
  { value: "MEETING",        label: "Meeting" },
  { value: "WORKSHOP",       label: "Workshop" },
  { value: "VENDOR_VISIT",   label: "Vendor Visit" },
  { value: "CUSTOMER_VISIT", label: "Customer Visit" },
  { value: "OTHER",          label: "Other" },
];

// The advance window itself is tenant-configured (Configuration → Visitor
// Booking) and read via useBookingPolicy; only the wording lives here.
export const guestVisitTooFarInAdvanceMessage = (days: number) =>
  `Guest visits can only be booked up to ${days} days in advance. Please select a date within the next ${days} days.`;

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
