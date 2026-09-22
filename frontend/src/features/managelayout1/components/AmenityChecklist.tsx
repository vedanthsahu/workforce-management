"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { getAmenityColor } from "@/features/amenities/utils/amenityColors";
import { cn } from "@/lib/utils";

import { Preference } from "../types/layout.types";

// Groups preferences by category (preference_type), preserving the order
// categories first appear in. Un-categorized preferences fall under "Other".
function groupByCategory(preferences: Preference[]): [string, Preference[]][] {
  const groups = new Map<string, Preference[]>();
  for (const p of preferences) {
    const category = p.preference_type?.trim() || "Other";
    const existing = groups.get(category);
    if (existing) {
      existing.push(p);
    } else {
      groups.set(category, [p]);
    }
  }
  return Array.from(groups.entries());
}

type Props = {
  preferences: Preference[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  emptyMessage?: string;
  className?: string;
};

// Shared amenities picker for the seat-configuration admin flow (EditSeatPanel,
// BulkEditModal, LayoutPreview's SeatConfigDialog) -- search + category
// grouping so a long amenity list doesn't turn into an undifferentiated wall
// of cards. `min-h-0` on the scroll region matters here: without it, a flex
// child with max-height + overflow-y-auto silently ignores the cap and grows
// to fit its content instead of scrolling (same bug fixed in the booking
// flow's preferences panel).
export default function AmenityChecklist({
  preferences,
  selectedIds,
  onToggle,
  emptyMessage = "No amenities available for this space type.",
  className,
}: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return preferences;
    return preferences.filter((p) => p.preference_name.toLowerCase().includes(query));
  }, [preferences, search]);

  const grouped = useMemo(() => groupByCategory(filtered), [filtered]);

  if (preferences.length === 0) {
    return <p className="text-xs text-gray-400 italic">{emptyMessage}</p>;
  }

  return (
    <div className={cn("border border-gray-200 rounded-lg overflow-hidden bg-white", className)}>
      <div className="relative border-b border-gray-100">
        <Search size={12.5} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search amenities…"
          className="w-full h-8 pl-7 pr-2.5 text-xs text-gray-700 bg-transparent focus:outline-none placeholder:text-gray-400"
        />
      </div>

      <div className="max-h-64 min-h-0 overflow-y-auto scrollbar-thin px-1.5 py-1.5 space-y-1 bg-gray-50/50">
        {grouped.length === 0 ? (
          <p className="text-xs text-gray-400 italic px-2 py-2">No amenities match your search.</p>
        ) : (
          grouped.map(([category, prefs]) => (
            <div key={category}>
              <p className="px-2 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                {category}
              </p>
              {prefs.map((p) => {
                const checked = selectedIds.includes(p.preference_id);
                const color = getAmenityColor(p.preference_name, p.preference_type);
                return (
                  <label
                    key={p.preference_id}
                    className={cn(
                      "flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors",
                      checked ? "bg-indigo-50" : "hover:bg-white"
                    )}
                  >
                    <Checkbox checked={checked} onCheckedChange={() => onToggle(p.preference_id)} />
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", color.dot)} />
                    <span
                      className={cn(
                        "text-xs font-medium truncate",
                        checked ? "text-indigo-700" : "text-gray-700"
                      )}
                    >
                      {p.preference_name}
                    </span>
                  </label>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
