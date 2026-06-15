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

export type SeatRequired = "yes" | "no" | null;

export interface Employee {
  id: string;
  name: string;
  employeeId: string;
  department: string;
  email: string;
  manager: string;
  status: "Active" | "Inactive";
}

export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  guestType: GuestType;
  notes?: string;
}

export interface VisitDetails {
  guestType: GuestType;
  purposeOfVisit: PurposeOfVisit;
  hostEmployee: Employee | null;
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
  guests: Guest[];
  selectedGuest: Guest | null;
  visitDetails: VisitDetails;
  seatRequired: SeatRequired;
}
