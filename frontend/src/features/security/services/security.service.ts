import { axiosInstance } from "@/lib/http/axios";
import type {
  ApiCheckInOutResponse,
  ApiGuestVisitsResponse,
  ApiSite,
  GuestVisitsQueryParams,
  InviteGuestPayload,
} from "../types/security.types";

// ─────────────────────────────────────────────────────────────────────────────

export const securityService = {
  // ── GET GUEST VISITS (real API) ────────────────────────────────────────────
  // Single call — the backend returns both the stat-card `summary` and the
  // table `items` together, so this is the only call the dashboard needs.
  async getGuestVisits(params: GuestVisitsQueryParams = {}): Promise<ApiGuestVisitsResponse> {
    const { data } = await axiosInstance.get<ApiGuestVisitsResponse>("/guest-visits", {
      params: {
        visit_scope: params.visit_scope ?? "CURRENT",
        limit: params.limit ?? 100,
        offset: params.offset ?? 0,
        ...(params.site_id ? { site_id: params.site_id } : {}),
        ...(params.visit_status && params.visit_status !== "ALL"
          ? { visit_status: params.visit_status }
          : {}),
        ...(params.requires_seat !== undefined ? { requires_seat: params.requires_seat } : {}),
        ...(params.search ? { search: params.search } : {}),
      },
    });
    return data;
  },

  // ── CHECK IN (real API) ─────────────────────────────────────────────────────
  // POST /guest-visits/{guest_visit_id}/check-in
  async checkInVisit(guestVisitId: string): Promise<ApiCheckInOutResponse> {
    const { data } = await axiosInstance.post<ApiCheckInOutResponse>(
      `/guest-visits/${guestVisitId}/check-in`
    );
    return data;
  },

  // ── CHECK OUT (real API) ────────────────────────────────────────────────────
  // POST /guest-visits/{guest_visit_id}/check-out
  async checkOutVisit(guestVisitId: string): Promise<ApiCheckInOutResponse> {
    const { data } = await axiosInstance.post<ApiCheckInOutResponse>(
      `/guest-visits/${guestVisitId}/check-out`
    );
    return data;
  },

  // ── SITES (real API) ────────────────────────────────────────────────────
  async getSites(): Promise<ApiSite[]> {
    const { data } = await axiosInstance.get<ApiSite[]>("/sites");
    return data;
  },

  // ── INVITE GUEST (unchanged — outside this pass's scope) ───────────────────
  async inviteGuest(payload: InviteGuestPayload): Promise<{ visit_id: string }> {
    const { data } = await axiosInstance.post("/security/visitors/invite", payload);
    return data;
  },
};