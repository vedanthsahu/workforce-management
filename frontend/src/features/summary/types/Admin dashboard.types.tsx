// Mirrors backend response shape for GET /admin/dashboard/summary (snake_case, matches FastAPI schema)

export interface AdminDashboardSummary {
  total_offices: number;
  total_buildings: number;
  total_floors: number;
  total_seats: number;
}

// Query params accepted by the endpoint (all optional / nullable on the backend)
export interface AdminDashboardSummaryParams {
  date?: string | null;
  site_id?: number | null;
  floor_id?: number | null;
}

// Card-shaped view of a single summary metric, derived in the hook for the UI to render directly
export interface SummaryCardItem {
  key: keyof AdminDashboardSummary;
  label: string;
  value: number | undefined;
}