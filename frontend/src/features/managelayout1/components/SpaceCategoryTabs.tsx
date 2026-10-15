"use client";

import React from "react";
import { LayoutGrid, Armchair, DoorClosed, Users } from "lucide-react";
import { SPACE_CATEGORIES, SPACE_CATEGORY_LABELS, SPACE_CATEGORY_COLOR, SpaceCategory } from "../utils/spaceCategory";

interface SpaceCategoryTabsProps {
  active:   SpaceCategory;
  counts:   Record<SpaceCategory, number>;
  onChange: (category: SpaceCategory) => void;
  disabled?: boolean;
}

const CATEGORY_ICON: Record<SpaceCategory, React.JSX.Element> = {
  ALL:              <LayoutGrid className="w-[17px] h-[17px]" strokeWidth={1.8} />,
  SEATS:            <Armchair className="w-[17px] h-[17px]" strokeWidth={1.8} />,
  CABINS:           <DoorClosed className="w-[17px] h-[17px]" strokeWidth={1.8} />,
  CONFERENCE_ROOMS: <Users className="w-[17px] h-[17px]" strokeWidth={1.8} />,
};

// "All Spaces" is the tab's own label (matching the original mockup) — kept
// distinct from SPACE_CATEGORY_LABELS.ALL.plural ("Spaces"), which is used
// as the generic noun elsewhere (stat cards, table text) where "All Spaces"
// would read oddly ("142 All Spaces").
const TAB_LABEL: Record<SpaceCategory, string> = {
  ALL: "All Spaces",
  SEATS: SPACE_CATEGORY_LABELS.SEATS.plural,
  CABINS: SPACE_CATEGORY_LABELS.CABINS.plural,
  CONFERENCE_ROOMS: SPACE_CATEGORY_LABELS.CONFERENCE_ROOMS.plural,
};

export default function SpaceCategoryTabs({ active, counts, onChange, disabled }: SpaceCategoryTabsProps) {
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex: number | null = null;
    if (e.key === "ArrowRight") nextIndex = (index + 1) % SPACE_CATEGORIES.length;
    else if (e.key === "ArrowLeft") nextIndex = (index - 1 + SPACE_CATEGORIES.length) % SPACE_CATEGORIES.length;
    else if (e.key === "Home") nextIndex = 0;
    else if (e.key === "End") nextIndex = SPACE_CATEGORIES.length - 1;
    if (nextIndex === null) return;
    e.preventDefault();
    onChange(SPACE_CATEGORIES[nextIndex]);
  };

  return (
    <div role="tablist" aria-label="Space category" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {SPACE_CATEGORIES.map((category, index) => {
        const isActive = category === active;
        const { color, tint } = SPACE_CATEGORY_COLOR[category];
        return (
          <button
            key={category}
            type="button"
            role="tab"
            id={`space-tab-${category}`}
            aria-selected={isActive}
            aria-controls="space-panel"
            tabIndex={isActive ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(category)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            style={isActive ? { borderColor: color, boxShadow: `0 0 0 3px ${tint}` } : undefined}
            className={`flex items-center gap-3 w-full bg-white border-[1.5px] rounded-xl px-4 py-3.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isActive ? "" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <span
              className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
              style={{ background: tint, color }}
            >
              {CATEGORY_ICON[category]}
            </span>
            <span className="flex flex-col items-start text-left">
              <span className="font-semibold text-sm text-gray-900 leading-tight">
                {TAB_LABEL[category]}
              </span>
              <span className="text-xs text-gray-400 font-medium">{counts[category]} total</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
