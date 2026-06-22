
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { securityService } from "../services/security.service";
import { mapApiGuestVisitToVisitor, mapApiSummary } from "../utils/security.utils";
import { useDebouncedValue } from "../hooks/Usedebouncedvalue";
import type { SecurityDashboardSummary, Site, Visitor } from "../types/security.types";

const PAGE_SIZE = 10;

/**
 * Drives the whole Security Dashboard page.
 *
 * GET /guest-visits returns the stat-card `summary` AND the table `items` in
 * one response, so a single fetch covers both. The endpoint itself isn't
 * paginated (no `page`/`total_pages` in the response), so pagination here is
 * done client-side over the fetched batch (up to `limit`, default 100).
 * If visit volume ever exceeds that, switch to real `offset`-based paging.
 */
export const useSecurityDashboard = () => {
  const [summary, setSummary] = useState<SecurityDashboardSummary | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | undefined>(undefined);

  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Sites (dummy list — swap once a real /sites endpoint exists) ─────────
  useEffect(() => {
    securityService
      .getSites()
      .then((res) => setSites(res.map((s) => ({ id: s.site_id, name: s.site_name }))))
      .catch((err) => console.error("Error fetching sites", err));
  }, []);

  // ── Guest visits: one call → both summary + items ────────────────────────
  const fetchGuestVisits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await securityService.getGuestVisits({
        visit_scope: "CURRENT",
        site_id: selectedSiteId,
        search: debouncedSearch || undefined,
        limit: 100,
        offset: 0,
      });

      setSummary(mapApiSummary(res.summary));
      setVisitors(res.items.map(mapApiGuestVisitToVisitor));
    } catch (err) {
      console.error("Error fetching guest visits", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [selectedSiteId, debouncedSearch]);

  useEffect(() => {
    fetchGuestVisits();
  }, [fetchGuestVisits]);

  // Jump back to page 1 whenever the filtered set changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedSiteId]);

  // ── Client-side pagination over the fetched batch ────────────────────────
  const total = visitors.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(page * PAGE_SIZE, total);

  const pagedVisitors = useMemo(
    () => visitors.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [visitors, page]
  );

  // ── Optimistic local patch — used by the dummy cancel/modify flows (and
  // available for check-in/out too) so the table reflects a change without
  // needing a backend round trip. ────────────────────────────────────────
  const patchVisitor = useCallback((id: string, patch: Partial<Visitor>) => {
    setVisitors((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }, []);

  return {
    summary,
    sites,
    selectedSiteId,
    setSelectedSiteId,
    expectedVisitors: pagedVisitors,
    totalVisitors: total,
    totalPages,
    page,
    setPage,
    pageStart,
    pageEnd,
    search,
    setSearch,
    loading,
    error,
    refetch: fetchGuestVisits,
    patchVisitor,
  };
};