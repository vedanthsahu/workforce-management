"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building, Floor, Layout, Site } from "../types/layout.types";

// ── helpers ───────────────────────────────────────────────────────────────────
function versionLabel(l: Layout): string {
  if (l.is_published) return `v${l.version_no} (Active)`;
  if (l.status === "ARCHIVED") return `v${l.version_no} (Archived)`;
  return `v${l.version_no} (Draft)`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── props ─────────────────────────────────────────────────────────────────────
interface LayoutFiltersProps {
  sites: Site[];
  buildings: Building[];
  floors: Floor[];
  layouts: Layout[];
  selectedSiteId: string;
  selectedBuildingId: string;
  selectedFloorId: string;
  selectedLayoutId: string;
  onSiteChange: (id: string) => void;
  onBuildingChange: (id: string) => void;
  onFloorChange: (id: string) => void;
  onLayoutChange: (id: string) => void;
  loadingSites?: boolean;
  loadingBuildings?: boolean;
  loadingFloors?: boolean;
  loadingLayouts?: boolean;
}

// ── reusable select wrapper ───────────────────────────────────────────────────
interface CascadeSelectProps {
  value: string;
  onValueChange: (val: string) => void;
  disabled: boolean;
  placeholder: string;
  items: { value: string; label: string }[];
  debugLabel?: string;
}

// function CascadeSelect({
//   value,
//   onValueChange,
//   disabled,
//   placeholder,
//   items,
//   debugLabel,
// }: CascadeSelectProps) {
//   console.log(`[CascadeSelect][${debugLabel}] value:`, value, "| type:", typeof value);
//   console.log(`[CascadeSelect][${debugLabel}] items:`, items);
//   console.log(`[CascadeSelect][${debugLabel}] match found:`, items.find((i) => i.value === value));

//   return (
//     <Select
//       value={value}
//       onValueChange={(val) => {
//         console.log(`[CascadeSelect][${debugLabel}] onValueChange fired:`, val, "| type:", typeof val);
//         if (val) onValueChange(val);
//       }}
//       disabled={disabled}
//     >
//       <SelectTrigger className="min-w-[170px] bg-white">
//         {value ? (
//           <SelectValue />
//         ) : (
//           <span className="text-muted-foreground">{placeholder}</span>
//         )}
//       </SelectTrigger>
//       <SelectContent>
//         {items.map((item) => (
//           <SelectItem key={item.value} value={item.value}>
//             {item.label}
//           </SelectItem>
//         ))}
//       </SelectContent>
//     </Select>
//   );
// }


function CascadeSelect({
  value,
  onValueChange,
  disabled,
  placeholder,
  items,
}: CascadeSelectProps) {
  // Manually find the label — don't rely on SelectValue to do it
  const selectedLabel = items.find((i) => i.value === value)?.label;

  return (
    <Select
      value={value}
      onValueChange={(val) => {
        if (val) onValueChange(val);
      }}
      disabled={disabled}
    >
      <SelectTrigger className="min-w-[170px] bg-white">
        {selectedLabel ? (
          <span>{selectedLabel}</span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
// ── component ─────────────────────────────────────────────────────────────────
export default function LayoutFilters({
  sites = [],
  buildings = [],
  floors = [],
  layouts = [],
  selectedSiteId,
  selectedBuildingId,
  selectedFloorId,
  selectedLayoutId,
  onSiteChange,
  onBuildingChange,
  onFloorChange,
  onLayoutChange,
  loadingSites,
  loadingBuildings,
  loadingFloors,
  loadingLayouts,
}: LayoutFiltersProps) {
  console.log("[LayoutFilters] selectedSiteId:", selectedSiteId, "| type:", typeof selectedSiteId);
  console.log("[LayoutFilters] selectedBuildingId:", selectedBuildingId, "| type:", typeof selectedBuildingId);
  console.log("[LayoutFilters] selectedFloorId:", selectedFloorId, "| type:", typeof selectedFloorId);
  console.log("[LayoutFilters] sites:", sites);
  console.log("[LayoutFilters] buildings:", buildings);
  console.log("[LayoutFilters] floors:", floors);

  const siteItems = sites.map((s) => ({ value: String(s.id), label: s.name }));
  const buildingItems = buildings.map((b) => ({ value: String(b.id), label: b.name }));
  const floorItems = floors.map((f) => ({ value: String(f.id), label: f.name }));

  console.log("[LayoutFilters] siteItems:", siteItems);
  console.log("[LayoutFilters] buildingItems:", buildingItems);
  console.log("[LayoutFilters] floorItems:", floorItems);

  const activeLayout = layouts.find((l) => l.layout_id === selectedLayoutId);
  const lastUpdated = activeLayout
    ? `${formatDate(activeLayout.updated_at)} by ${activeLayout.uploaded_by_name}`
    : null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Site */}
      <CascadeSelect
        debugLabel="Site"
        value={selectedSiteId}
        onValueChange={onSiteChange}
        disabled={!!loadingSites || sites.length === 0}
        placeholder={loadingSites ? "Loading…" : "Select site"}
        items={siteItems}
      />

      {/* Building */}
      <CascadeSelect
        debugLabel="Building"
        value={selectedBuildingId}
        onValueChange={onBuildingChange}
        disabled={!!loadingBuildings || buildings.length === 0}
        placeholder={loadingBuildings ? "Loading…" : "Select building"}
        items={buildingItems}
      />

      {/* Floor */}
      <CascadeSelect
        debugLabel="Floor"
        value={selectedFloorId}
        onValueChange={onFloorChange}
        disabled={!!loadingFloors || floors.length === 0}
        placeholder={loadingFloors ? "Loading…" : "Select floor"}
        items={floorItems}
      />

      {/* Layout version */}
      <CascadeSelect
        debugLabel="Layout"
        value={selectedLayoutId}
        onValueChange={onLayoutChange}
        disabled={!!loadingLayouts || layouts.length === 0}
        placeholder={loadingLayouts ? "Loading…" : "No layouts"}
        items={layouts.map((l) => ({
          value: l.layout_id,
          label: versionLabel(l),
        }))}
      />

      {/* Last updated */}
      {lastUpdated && (
        <span className="text-sm text-gray-500 whitespace-nowrap">
          Last updated: {lastUpdated}
        </span>
      )}
    </div>
  );
}