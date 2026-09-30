"use client";

import type { ReactNode } from "react";
import { LayoutGrid, Armchair, DoorClosed, Users, CheckCircle2, AlertCircle, Lock, PowerOff } from "lucide-react";
import { SpaceCategory, SPACE_CATEGORY_LABELS } from "../utils/spaceCategory";
import { SpaceCardFilter } from "../types/seat.types";

// A new one-off component rather than a generalization of the sibling
// LayoutStatCards (features/managelayout/components/Layoutstatcards.tsx) —
// that component has a second, unrelated consumer (the manage-layout page)
// and takes a server-shaped LayoutSeatStats prop that doesn't fit a
// per-category breakdown. Duplicating the ~140 lines of presentational card
// markup here is the cheaper, lower-risk trade.

export interface CategoryStats {
  total:         number;
  configured:    number;
  unconfigured:  number;
  nonBookable:   number;
  inactive:      number;
  // Only meaningful (non-null) when category === "CONFERENCE_ROOMS".
  totalCapacity: number | null;
}

interface SpaceStatCardsProps {
  category: SpaceCategory;
  stats:    CategoryStats | null;
  loading?: boolean;
  // Card-click filtering, same convention as BuildingCards/AmenitiesCards —
  // a single, mutually-exclusive selection (unrelated to the filter bar's
  // own multi-select dropdowns). Omit both to fall back to the old, purely
  // informational cards (no onClick, no selected ring).
  cardFilter?: SpaceCardFilter;
  onCardFilterChange?: (filter: SpaceCardFilter) => void;
}

const CATEGORY_ICON: Record<SpaceCategory, ReactNode> = {
  ALL:               <LayoutGrid className="w-5 h-5" strokeWidth={1.8} />,
  SEATS:             <Armchair className="w-5 h-5" strokeWidth={1.8} />,
  CABINS:            <DoorClosed className="w-5 h-5" strokeWidth={1.8} />,
  CONFERENCE_ROOMS:  <Users className="w-5 h-5" strokeWidth={1.8} />,
};

function pct(part: number, total: number): string {
  if (!total) return "0%";
  return `(${Math.round((part / total) * 100)}%)`;
}

export default function SpaceStatCards({ category, stats, loading, cardFilter = null, onCardFilterChange }: SpaceStatCardsProps) {
  const showCapacity = category === "CONFERENCE_ROOMS" && stats?.totalCapacity !== null;
  const cardCount = showCapacity ? 6 : 5;

  if (loading || !stats) {
    return (
      <div className={`grid grid-cols-2 sm:grid-cols-3 ${cardCount === 6 ? "lg:grid-cols-6" : "lg:grid-cols-5"} gap-3 sm:gap-4`}>
        {Array.from({ length: cardCount }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4 h-[76px] sm:h-[84px] animate-pulse">
            <div className="h-2.5 w-20 bg-gray-100 rounded mb-3" />
            <div className="h-6 w-10 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const { plural } = SPACE_CATEGORY_LABELS[category];

  // Same click-to-filter convention as BuildingCards/AmenitiesCards: a card
  // toggles cardFilter on/off, "Total" clears it, and the currently-active
  // card gets a highlighted ring. Since cardFilter is a single value, only
  // one card is ever selected at a time -- clicking a different one simply
  // overwrites it, it never combines with another card. Only rendered when
  // the page wires up onCardFilterChange -- otherwise these stay the plain,
  // non-interactive stat cards they always were.
  const interactive = !!onCardFilterChange;

  const toggle = (value: Exclude<SpaceCardFilter, null>) => {
    onCardFilterChange?.(cardFilter === value ? null : value);
  };

  const cards = [
    {
      label:      `Total ${plural}`,
      value:      stats.total,
      sub:        null as string | null,
      icon:       CATEGORY_ICON[category],
      iconBg:     "bg-indigo-50 text-indigo-500",
      valueColor: "text-gray-900",
      selected:   false,
      onClick:    interactive ? () => onCardFilterChange?.(null) : undefined,
    },
    {
      label:      "Configured",
      value:      stats.configured,
      sub:        pct(stats.configured, stats.total),
      icon:       <CheckCircle2 className="w-5 h-5" strokeWidth={2} />,
      iconBg:     "bg-emerald-50 text-emerald-500",
      valueColor: "text-emerald-600",
      selected:   cardFilter === "CONFIGURED",
      onClick:    interactive ? () => toggle("CONFIGURED") : undefined,
    },
    {
      label:      "Unconfigured",
      value:      stats.unconfigured,
      sub:        pct(stats.unconfigured, stats.total),
      icon:       <AlertCircle className="w-5 h-5" strokeWidth={2} />,
      iconBg:     "bg-amber-50 text-amber-500",
      valueColor: "text-amber-600",
      selected:   cardFilter === "UNCONFIGURED",
      onClick:    interactive ? () => toggle("UNCONFIGURED") : undefined,
    },
    {
      label:      "Non-bookable",
      value:      stats.nonBookable,
      sub:        pct(stats.nonBookable, stats.total),
      icon:       <Lock className="w-5 h-5" strokeWidth={2} />,
      iconBg:     "bg-red-50 text-red-400",
      valueColor: "text-red-500",
      selected:   cardFilter === "NON_BOOKABLE",
      onClick:    interactive ? () => toggle("NON_BOOKABLE") : undefined,
    },
    {
      label:      "Inactive",
      value:      stats.inactive,
      sub:        pct(stats.inactive, stats.total),
      icon:       <PowerOff className="w-5 h-5" strokeWidth={2} />,
      iconBg:     "bg-gray-100 text-gray-500",
      valueColor: "text-gray-600",
      selected:   cardFilter === "INACTIVE",
      onClick:    interactive ? () => toggle("INACTIVE") : undefined,
    },
    ...(showCapacity
      ? [{
          label:      "Total Capacity",
          value:      stats.totalCapacity ?? 0,
          sub:        null as string | null,
          icon:       <Users className="w-5 h-5" strokeWidth={1.8} />,
          iconBg:     "bg-violet-50 text-violet-500",
          valueColor: "text-violet-600",
          selected:   false,
          onClick:    undefined,
        }]
      : []),
  ];

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 ${cardCount === 6 ? "lg:grid-cols-6" : "lg:grid-cols-5"} gap-3 sm:gap-4`}>
      {cards.map((card) => (
        <div
          key={card.label}
          onClick={card.onClick}
          className={`group bg-white rounded-xl border px-3 py-3 sm:px-4 sm:py-4 flex items-center gap-2 sm:gap-3 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-gray-300 ${
            card.onClick ? "cursor-pointer" : ""
          } ${card.selected ? "border-2 border-indigo-500 ring-2 ring-indigo-100 shadow-md" : "border-gray-100"}`}
        >
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110 ${card.iconBg}`}>
            {card.icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 font-medium mb-0.5 truncate">{card.label}</p>
            <p className={`text-lg sm:text-xl font-semibold leading-none ${card.valueColor}`}>
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
