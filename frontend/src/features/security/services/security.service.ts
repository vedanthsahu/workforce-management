import { axiosInstance } from "@/lib/http/axios";
import type {
  ApiCheckInOutResponse,
  ApiGuestVisitsResponse,
  ApiSite,
  CancelVisitPayload,
  GuestVisitsQueryParams,
  InviteGuestPayload,
  ModifyVisitPayload,
} from "../types/security.types";

// ── Dummy sites (backend /sites endpoint not ready yet) ──────────────────────
const DUMMY_SITES: ApiSite[] = [
  { site_id: "5", site_name: "Hyderabad Begumpet Office" },
  { site_id: "6", site_name: "Tech Park Annex" },
];

function delay<T>(value: T, ms = 500): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

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

  // ── SITES (dummy — swap for a real /sites call once the backend has one) ──
  async getSites(): Promise<ApiSite[]> {
    return delay(DUMMY_SITES, 150);
  },

  // ── CANCEL VISIT ─────────────────────────────────────────────────────────
  // 🚧 DUMMY — intentionally NOT calling the backend yet (per request: cancel
  // is low priority right now). This just simulates a network round trip.
  // Flip the comments below once the endpoint is ready to wire up for real:
  //
  //   await axiosInstance.post(`/guest-visits/${guestVisitId}/cancel`, payload);
  //
  async cancelVisit(guestVisitId: string, payload: CancelVisitPayload): Promise<void> {
    console.log("[DUMMY cancelVisit] guestVisitId:", guestVisitId, "payload:", payload);
    await delay(undefined, 700);
  },

  // ── MODIFY VISIT ─────────────────────────────────────────────────────────
  // 🚧 DUMMY — intentionally NOT calling the backend yet (per request: modify
  // is low priority right now). This just simulates a network round trip.
  // Flip the comments below once the endpoint is ready to wire up for real:
  //
  //   await axiosInstance.patch(`/guest-visits/${guestVisitId}`, payload);
  //
  async modifyVisit(guestVisitId: string, payload: ModifyVisitPayload): Promise<void> {
    console.log("[DUMMY modifyVisit] guestVisitId:", guestVisitId, "payload:", payload);
    await delay(undefined, 700);
  },

  // ── INVITE GUEST (unchanged — outside this pass's scope) ───────────────────
  async inviteGuest(payload: InviteGuestPayload): Promise<{ visit_id: string }> {
    const { data } = await axiosInstance.post("/security/visitors/invite", payload);
    return data;
  },
};