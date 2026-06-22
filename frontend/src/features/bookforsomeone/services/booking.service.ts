import { axiosInstance } from "@/lib/http/axios";
import {
  Building,
  CreateGuestInput,
  CreateGuestVisitInput,
  Employee,
  Floor,
  Guest,
  GuestVisitResponse,
  GuestType,
  PurposeOfVisit,
  Site,
} from "../types/booking";

export type { CreateGuestInput, CreateGuestVisitInput, GuestVisitResponse };

// ── Users (employee search) ───────────────────────────────────────────────────

interface RawUser {
  user_id: string;
  tenant_id: string;
  full_name: string;
  email: string;
  role_name: string;
  status: string;
  employee_id?: string | null;
  department?: string | null;
}

function mapUser(u: RawUser): Employee {
  return {
    id: u.user_id,
    name: u.full_name,
    employeeId: u.employee_id ?? undefined,
    department: u.department ?? undefined,
    email: u.email,
    role: u.role_name,
    status: u.status,
  };
}

export async function searchUsers(query: string, limit = 20, excludeId?: string): Promise<Employee[]> {
  if (!query.trim()) return [];
  const { data } = await axiosInstance.get<RawUser[]>("/users", {
    params: { q: query, limit },
  });
  return data.map(mapUser).filter((u) => !excludeId || u.id !== excludeId);
}

// ── Guests ───────────────────────────────────────────────────────────────────

interface RawGuest {
  guest_id: string;
  tenant_id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  organization?: string | null;
  status: string;
  created_at?: string | null;
  updated_at?: string | null;
}

function mapGuest(g: RawGuest): Guest {
  return {
    id: g.guest_id,
    fullName: g.full_name,
    email: g.email ?? "",
    phone: g.phone ?? undefined,
    organization: g.organization ?? undefined,
  };
}

export async function searchGuests(query: string, limit = 20): Promise<Guest[]> {
  if (!query.trim()) return [];
  const { data } = await axiosInstance.get<RawGuest[]>("/guests", {
    params: { q: query, limit },
  });
  return data.map(mapGuest);
}

export async function createGuest(input: CreateGuestInput): Promise<Guest> {
  const { data } = await axiosInstance.post<RawGuest>("/guests", {
    full_name: input.fullName,
    email: input.email || undefined,
    phone: input.phone || undefined,
    organization: input.organization || undefined,
  });
  return mapGuest(data);
}

// ── Sites & Buildings ────────────────────────────────────────────────────────

interface RawSite {
  site_id: string;
  site_name: string;
}

export async function fetchSites(): Promise<Site[]> {
  const { data } = await axiosInstance.get<RawSite[]>("/sites", {
    params: { status: "ACTIVE" },
  });
  return data.map((s) => ({ id: s.site_id, name: s.site_name }));
}

interface RawBuilding {
  building_id: string;
  site_id: string;
  building_name: string;
}

export async function fetchBuildings(siteId: string): Promise<Building[]> {
  const { data } = await axiosInstance.get<RawBuilding[]>("/buildings", {
    params: { site_id: siteId, status: "ACTIVE" },
  });
  return data.map((b) => ({ id: b.building_id, siteId: b.site_id, name: b.building_name }));
}

// ── Floors ───────────────────────────────────────────────────────────────────

interface RawFloor {
  floor_id: string;
  building_id?: string;
  floor_name?: string;
  floor_code?: string;
}

export async function fetchFloors(buildingId: string): Promise<Floor[]> {
  const { data } = await axiosInstance.get<RawFloor[]>(
    `/buildings/${buildingId}/floors`,
    { params: { status: "ACTIVE" } },
  );
  return data.map((f) => ({
    id: f.floor_id,
    buildingId: f.building_id ?? buildingId,
    name: f.floor_name ?? f.floor_code ?? `Floor ${f.floor_id}`,
  }));
}

// ── Guest Visits ─────────────────────────────────────────────────────────────

export async function createGuestVisit(input: CreateGuestVisitInput): Promise<GuestVisitResponse> {
  const { data } = await axiosInstance.post<GuestVisitResponse>("/guest-visits", {
    guest_id: Number(input.guestId),
    host_user_id: Number(input.hostUserId),
    site_id: Number(input.siteId),
    building_id: Number(input.buildingId),
    visit_date: input.visitDate,
    guest_type: input.guestType,
    purpose_of_visit: input.purposeOfVisit || undefined,
    start_time: input.startTime || undefined,
    end_time: input.endTime || undefined,
    notes: input.notes || undefined,
  });
  return data;
}

// ── Booking Eligibility ─────────────────────────────────────────────────────

interface EligibilityResponse {
  eligible: boolean;
  message: string;
}

export async function checkGuestBookingEligibility(
  guestId: string,
  startDate: string,
  endDate: string,
): Promise<EligibilityResponse> {
  const { data } = await axiosInstance.post<EligibilityResponse>("/bookings/eligibility", {
    start_date: startDate,
    end_date: endDate || startDate,
    is_guest_booking: true,
    booked_for_guest_id: Number(guestId),
  });
  return data;
}