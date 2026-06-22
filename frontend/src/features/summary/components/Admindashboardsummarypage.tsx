"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminDashboardSummary } from "@/features/summary/hooks/Useadmindashboardsummary";
import { SummaryCards } from "./Summarycards";

export const AdminDashboardSummaryPage = () => {
  const router = useRouter();
  const { cards, loading, error } = useAdminDashboardSummary();

  useEffect(() => {
    router.prefetch("/admin/dashboard");
  }, [router]);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* HEADER */}
      <div>
        <h1 className="text-xl font-semibold">Dashboard Summary</h1>
        <p className="text-sm text-muted-foreground">
          Aggregated metrics across offices, buildings, floors and seats.
        </p>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* SUMMARY CARDS */}
      <SummaryCards cards={cards} loading={loading} />
    </div>
  );
};