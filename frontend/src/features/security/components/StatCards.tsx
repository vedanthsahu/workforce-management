"use client";

import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SecurityDashboardSummary } from "../types/security.types";
import { STAT_CARDS_CONFIG } from "../utils/constants";

type Props = {
  summary: SecurityDashboardSummary;
  onViewAll?: (filter: "expected" | "checked-in" | "overdue" | "cancelled") => void;
};

export function StatCards({ summary, onViewAll }: Props) {
  const values: Record<(typeof STAT_CARDS_CONFIG)[number]["key"], number> = {
    expected: summary.scheduled,
    "checked-in": summary.checkedIn,
    overdue: summary.overdue,
    cancelled: summary.cancelled,
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {STAT_CARDS_CONFIG.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className="relative bg-white border border-gray-200 rounded-xl px-4 py-4 flex flex-col gap-2.5 overflow-hidden shadow-sm"
          >
            <span className={cn("absolute left-0 top-0 bottom-0 w-[3px]", card.accentBar)} />

            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-medium text-gray-500 leading-tight">{card.label}</p>
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", card.iconBg)}>
                <Icon className={cn("w-5 h-5", card.iconColor)} />
              </div>
            </div>

            <p className="text-3xl font-semibold text-gray-900 leading-none tracking-tight">
              {values[card.key]}
            </p>

            <div className="flex items-center justify-between">
              <p className="text-[11px] text-gray-400">{card.sublabel}</p>
              <button
                type="button"
                onClick={() => onViewAll?.(card.key)}
                className={cn(
                  "text-[11px] font-medium flex items-center gap-0.5 group transition-colors",
                  card.viewAllColor
                )}
              >
                View all
                <ArrowRight className="w-2.5 h-2.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}