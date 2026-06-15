import { Employee, Guest, GuestType, PurposeOfVisit } from "../types/booking";


export const MOCK_EMPLOYEES: Employee[] = [
  {
    id: "1",
    name: "John Smith",
    employeeId: "EMP10045",
    department: "Engineering",
    email: "john.smith@company.com",
    manager: "David Miller",
    status: "Active",
  },
  {
    id: "2",
    name: "Rohit Verma",
    employeeId: "EMP10021",
    department: "Engineering",
    email: "rohit.verma@company.com",
    manager: "David Miller",
    status: "Active",
  },
  {
    id: "3",
    name: "Sarah Johnson",
    employeeId: "EMP10033",
    department: "Product",
    email: "sarah.johnson@company.com",
    manager: "Alice Chen",
    status: "Active",
  },
  {
    id: "4",
    name: "Meera Nair",
    employeeId: "EMP10058",
    department: "Design",
    email: "meera.nair@company.com",
    manager: "Vikram Rao",
    status: "Active",
  },
];

export const GUEST_TYPES: GuestType[] = [
  "Interview Candidate",
  "Client",
  "Vendor",
  "Partner",
  "Other",
];

export const PURPOSE_OF_VISIT: PurposeOfVisit[] = [
  "Interview",
  "Meeting",
  "Delivery",
  "Tour",
  "Other",
];

export function searchEmployees(query: string): Employee[] {
  if (!query.trim()) return MOCK_EMPLOYEES;
  const lower = query.toLowerCase();
  return MOCK_EMPLOYEES.filter(
    (e) =>
      e.name.toLowerCase().includes(lower) ||
      e.email.toLowerCase().includes(lower) ||
      e.employeeId.toLowerCase().includes(lower)
  );
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const MOCK_GUESTS: Guest[] = [
  {
    id: "g1",
    firstName: "Alex",
    lastName: "Carter",
    email: "alex.carter@acmecorp.com",
    phone: "+1 555 010 1234",
    company: "Acme Corp",
    jobTitle: "Product Manager",
    guestType: "Client",
  },
  {
    id: "g2",
    firstName: "Priya",
    lastName: "Sharma",
    email: "priya.sharma@globex.com",
    company: "Globex Solutions",
    jobTitle: "Recruiter",
    guestType: "Vendor",
  },
  {
    id: "g3",
    firstName: "Daniel",
    lastName: "Lee",
    email: "daniel.lee@example.com",
    guestType: "Interview Candidate",
  },
];

export function getGuestName(guest: Guest): string {
  return `${guest.firstName} ${guest.lastName}`.trim();
}

export function searchGuests(query: string, guests: Guest[]): Guest[] {
  if (!query.trim()) return guests;
  const lower = query.toLowerCase();
  return guests.filter(
    (g) =>
      getGuestName(g).toLowerCase().includes(lower) ||
      g.email.toLowerCase().includes(lower) ||
      (g.company ?? "").toLowerCase().includes(lower)
  );
}

export function createGuest(data: Omit<Guest, "id">): Guest {
  return {
    id: `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    ...data,
  };
}
