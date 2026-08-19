import { axiosInstance } from "@/lib/http/axios";
import { AuditLogDetailRaw, AuditLogListResponse, AuditSortBy, AuditSortDir } from "../types/audit.types";

export interface AuditLogListParams {
  search?: string;
  action?: string;
  module?: string;
  entity?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  /** Relative "Last N seconds" quick filter -- takes precedence over startDate/endDate when set. */
  lastSeconds?: number;
  sortBy?: AuditSortBy;
  sortDir?: AuditSortDir;
  page?: number;
  limit?: number;
}

export const auditService = {
  async list(params: AuditLogListParams = {}): Promise<AuditLogListResponse> {
    const { data } = await axiosInstance.get("/admin/audit", { params });
    return data;
  },

  async getById(id: string): Promise<AuditLogDetailRaw> {
    const { data } = await axiosInstance.get(`/admin/audit/${id}`);
    return data;
  },
};
