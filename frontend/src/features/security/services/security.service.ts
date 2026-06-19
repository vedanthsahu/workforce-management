// import { axiosInstance } from "@/lib/http/axios";
// import type {
//   ApiGuestVisit,
//   ApiGuestBooking, 
//   ApiSecurityDashboardSummary,
//   ApiSite,
//   CancelBookingPayload,
//   CheckInPayload,
//   CheckOutPayload,
//   InviteGuestPayload,
//   ModifyBookingPayload,
//   VisitorFilters,
//   VisitorResponse,
// } from "../types/security.types";

// // ── Dummy data for stats/sites (swap when backend endpoints are ready) ────────

// const DUMMY_SITES: ApiSite[] = [
//   { site_id: "1", site_name: "Head Office" },
//   { site_id: "2", site_name: "Tech Park Annex" },
// ];

// const DUMMY_SUMMARY: ApiSecurityDashboardSummary = {
//   expected_today: 8,
//   checked_in: 1,
//   overdue_checkout: 1,
//   cancelled_no_show: 2,
// };

// function delay<T>(value: T, ms = 0): Promise<T> {
//   return new Promise((resolve) => setTimeout(() => resolve(value), ms));
// }

// // ─────────────────────────────────────────────────────────────────────────────

// export const securityService = {
//   // ── DASHBOARD SUMMARY (dummy — swap body when /security/dashboard/summary is ready)
//   async getDashboardSummary(_params?: {
//     date?: string;
//     site_id?: string;
//   }): Promise<ApiSecurityDashboardSummary> {
//     return delay(DUMMY_SUMMARY);
//     // const { data } = await axiosInstance.get("/security/dashboard/summary", { params: _params });
//     // return data;
//   },

//   // ── SITES (dummy — swap body when /sites is ready) ────────────────────────
//   async getSites(): Promise<ApiSite[]> {
//     return delay(DUMMY_SITES);
//     // const { data } = await axiosInstance.get("/sites", { params: { status: "ACTIVE" } });
//     // return data;
//   },

//   // ── GET GUEST VISITS ──────────────────────────────────────────────────────
//   async getVisitors(filters?: VisitorFilters): Promise<VisitorResponse> {
//     const page = filters?.page ?? 1;
//     const limit = filters?.limit ?? 10;
//     const offset = (page - 1) * limit;

//     const params: Record<string, unknown> = {
//       limit,
//       offset,
//       visit_scope: "CURRENT", // ✅ restricts to today's visits only
//     };

//     // Server-side status filter
//     if (filters?.status && filters.status !== "ALL") {
//       params.visit_status = filters.status;
//     }

//     // Server-side search (guest name / host name)
//     if (filters?.search?.trim()) {
//       params.search = filters.search.trim();
//     }

//     // Server-side site filter
//     if (filters?.site_id) {
//       params.site_id = filters.site_id;
//     }

//     const { data } = await axiosInstance.get<{ items: ApiGuestVisit[]; total?: number }>(
//       "/guest-visits",
//       { params }
//     );

//     const items: ApiGuestVisit[] = Array.isArray(data.items) ? data.items : [];
//     const total = data.total ?? items.length;

//     return {
//       items,
//       total,
//       page,
//       limit,
//       total_pages: Math.max(1, Math.ceil(total / limit)),
//     };
//   },

//   // ── GET SINGLE VISIT (for view-details modal) ─────────────────────────────
//   // async getBookingById(guestVisitId: string): Promise<ApiGuestVisit> {
//   //   const { data } = await axiosInstance.get<ApiGuestVisit>(
//   //     `/guest-visits/${guestVisitId}`
//   //   );
//   //   return data;
//   // },

//   async getBookingById(bookingId: string): Promise<ApiGuestBooking> {
//   const { data } = await axiosInstance.get<ApiGuestBooking>(
//     `/guest-bookings/${bookingId}`   // ← was /guest-visits/
//   );
//   return data;
// },

//   // ── CHECK IN ──────────────────────────────────────────────────────────────
//   async checkInVisitor(payload: CheckInPayload): Promise<void> {
//     await axiosInstance.post(`/guest-visits/${payload.visit_id}/check-in`);
//   },

//   // ── CHECK OUT ─────────────────────────────────────────────────────────────
//   async checkOutVisitor(payload: CheckOutPayload): Promise<void> {
//     await axiosInstance.post(`/guest-visits/${payload.visit_id}/check-out`);
//   },

//   // ── CANCEL BOOKING ────────────────────────────────────────────────────────
//   async cancelBooking(
//     bookingId: string,
//     payload: CancelBookingPayload
//   ): Promise<void> {
//     await axiosInstance.post(`/guest-bookings/${bookingId}/cancel`, payload);
//   },

//   // ── MODIFY BOOKING ────────────────────────────────────────────────────────
//   async modifyBooking(
//     bookingId: string,
//     payload: ModifyBookingPayload
//   ): Promise<void> {
//     await axiosInstance.post(`/guest-bookings/${bookingId}/modify`, payload);
//   },

