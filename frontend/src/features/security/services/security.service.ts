import { axiosInstance } from "@/lib/http/axios";
import type {
  ApiSecurityDashboardSummary,
  ApiSite,
  CheckInPayload,
  CheckOutPayload,
  InviteGuestPayload,
  VisitorFilters,
  VisitorResponse,
} from "../types/security.types";

// ────────────────────────────────────────────────────────────────────────────
// ⚠️ DUMMY DATA MODE
// Backend isn't ready yet. Every method below returns hardcoded data shaped
// exactly like the real API response (see security.types.ts).
// When the backend is ready, replace ONLY the body of each function with the
// commented-out axiosInstance call below it — nothing else in the app needs
// to change since hooks/components consume these methods, not raw data.
// ────────────────────────────────────────────────────────────────────────────

const DUMMY_SITES: ApiSite[] = [
  { site_id: "1", site_name: "Head Office" },
  { site_id: "2", site_name: "Tech Park Annex" },
];

const DUMMY_VISITORS: VisitorResponse["items"] = [
  {
    visit_id: "v1",
    guest_name: "Arjun Singh",
    guest_initials: "AS",
    guest_phone: "+91 98765 43210",
    guest_email: "arjun.singh@example.com",
    host_name: "Rahul Mehta",
    host_email: "rahul.mehta@company.com",
    host_phone: "+91 98765 11111",
    purpose: "Meeting",
    visit_date: "2026-06-16",
    start_time: "10:00",
    end_time: "12:00",
    site_id: "1",
    site_name: "Head Office",
    building_name: "Tower A",
    floor_name: "4th Floor",
    seat_code: "A-48",
    seat_booked: true,
    status: "SCHEDULED",
  },
  {
    visit_id: "v2",
    guest_name: "Priya Sharma",
    guest_initials: "PS",
    guest_phone: "+91 98123 45670",
    guest_email: "priya.sharma@example.com",
    host_name: "Neha Verma",
    host_email: "neha.verma@company.com",
    host_phone: "+91 98765 11111",
    purpose: "Vendor Visit",
    visit_date: "2026-06-16",
    start_time: "12:00",
    end_time: "13:00",
    site_id: "1",
    site_name: "Head Office",
    building_name: "Tower B",
    floor_name: "3rd Floor",
    seat_code: null,
    seat_booked: false,
    status: "SCHEDULED",
  },
  {
    visit_id: "v3",
    guest_name: "Rohit Kumar",
    guest_initials: "RK",
    guest_phone: "+91 99887 76655",
    guest_email: "rohit.kumar@example.com",
    host_phone: "+91 98765 11111",
    host_name: "Amit Patel",
    host_email: "amit.patel@company.com",
    purpose: "Interview",
    visit_date: "2026-06-16",
    start_time: "12:00",
    end_time: "13:00",
    site_id: "1",
    site_name: "Head Office",
    building_name: "Tower A",
    floor_name: "8th Floor",
    seat_code: "A-12",
    seat_booked: true,
    status: "SCHEDULED",
  },
  {
    visit_id: "v4",
    guest_name: "Sarah Johnson",
    guest_initials: "SJ",
    guest_phone: "+91 90123 45678",
    guest_email: "sarah.johnson@example.com",
    host_name: "Vikram Joshi",
    host_email: "vikram.joshi@company.com",
    host_phone: "+91 98765 11111",
    purpose: "Customer Visit",
    visit_date: "2026-06-16",
    start_time: "13:00",
    end_time: "14:30",
    site_id: "1",
    site_name: "Head Office",
    building_name: "Tower B",
    floor_name: "8th Floor",
    seat_code: "B-06",
    seat_booked: true,
    status: "SCHEDULED",
  },
  {
    visit_id: "v5",
    guest_name: "Karthik Reddy",
    guest_initials: "KR",
    guest_phone: "+91 91234 56789",
    guest_email: "karthik.reddy@example.com",
    host_name: "Divya Nair",
    host_email: "divya.nair@company.com",
    host_phone: "+91 98765 11111",
    purpose: "Vendor Visit",
    visit_date: "2026-06-16",
    start_time: "14:00",
    end_time: "15:00",
    site_id: "1",
    site_name: "Head Office",
    building_name: "Tower A",
    floor_name: "2nd Floor",
    seat_code: null,
    seat_booked: false,
    status: "SCHEDULED",
  },
  {
    visit_id: "v6",
    guest_name: "Anita Desai",
    guest_initials: "AD",
    guest_phone: "+91 99001 22334",
    guest_email: "anita.desai@example.com",
    host_name: "Suresh Iyer",
    host_email: "suresh.iyer@company.com",
    host_phone: "+91 98765 11111",
    purpose: "Meeting",
    visit_date: "2026-06-16",
    start_time: "09:00",
    end_time: "10:00",
    site_id: "1",
    site_name: "Head Office",
    building_name: "Tower A",
    floor_name: "5th Floor",
    seat_code: "A-22",
    seat_booked: true,
    status: "CHECKED_IN",
  },
  {
    visit_id: "v7",
    guest_name: "Vikas Malhotra",
    guest_initials: "VM",
    guest_phone: "+91 98456 12378",
    guest_email: "vikas.malhotra@example.com",
    host_name: "Pooja Bhatt",
    host_email: "pooja.bhatt@company.com",
    host_phone: "+91 98765 11111",
    purpose: "Interview",
    visit_date: "2026-06-16",
    start_time: "11:00",
    end_time: "12:00",
    site_id: "2",
    site_name: "Tech Park Annex",
    building_name: "Block C",
    floor_name: "1st Floor",
    seat_code: "C-04",
    seat_booked: true,
    status: "OVERDUE",
  },
  {
    visit_id: "v8",
    guest_name: "Meera Pillai",
    guest_initials: "MP",
    guest_phone: "+91 97890 65432",
    guest_email: "meera.pillai@example.com",
    host_name: "Arvind Rao",
    host_email: "arvind.rao@company.com",
    host_phone: "+91 98765 11111",
    purpose: "Customer Visit",
    visit_date: "2026-06-16",
    start_time: "15:00",
    end_time: "16:00",
    site_id: "1",
    site_name: "Head Office",
    building_name: "Tower B",
    floor_name: "6th Floor",
    seat_code: null,
    seat_booked: false,
    status: "CANCELLED",
  },
  {
    visit_id: "v9",
    guest_name: "Farhan Ali",
    guest_initials: "FA",
    guest_phone: "+91 96123 78945",
    guest_email: "farhan.ali@example.com",
    host_name: "Geeta Krishnan",
    host_email: "geeta.krishnan@company.com",
    host_phone: "+91 98765 11111",
    purpose: "Meeting",
    visit_date: "2026-06-16",
    start_time: "16:00",
    end_time: "17:00",
    site_id: "1",
    site_name: "Head Office",
    building_name: "Tower A",
    floor_name: "4th Floor",
    seat_code: "A-50",
    seat_booked: true,
    status: "NO_SHOW",
  },
  {
    visit_id: "v10",
    guest_name: "Lakshmi Venkatesh",
    guest_initials: "LV",
    guest_phone: "+91 95678 23456",
    guest_email: "lakshmi.venkatesh@example.com",
    host_name: "Manoj Kumar",
    host_email: "manoj.kumar@company.com",
    host_phone: "+91 98765 11111",
    purpose: "Vendor Visit",
    visit_date: "2026-06-16",
    start_time: "10:30",
    end_time: "11:30",
    site_id: "1",
    site_name: "Head Office",
    building_name: "Tower B",
    floor_name: "2nd Floor",
    seat_code: null,
    seat_booked: false,
    status: "SCHEDULED",
  },
  {
    visit_id: "v11",
    guest_name: "Aditya Chopra",
    guest_initials: "AC",
    guest_phone: "+91 94512 67890",
    guest_email: "aditya.chopra@example.com",
    host_name: "Ritu Singh",
    host_email: "ritu.singh@company.com",
    host_phone: "+91 98765 11111",
    purpose: "Interview",
    visit_date: "2026-06-16",
    start_time: "11:30",
    end_time: "12:30",
    site_id: "1",
    site_name: "Head Office",
    building_name: "Tower A",
    floor_name: "8th Floor",
    seat_code: "A-15",
    seat_booked: true,
    status: "SCHEDULED",
  },
  {
    visit_id: "v12",
    guest_name: "Neha Kapoor",
    guest_initials: "NK",
    guest_phone: "+91 93456 78901",
    guest_email: "neha.kapoor@example.com",
    host_name: "Sandeep Joshi",
    host_email: "sandeep.joshi@company.com",
    host_phone: "+91 98765 11111",
    purpose: "Customer Visit",
    visit_date: "2026-06-16",
    start_time: "13:30",
    end_time: "14:30",
    site_id: "1",
    site_name: "Head Office",
    building_name: "Tower B",
    floor_name: "3rd Floor",
    seat_code: "B-09",
    seat_booked: true,
    status: "SCHEDULED",
  },
];

