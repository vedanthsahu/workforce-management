

"use client";

import { useCallback, useEffect, useState } from "react";
import { securityService } from "../services/security.service";
import { mapApiVisitorToVisitor } from "../utils/security.utils";
import type { SecurityDashboardSummary, Site, Visitor } from "../types/security.types";

const PAGE_SIZE = 10;

export const useSecurityDashboard = (date?: string, siteId?: string) => {
  const [summary, setSummary] = useState<SecurityDashboardSummary | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | undefined>(siteId);
  const [expectedVisitors, setExpectedVisitors] = useState<Visitor[]>([]);
  const [totalVisitors, setTotalVisitors] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummaryAndSites = useCallback(async () => {
    try {
      const [summaryRes, sitesRes] = await Promise.all([
        securityService.getDashboardSummary({ date, site_id: selectedSiteId }),
        securityService.getSites(),
      ]);

      setSummary({
        expectedToday: summaryRes.expected_today,
        checkedIn: summaryRes.checked_in,
        overdueCheckout: summaryRes.overdue_checkout,
        cancelledNoShow: summaryRes.cancelled_no_show,
      });

      setSites(sitesRes.map((s) => ({ id: s.site_id, name: s.site_name })));
    } catch (err) {
      console.error("Error fetching security summary", err);
      setError("Failed to load dashboard data");
    }
  }, [date, selectedSiteId]);

  const fetchVisitors = useCallback(async () => {
    try {
      setLoading(true);
      const visitorsRes = await securityService.getVisitors({
        date,
        site_id: selectedSiteId,
        status: "SCHEDULED",
        search: search || undefined,
        page,
        limit: PAGE_SIZE,
      });

      setExpectedVisitors(visitorsRes.items.map(mapApiVisitorToVisitor));
      setTotalVisitors(visitorsRes.total);
      setTotalPages(visitorsRes.total_pages);
    } catch (err) {
      console.error("Error fetching visitors", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [date, selectedSiteId, search, page]);

  // Reset to page 1 whenever search or filters change
  useEffect(() => {
    setPage(1);
  }, [search, selectedSiteId, date]);

  useEffect(() => {
    fetchSummaryAndSites();
  }, [fetchSummaryAndSites]);

  useEffect(() => {
    fetchVisitors();
  }, [fetchVisitors]);

  const refetch = useCallback(() => {
    fetchSummaryAndSites();
    fetchVisitors();
  }, [fetchSummaryAndSites, fetchVisitors]);

  return {
    summary,
    sites,
    selectedSiteId,
    setSelectedSiteId,
    expectedVisitors,
    totalVisitors,
    totalPages,
    page,
    setPage,
    search,
    setSearch,
    loading,
    error,
    refetch,
  };
};