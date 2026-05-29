"use client";

import { LayoutSeatStats } from "../types/layout.types";

interface LayoutStatCardsProps {
  stats: LayoutSeatStats | null;
  loading?: boolean;
}

function ChairIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 10V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4" />
      <path d="M3 10h18v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2z" />
      <path d="M7 14v5m10-5v5" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function AlertCircleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function pct(part: number, total: number): string {
  if (!total) return "0%";
  return `(${Math.round((part / total) * 100)}%)`;
}

export default function LayoutStatCards({ stats, loading }: LayoutStatCardsProps) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`bg-white rounded-xl border border-gray-100 p-4 h-[84px] ${loading ? "animate-pulse" : ""}`}>
            <div className="h-2.5 w-24 bg-gray-100 rounded mb-3" />
            <div className="h-6 w-10 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const { total_seats, configured_seats, unconfigured_seats, non_bookable_seats } = stats;

  const cards = [
    {
      label:      "Total Seats",
      value:      total_seats,
      sub:        null as string | null,
      icon:       <ChairIcon />,
      iconBg:     "bg-indigo-50 text-indigo-500",
      valueColor: "text-gray-900",
    },
    {
      label:      "Configured Seats",
      value:      configured_seats,
      sub:        pct(configured_seats, total_seats),
      icon:       <CheckCircleIcon />,
      iconBg:     "bg-emerald-50 text-emerald-500",
      valueColor: "text-emerald-600",
    },
    {
      label:      "Unconfigured Seats",
      value:      unconfigured_seats,
      sub:        pct(unconfigured_seats, total_seats),
      icon:       <AlertCircleIcon />,
      iconBg:     "bg-amber-50 text-amber-500",
      valueColor: "text-amber-600",
    },
    {
      label:      "Non-bookable Seats",
      value:      non_bookable_seats,
      sub:        pct(non_bookable_seats, total_seats),
      icon:       <LockIcon />,
      iconBg:     "bg-red-50 text-red-400",
      valueColor: "text-red-500",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-xl border border-gray-100 px-4 py-4 flex items-center gap-3"
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${card.iconBg}`}>
            {card.icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 font-medium mb-0.5 truncate">{card.label}</p>
            <p className={`text-xl font-semibold leading-none ${card.valueColor}`}>
              {card.value}
              {card.sub && (
                <span className="text-xs font-normal text-gray-400 ml-1">{card.sub}</span>
              )}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}