const DUMMY_SUMMARY: ApiSecurityDashboardSummary = {
  expected_today: DUMMY_VISITORS.filter((v) => v.status === "SCHEDULED").length,
  checked_in: DUMMY_VISITORS.filter((v) => v.status === "CHECKED_IN").length,
  overdue_checkout: DUMMY_VISITORS.filter((v) => v.status === "OVERDUE").length,
  cancelled_no_show: DUMMY_VISITORS.filter(
    (v) => v.status === "CANCELLED" || v.status === "NO_SHOW"
  ).length,
};

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function applyFilters(filters?: VisitorFilters) {
  let result = [...DUMMY_VISITORS];

  if (filters?.site_id) {
    result = result.filter((v) => v.site_id === filters.site_id);
  }

  if (filters?.status && filters.status !== "ALL") {
    result = result.filter((v) => v.status === filters.status);
  }

  if (filters?.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    result = result.filter((v) => v.guest_name.toLowerCase().includes(q));
  }

  return result;
}

export const securityService = {
  // GET DASHBOARD SUMMARY
  async getDashboardSummary(params?: {
    date?: string;
    site_id?: string;
  }): Promise<ApiSecurityDashboardSummary> {
    return delay(DUMMY_SUMMARY);
    // return (await axiosInstance.get("/security/dashboard/summary", { params })).data;
  },

  // GET SITES (for the "Site: Head Office" selector)
  async getSites(): Promise<ApiSite[]> {
    return delay(DUMMY_SITES);
    // return (await axiosInstance.get("/sites", { params: { status: "ACTIVE" } })).data;
  },

  // GET VISITORS (today's expected / checked-in / past visits — filtered by status)
  async getVisitors(filters?: VisitorFilters): Promise<VisitorResponse> {
    const filtered = applyFilters(filters);
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 10;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);

    return delay({
      items,
      total: filtered.length,
      page,
      limit,
      total_pages: Math.max(1, Math.ceil(filtered.length / limit)),
    });
    // const { data } = await axiosInstance.get("/security/visitors", { params: filters });
    // return data;
  },

  // CHECK IN
  async checkInVisitor(payload: CheckInPayload): Promise<void> {
    return delay(undefined);
    // await axiosInstance.post(`/security/visitors/${payload.visit_id}/check-in`);
  },

  // CHECK OUT
  async checkOutVisitor(payload: CheckOutPayload): Promise<void> {
    return delay(undefined);
    // await axiosInstance.post(`/security/visitors/${payload.visit_id}/check-out`);
  },

  // INVITE GUEST
  async inviteGuest(payload: InviteGuestPayload): Promise<{ visit_id: string }> {
    return delay({ visit_id: `v${Date.now()}` });
    // const { data } = await axiosInstance.post("/security/visitors/invite", payload);
    // return data;
  },
};