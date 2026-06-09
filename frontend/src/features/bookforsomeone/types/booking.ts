export type BookingType = "internal" | "visitor";

export type GuestType =
  | "Interview Candidate"
  | "Client"
  | "Vendor"
  | "Partner"
  | "Other";

export type PurposeOfVisit =
  | "Interview"
  | "Meeting"
  | "Delivery"
  | "Tour"
  | "Other";

export interface Employee {
  id: string;
  name: string;
  employeeId: string;
  department: string;
  email: string;
  manager: string;
  status: "Active" | "Inactive";
}

export interface VisitorDetails {
  fullName: string;
  email: string;
  phoneNumber: string;
  organization: string;
  guestType: GuestType;
  purposeOfVisit: PurposeOfVisit;
  hostEmployee: Employee | null;
  additionalNotes: string;
}

export interface BookingFormState {
  bookingType: BookingType;
  selectedEmployee: Employee | null;
  visitorDetails: VisitorDetails;
}
