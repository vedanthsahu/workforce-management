"use client";

import { Building, Floor, Layout, Site } from "../types/layout.types";

// ── helpers ───────────────────────────────────────────────────────────────────
function versionLabel(l: Layout): string {
  if (l.is_published)      return `v${l.version_no} (Active)`;
  if (l.status === "ARCHIVED") return `v${l.version_no} (Archived)`;
  return `v${l.version_no} (Draft)`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  });
}

// ── props ─────────────────────────────────────────────────────────────────────
interface LayoutFiltersProps {
  sites:               Site[];
  buildings:           Building[];
  floors:              Floor[];
  layouts:             Layout[];
  selectedSiteId:      string;
  selectedBuildingId:  string;
  selectedFloorId:     string;
  selectedLayoutId:    string;
  onSiteChange:        (id: string) => void;
  onBuildingChange:    (id: string) => void;
  onFloorChange:       (id: string) => void;
  onLayoutChange:      (id: string) => void;
  loadingSites?:       boolean;
  loadingBuildings?:   boolean;
  loadingFloors?:      boolean;
  loadingLayouts?:     boolean;
}

// ── reusable select ───────────────────────────────────────────────────────────
interface CascadeSelectProps {
  value:         string;
  onValueChange: (val: string) => void;
  disabled:      boolean;
  placeholder:   string;
  items:         { value: string; label: string }[];
}

function CascadeSelect({
  value,
  onValueChange,
  disabled,
  placeholder,
  items,
}: CascadeSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => { if (e.target.value) onValueChange(e.target.value); }}
      disabled={disabled}
      className="w-full sm:w-auto sm:min-w-40 h-10 px-4 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {!value && <option value="">{placeholder}</option>}
      {items.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
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
  const siteItems     = sites.map((s)     => ({ value: String(s.id), label: s.name }));
  const buildingItems = buildings.map((b) => ({ value: String(b.id), label: b.name }));
  const floorItems    = floors.map((f)    => ({ value: String(f.id), label: f.name }));

  const activeLayout  = layouts.find((l) => l.layout_id === selectedLayoutId);
  const lastUpdated   = activeLayout
    ? `${formatDate(activeLayout.updated_at)} · ${activeLayout.uploaded_by_name}`
    : null;

  return (
    <div className="space-y-2">
      {/*
        FIX: 2-col grid on mobile (site + building, floor + layout),
        flex-wrap row on sm+ so they sit inline.
      */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">

        <CascadeSelect
          value={selectedSiteId}
          onValueChange={onSiteChange}
          disabled={!!loadingSites || sites.length === 0}
          placeholder={loadingSites ? "Loading…" : "Select site"}
          items={siteItems}
        />

        <CascadeSelect
          value={selectedBuildingId}
          onValueChange={onBuildingChange}
          disabled={!!loadingBuildings || buildings.length === 0}
          placeholder={loadingBuildings ? "Loading…" : "Select building"}
          items={buildingItems}
        />

        <CascadeSelect
          value={selectedFloorId}
          onValueChange={onFloorChange}
          disabled={!!loadingFloors || floors.length === 0}
          placeholder={loadingFloors ? "Loading…" : "Select floor"}
          items={floorItems}
        />

        <CascadeSelect
          value={selectedLayoutId}
          onValueChange={onLayoutChange}
          disabled={!!loadingLayouts || layouts.length === 0}
          placeholder={loadingLayouts ? "Loading…" : "No layouts"}
          items={layouts.map((l) => ({
            value: l.layout_id,
            label: versionLabel(l),
          }))}
        />

      </div>

      {/* Last updated — sits below dropdowns on all screen sizes */}
      {lastUpdated && (
        <p className="text-xs text-gray-400 px-0.5">
          Last updated: {lastUpdated}
        </p>
      )}
    </div>
  );
}