//   // ── INVITE GUEST ──────────────────────────────────────────────────────────
//   async inviteGuest(payload: InviteGuestPayload): Promise<{ visit_id: string }> {
//     const { data } = await axiosInstance.post("/security/visitors/invite", payload);
//     return data;
//   },
// };


import { axiosInstance } from "@/lib/http/axios";
import type {
  ApiGuestBooking,
  ApiSecurityDashboardSummary,
  ApiSite,
  CancelVisitPayload,
  CheckInPayload,
  CheckOutPayload,
  InviteGuestPayload,
  ModifyVisitPayload,
  VisitorFilters,
  VisitorResponse,
} from "../types/security.types";

// ── Dummy data for stats/sites (backend endpoints not ready yet) ─────────────
// Replace getDashboardSummary and getSites bodies when the endpoints are live.

const DUMMY_SITES: ApiSite[] = [
  { site_id: "1", site_name: "Head Office" },
  { site_id: "2", site_name: "Tech Park Annex" },
];

const DUMMY_SUMMARY: ApiSecurityDashboardSummary = {
  expected_today: 8,
  checked_in: 1,
  overdue_checkout: 1,
  cancelled_no_show: 2,
};

function delay<T>(value: T, ms = 0): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
// ─────────────────────────────────────────────────────────────────────────────

export const securityService = {
  // ── DASHBOARD SUMMARY (dummy — swap body when /security/dashboard/summary is ready)
  async getDashboardSummary(_params?: {
    date?: string;
    site_id?: string;
  }): Promise<ApiSecurityDashboardSummary> {
    return delay(DUMMY_SUMMARY);
    // const { data } = await axiosInstance.get("/security/dashboard/summary", { params: _params });
    // return data;
  },

  // ── SITES (dummy — swap body when /sites is ready) ────────────────────────
  async getSites(): Promise<ApiSite[]> {
    return delay(DUMMY_SITES);
    // const { data } = await axiosInstance.get("/sites", { params: { status: "ACTIVE" } });
    // return data;
  },

  // ── GET ALL GUEST BOOKINGS (real API — client-side search + pagination) ────
  async getVisitors(filters?: VisitorFilters): Promise<VisitorResponse> {
    const params: Record<string, unknown> = { limit: 100 };

    if (filters?.date) {
      params.booking_date = filters.date;
    }

    const { data } = await axiosInstance.get<ApiGuestBooking[]>("/guest-bookings", { params });

    let items: ApiGuestBooking[] = Array.isArray(data) ? data : [];

    // ── Client-side filters ────────────────────────────────────────────────
    if (filters?.status && filters.status !== "ALL") {
      items = items.filter((v) => v.visit_status === filters.status);
    }

    if (filters?.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      items = items.filter(
        (v) =>
          v.guest_name.toLowerCase().includes(q) ||
          (v.host_name ?? "").toLowerCase().includes(q)
      );
    }

    // ── Client-side pagination ─────────────────────────────────────────────
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 10;
    const start = (page - 1) * limit;
    const pageItems = items.slice(start, start + limit);

    return {
      items: pageItems,
      total: items.length,
      page,
      limit,
      total_pages: Math.max(1, Math.ceil(items.length / limit)),
    };
  },

  // ── GET SINGLE BOOKING (for view-details modal) ───────────────────────────
  async getBookingById(bookingId: string): Promise<ApiGuestBooking> {
    const { data } = await axiosInstance.get<ApiGuestBooking>(
      `/guest-bookings/${bookingId}`
    );
    return data;
  },

  // ── CHECK IN ──────────────────────────────────────────────────────────────
  async checkInVisitor(payload: CheckInPayload): Promise<void> {
    await axiosInstance.post(`/security/visitors/${payload.visit_id}/check-in`);
  },

  // ── CHECK OUT ─────────────────────────────────────────────────────────────
  async checkOutVisitor(payload: CheckOutPayload): Promise<void> {
    await axiosInstance.post(`/security/visitors/${payload.visit_id}/check-out`);
  },

  // ── CANCEL VISIT ──────────────────────────────────────────────────────────
  // POST /guest-visits/{guest_visit_id}/cancel
  async cancelVisit(
    guestVisitId: string,
    payload: CancelVisitPayload
  ): Promise<void> {
    await axiosInstance.post(`/guest-visits/${guestVisitId}/cancel`, payload);
  },

  // ── MODIFY VISIT ──────────────────────────────────────────────────────────
  // PATCH /guest-visits/{guest_visit_id}
  async modifyVisit(
    guestVisitId: string,
    payload: ModifyVisitPayload
  ): Promise<void> {
    await axiosInstance.patch(`/guest-visits/${guestVisitId}`, payload);
  },

  // ── INVITE GUEST ──────────────────────────────────────────────────────────
  async inviteGuest(payload: InviteGuestPayload): Promise<{ visit_id: string }> {
    const { data } = await axiosInstance.post("/security/visitors/invite", payload);
    return data;
  },
};