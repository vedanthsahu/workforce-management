import { Employee, GuestType, PurposeOfVisit } from "../types/booking";


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
