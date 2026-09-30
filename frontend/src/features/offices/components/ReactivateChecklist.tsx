"use client";

import { useMemo } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type ReactivateChecklistItem = { id: string; name: string };
export type ReactivateChecklistFloor = ReactivateChecklistItem & { buildingId: string };

type Props = {
  // Present only when the item being reactivated has an INACTIVE ancestor
  // that must come back too (a building can never be ACTIVE under an
  // INACTIVE office, nor a floor under an INACTIVE building) -- each is
  // rendered as a single always-checked, disabled row so the user sees
  // exactly what saving will do, with no way to deselect a step the
  // hierarchy requires. `lockedBuilding` is distinct from the selectable
  // `buildings` list below: it's used by the Floor modal (one fixed
  // ancestor), while `buildings` is used by the Office modal (a pick-list
  // of children).
  office?: ReactivateChecklistItem | null;
  lockedBuilding?: ReactivateChecklistItem | null;
  buildings: ReactivateChecklistItem[];
  floors: ReactivateChecklistFloor[];
  selectedBuildingIds: string[];
  selectedFloorIds: string[];
  onToggleBuilding: (id: string) => void;
  onToggleFloor: (id: string) => void;
  className?: string;
};

function LockedRow({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md bg-indigo-50">
      <Checkbox checked disabled />
      <span className="text-xs font-medium text-indigo-700 truncate">{name}</span>
      <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide text-indigo-400">Required</span>
    </div>
  );
}

// Lets an admin opt back in to specific inactive buildings/floors when
// reactivating their parent office (or specific floors when reactivating a
// building), instead of the app silently resurrecting everything that was
// cascade-deactivated. Rendered as flat, labeled sections -- "Office" and
// "Building" (when applicable, locked), then "Building"/"Floor" (selectable)
// -- rather than nesting children under their parent, so each kind of
// selection reads as a clearly separate group.
export default function ReactivateChecklist({
  office,
  lockedBuilding,
  buildings,
  floors,
  selectedBuildingIds,
  selectedFloorIds,
  onToggleBuilding,
  onToggleFloor,
  className,
}: Props) {
  const buildingNameById = useMemo(() => new Map(buildings.map((b) => [b.id, b.name])), [buildings]);

  if (!office && !lockedBuilding && buildings.length === 0 && floors.length === 0) {
    return null;
  }

  return (
    <div className={cn("border border-gray-200 rounded-lg overflow-hidden bg-white", className)}>
      <div className="max-h-40 overflow-y-auto scrollbar-thin px-1.5 py-1.5 space-y-1 bg-gray-50/50">
        {office && (
          <div>
            <p className="px-2 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Office
            </p>
            <LockedRow name={office.name} />
          </div>
        )}

        {lockedBuilding && (
          <div>
            <p className="px-2 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Building
            </p>
            <LockedRow name={lockedBuilding.name} />
          </div>
        )}

        {buildings.length > 0 && (
          <div>
            <p className="px-2 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Building
            </p>
            {buildings.map((building) => {
              const checked = selectedBuildingIds.includes(building.id);
              return (
                <label
                  key={building.id}
                  className={cn(
                    "flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors",
                    checked ? "bg-indigo-50" : "hover:bg-white"
                  )}
                >
                  <Checkbox checked={checked} onCheckedChange={() => onToggleBuilding(building.id)} />
                  <span
                    className={cn("text-xs font-medium truncate", checked ? "text-indigo-700" : "text-gray-700")}
                  >
                    {building.name}
                  </span>
                </label>
              );
            })}
          </div>
        )}

        {floors.length > 0 && (
          <div>
            <p className="px-2 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Floor
            </p>
            {floors.map((floor) => {
              const checked = selectedFloorIds.includes(floor.id);
              const parentBuildingName = buildingNameById.get(floor.buildingId);
              return (
                <label
                  key={floor.id}
                  className={cn(
                    "flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors",
                    checked ? "bg-indigo-50" : "hover:bg-white"
                  )}
                >
                  <Checkbox checked={checked} onCheckedChange={() => onToggleFloor(floor.id)} />
                  <span className="min-w-0 truncate">
                    <span
                      className={cn(
                        "text-xs font-medium",
                        checked ? "text-indigo-700" : "text-gray-700"
                      )}
                    >
                      {floor.name}
                    </span>
                    {parentBuildingName && (
                      <span className="text-[11px] text-gray-400"> · {parentBuildingName}</span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
