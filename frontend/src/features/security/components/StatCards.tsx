"use client";

import { CalendarCheck, UserCheck, Clock, XCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SecurityDashboardSummary } from "../types/security.types";

type Props = {
  summary: SecurityDashboardSummary;
  onViewAll?: (filter: "expected" | "checked-in" | "overdue" | "cancelled") => void;
};

const CARD_CONFIG = [
  {
    key: "expected" as const,
    label: "Expected Today",
    sublabel: "Scheduled visitors",
    icon: CalendarCheck,
    accentBar: "bg-blue-400",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-500",
    viewAllColor: "text-blue-600 hover:text-blue-800",
  },
  {
    key: "checked-in" as const,
    label: "Checked In",
    sublabel: "Currently in office",
    icon: UserCheck,
    accentBar: "bg-emerald-400",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-500",
    viewAllColor: "text-emerald-600 hover:text-emerald-800",
  },
  {
    key: "overdue" as const,
    label: "Overdue Checkout",
    sublabel: "Past end time",
    icon: Clock,
    accentBar: "bg-amber-400",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-500",
    viewAllColor: "text-amber-600 hover:text-amber-800",
  },
  {
    key: "cancelled" as const,
    label: "Cancelled / No Show",
    sublabel: "Today",
    icon: XCircle,
    accentBar: "bg-red-400",
    iconBg: "bg-red-50",
    iconColor: "text-red-500",
    viewAllColor: "text-red-600 hover:text-red-800",
  },
];

export function StatCards({ summary, onViewAll }: Props) {
  const values: Record<(typeof CARD_CONFIG)[number]["key"], number> = {
    expected: summary.expectedToday,
    "checked-in": summary.checkedIn,
    overdue: summary.overdueCheckout,
    cancelled: summary.cancelledNoShow,
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {CARD_CONFIG.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className="relative bg-white border border-gray-200 rounded-xl px-4 py-4 flex flex-col gap-2.5 overflow-hidden shadow-sm"
          >
            {/* Left accent bar */}
            <span className={cn("absolute left-0 top-0 bottom-0 w-[3px]", card.accentBar)} />

            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-medium text-gray-500 leading-tight">{card.label}</p>
              {/* Larger icon container — matches Image 1 */}
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