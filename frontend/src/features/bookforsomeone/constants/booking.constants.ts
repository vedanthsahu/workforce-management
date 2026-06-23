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
