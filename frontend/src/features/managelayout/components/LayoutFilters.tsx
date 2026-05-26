// // // "use client";

// // // export default function LayoutFilters() {
// // //   return (
// // //     <div className="grid grid-cols-4 gap-4">

// // //       {/* Office */}
// // //       <select className="border rounded-md p-2 text-sm">
// // //         <option>BENGALURU (HQ)</option>
// // //       </select>

// // //       {/* Floor */}
// // //       <select className="border rounded-md p-2 text-sm">
// // //         <option>8th Floor</option>
// // //       </select>

// // //       {/* Layout Version */}
// // //       <select className="border rounded-md p-2 text-sm">
// // //         <option>v1 (Active)</option>
// // //       </select>

// // //       {/* Last Updated */}
// // //       <div className="flex items-center text-sm text-gray-500">
// // //         Last updated: May 15, 2026 by Admin
// // //       </div>

// // //     </div>
// // //   );
// // // }

// // // "use client";

// // // import { Building, Floor, Layout, Site } from "../types/layout.types";



// // // // ── helper ────────────────────────────────────────────────────────────────────
// // // function versionLabel(l: Layout): string {
// // //   if (l.is_published) return `v${l.version_no} (Active)`;
// // //   if (l.status === "ARCHIVED") return `v${l.version_no} (Archived)`;
// // //   return `v${l.version_no} (Draft)`;
// // // }

// // // function formatDate(iso: string): string {
// // //   return new Date(iso).toLocaleDateString("en-US", {
// // //     month: "short",
// // //     day: "numeric",
// // //     year: "numeric",
// // //   });
// // // }

// // // // ── props ─────────────────────────────────────────────────────────────────────
// // // interface LayoutFiltersProps {
// // //   // cascade data
// // //   sites: Site[];
// // //   buildings: Building[];
// // //   floors: Floor[];
// // //   layouts: Layout[];
// // //   // selections
// // //   selectedSiteId: string;
// // //   selectedBuildingId: string;
// // //   selectedFloorId: string;
// // //   selectedLayoutId: string;
// // //   // setters
// // //   onSiteChange: (id: string) => void;
// // //   onBuildingChange: (id: string) => void;
// // //   onFloorChange: (id: string) => void;
// // //   onLayoutChange: (id: string) => void;
// // //   // loading flags
// // //   loadingSites?: boolean;
// // //   loadingBuildings?: boolean;
// // //   loadingFloors?: boolean;
// // //   loadingLayouts?: boolean;
// // // }

// // // // ── component ─────────────────────────────────────────────────────────────────
// // // // export default function LayoutFilters({
// // // //   sites,
// // // //   buildings,
// // // //   floors,
// // // //   // layouts,
// // // //    layouts = [],
// // // //   selectedSiteId,
// // // //   selectedBuildingId,
// // // //   selectedFloorId,
// // // //   selectedLayoutId,
// // // //   onSiteChange,
// // // //   onBuildingChange,
// // // //   onFloorChange,
// // // //   onLayoutChange,
// // // //   loadingSites,
// // // //   loadingBuildings,
// // // //   loadingFloors,
// // // //   loadingLayouts,
  
// // // // }: LayoutFiltersProps) {
// // // export default function LayoutFilters({
// // //   sites = [],           // ← add default
// // //   buildings = [],       // ← add default
// // //   floors = [],          // ← add default
// // //   layouts = [],
// // //   selectedSiteId,
// // //   selectedBuildingId,
// // //   selectedFloorId,
// // //   selectedLayoutId,
// // //   onSiteChange,
// // //   onBuildingChange,
// // //   onFloorChange,
// // //   onLayoutChange,
// // //   loadingSites,
// // //   loadingBuildings,
// // //   loadingFloors,
// // //   loadingLayouts,
// // // }: LayoutFiltersProps) {
// // //   const activeLayout = layouts.find((l) => l.layout_id === selectedLayoutId);

// // //   const lastUpdated = activeLayout
// // //     ? `${formatDate(activeLayout.updated_at)} by ${activeLayout.uploaded_by_name}`
// // //     : null;

// // //   const selectClass =
// // //     "border border-gray-300 rounded-md px-3 py-2 text-sm bg-white " +
// // //     "focus:outline-none focus:ring-2 focus:ring-indigo-500 " +
// // //     "disabled:opacity-50 disabled:cursor-not-allowed min-w-[170px]";

// // //   return (
// // //     <div className="flex flex-wrap items-center gap-3">
// // //       {/* Site */}
// // //       <select
// // //         className={selectClass}
// // //         value={selectedSiteId}
// // //         onChange={(e) => onSiteChange(e.target.value)}
// // //         disabled={loadingSites || sites.length === 0}
// // //       >
// // //         {sites.length === 0 && (
// // //           <option value="">{loadingSites ? "Loading…" : "No sites"}</option>
// // //         )}
// // //         {sites.map((s) => (
// // //           <option key={s.id} value={s.id}>
// // //             {s.name}
// // //           </option>
// // //         ))}
// // //       </select>

// // //       {/* Building */}
// // //       <select
// // //         className={selectClass}
// // //         value={selectedBuildingId}
// // //         onChange={(e) => onBuildingChange(e.target.value)}
// // //         disabled={loadingBuildings || buildings.length === 0}
// // //       >
// // //         {buildings.length === 0 && (
// // //           <option value="">
// // //             {loadingBuildings ? "Loading…" : "Select building"}
// // //           </option>
// // //         )}
// // //         {buildings.map((b) => (
// // //           <option key={b.id} value={b.id}>
// // //             {b.name}
// // //           </option>
// // //         ))}
// // //       </select>

// // //       {/* Floor */}
// // //       <select
// // //         className={selectClass}
// // //         value={selectedFloorId}
// // //         onChange={(e) => onFloorChange(e.target.value)}
// // //         disabled={loadingFloors || floors.length === 0}
// // //       >
// // //         {floors.length === 0 && (
// // //           <option value="">
// // //             {loadingFloors ? "Loading…" : "Select floor"}
// // //           </option>
// // //         )}
// // //         {floors.map((f) => (
// // //           <option key={f.id} value={f.id}>
// // //             {f.name}
// // //           </option>
// // //         ))}
// // //       </select>

// // //       {/* Layout version */}
// // //       <select
// // //         className={selectClass}
// // //         value={selectedLayoutId}
// // //         onChange={(e) => onLayoutChange(e.target.value)}
// // //         disabled={loadingLayouts || layouts.length === 0}
// // //       >
// // //         {layouts.length === 0 && (
// // //           <option value="">
// // //             {loadingLayouts ? "Loading…" : "No layouts"}
// // //           </option>
// // //         )}
// // //         {layouts.map((l) => (
// // //           <option key={l.layout_id} value={l.layout_id}>
// // //             {versionLabel(l)}
// // //           </option>
// // //         ))}
// // //       </select>

// // //       {/* Last updated */}
// // //       {lastUpdated && (
// // //         <span className="text-sm text-gray-500 whitespace-nowrap">
// // //           Last updated: {lastUpdated}
// // //         </span>
// // //       )}
// // //     </div>
// // //   );
// // // }

// // "use client";

// // import {
// //   Select,
// //   SelectContent,
// //   SelectItem,
// //   SelectTrigger,
// //   SelectValue,
// // } from "@/components/ui/select";
// // import { Building, Floor, Layout, Site } from "../types/layout.types";

// // // ── helpers ───────────────────────────────────────────────────────────────────
// // function versionLabel(l: Layout): string {
// //   if (l.is_published) return `v${l.version_no} (Active)`;
// //   if (l.status === "ARCHIVED") return `v${l.version_no} (Archived)`;
// //   return `v${l.version_no} (Draft)`;
// // }

// // function formatDate(iso: string): string {
// //   return new Date(iso).toLocaleDateString("en-US", {
// //     month: "short",
// //     day: "numeric",
// //     year: "numeric",
// //   });
// // }

// // // ── props ─────────────────────────────────────────────────────────────────────
// // interface LayoutFiltersProps {
// //   sites: Site[];
// //   buildings: Building[];
// //   floors: Floor[];
// //   layouts: Layout[];
// //   selectedSiteId: string;
// //   selectedBuildingId: string;
// //   selectedFloorId: string;
// //   selectedLayoutId: string;
// //   onSiteChange: (id: string) => void;
// //   onBuildingChange: (id: string) => void;
// //   onFloorChange: (id: string) => void;
// //   onLayoutChange: (id: string) => void;
// //   loadingSites?: boolean;
// //   loadingBuildings?: boolean;
// //   loadingFloors?: boolean;
// //   loadingLayouts?: boolean;
// // }

// // // ── reusable select wrapper ───────────────────────────────────────────────────
// // // interface CascadeSelectProps {
// // //   value: string;
// // //   onValueChange: (val: string) => void;
// // //   disabled: boolean;
// // //   placeholder: string;
// // //   items: { value: string; label: string }[];
// // // }

// // // function CascadeSelect({
// // //   value,
// // //   onValueChange,
// // //   disabled,
// // //   placeholder,
// // //   items,
// // // }: CascadeSelectProps) {
// // //   return (
// // //     <Select
// // //       value={value || undefined}   // shadcn needs undefined, not "" to show placeholder
// // //       onValueChange={onValueChange}
// // //       disabled={disabled}
// // //     >
// // //       <SelectTrigger className="min-w-[170px] bg-white">
// // //         <SelectValue placeholder={placeholder} />
// // //       </SelectTrigger>
// // //       <SelectContent>
// // //         {items.map((item) => (
// // //           <SelectItem key={item.value} value={item.value}>
// // //             {item.label}
// // //           </SelectItem>
// // //         ))}
// // //       </SelectContent>
// // //     </Select>
// // //   );
// // // }

// // interface CascadeSelectProps {
// //   value: string;
// //   onValueChange: (val: string) => void;
// //   disabled: boolean;
// //   placeholder: string;
// //   items: { value: string; label: string }[];
// // }

// // // function CascadeSelect({
// // //   value,
// // //   onValueChange,
// // //   disabled,
// // //   placeholder,
// // //   items,
// // // }: CascadeSelectProps) {
// // //   return (
// // //     <Select
// // //       value={value || undefined}
// // //       onValueChange={(val) => {          // ← unwrap null here, never bubble it up
// // //         if (val) onValueChange(val);
// // //       }}
// // //       disabled={disabled}
// // //     >
// // //       <SelectTrigger className="min-w-[170px] bg-white">
// // //         <SelectValue placeholder={placeholder} />
// // //       </SelectTrigger>
// // //       <SelectContent>
// // //         {items.map((item) => (
// // //           <SelectItem key={item.value} value={item.value}>
// // //             {item.label}
// // //           </SelectItem>
// // //         ))}
// // //       </SelectContent>
// // //     </Select>
// // //   );
// // // }

// // function CascadeSelect({
// //   value,
// //   onValueChange,
// //   disabled,
// //   placeholder,
// //   items,
// // }: CascadeSelectProps) {
// //   return (
// //     <Select
// //       value={value}                        // ← always pass the string, never undefined
// //       onValueChange={(val) => {
// //         if (val) onValueChange(val);
// //       }}
// //       disabled={disabled}
// //     >
// //       <SelectTrigger className="min-w-[170px] bg-white">
// //         {/* manually show placeholder when value is empty */}
// //         {value ? (
// //           <SelectValue />
// //         ) : (
// //           <span className="text-muted-foreground">{placeholder}</span>
// //         )}
// //       </SelectTrigger>
// //       <SelectContent>
// //         {items.map((item) => (
// //           <SelectItem key={item.value} value={item.value}>
// //             {item.label}
// //           </SelectItem>
// //         ))}
// //       </SelectContent>
// //     </Select>
// //   );
// // }

// // // ── component ─────────────────────────────────────────────────────────────────
// // export default function LayoutFilters({
// //   sites = [],
// //   buildings = [],
// //   floors = [],
// //   layouts = [],
// //   selectedSiteId,
// //   selectedBuildingId,
// //   selectedFloorId,
// //   selectedLayoutId,
// //   onSiteChange,
// //   onBuildingChange,
// //   onFloorChange,
// //   onLayoutChange,
// //   loadingSites,
// //   loadingBuildings,
// //   loadingFloors,
// //   loadingLayouts,
// // }: LayoutFiltersProps) {
// //   const activeLayout = layouts.find((l) => l.layout_id === selectedLayoutId);

// //   const lastUpdated = activeLayout
// //     ? `${formatDate(activeLayout.updated_at)} by ${activeLayout.uploaded_by_name}`
// //     : null;

// //   return (
// //     <div className="flex flex-wrap items-center gap-3">
// //       {/* Site */}
// //       <CascadeSelect
// //         value={selectedSiteId}
// //         onValueChange={onSiteChange}
// //         disabled={!!loadingSites || sites.length === 0}
// //         placeholder={loadingSites ? "Loading…" : "Select site"}
// //         items={sites.map((s) => ({ value: s.id, label: s.name }))}
// //       />

// //       {/* Building */}
// //       <CascadeSelect
// //         value={selectedBuildingId}
// //         onValueChange={onBuildingChange}
// //         disabled={!!loadingBuildings || buildings.length === 0}
// //         placeholder={loadingBuildings ? "Loading…" : "Select building"}
// //         items={buildings.map((b) => ({ value: b.id, label: b.name }))}
// //       />

// //       {/* Floor */}
// //       <CascadeSelect
// //         value={selectedFloorId}
// //         onValueChange={onFloorChange}
// //         disabled={!!loadingFloors || floors.length === 0}
// //         placeholder={loadingFloors ? "Loading…" : "Select floor"}
// //         items={floors.map((f) => ({ value: f.id, label: f.name }))}
// //       />

// //       {/* Layout version */}
// //       <CascadeSelect
// //         value={selectedLayoutId}
// //         onValueChange={onLayoutChange}
// //         disabled={!!loadingLayouts || layouts.length === 0}
// //         placeholder={loadingLayouts ? "Loading…" : "No layouts"}
// //         items={layouts.map((l) => ({
// //           value: l.layout_id,
// //           label: versionLabel(l),
// //         }))}
// //       />

// //       {/* Last updated */}
// //       {lastUpdated && (
// //         <span className="text-sm text-gray-500 whitespace-nowrap">
// //           Last updated: {lastUpdated}
// //         </span>
// //       )}
// //     </div>
// //   );
// // }

// "use client";

// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Building, Floor, Layout, Site } from "../types/layout.types";

// // ── helpers ───────────────────────────────────────────────────────────────────
// function versionLabel(l: Layout): string {
//   if (l.is_published) return `v${l.version_no} (Active)`;
//   if (l.status === "ARCHIVED") return `v${l.version_no} (Archived)`;
//   return `v${l.version_no} (Draft)`;
// }

// function formatDate(iso: string): string {
//   return new Date(iso).toLocaleDateString("en-US", {
//     month: "short",
//     day: "numeric",
//     year: "numeric",
//   });
// }

// // ── props ─────────────────────────────────────────────────────────────────────
// interface LayoutFiltersProps {
//   sites: Site[];
//   buildings: Building[];
//   floors: Floor[];
//   layouts: Layout[];
//   selectedSiteId: string;
//   selectedBuildingId: string;
//   selectedFloorId: string;
//   selectedLayoutId: string;
//   onSiteChange: (id: string) => void;
//   onBuildingChange: (id: string) => void;
//   onFloorChange: (id: string) => void;
//   onLayoutChange: (id: string) => void;
//   loadingSites?: boolean;
//   loadingBuildings?: boolean;
//   loadingFloors?: boolean;
//   loadingLayouts?: boolean;
// }

// // ── reusable select wrapper ───────────────────────────────────────────────────
// interface CascadeSelectProps {
//   value: string;
//   onValueChange: (val: string) => void;
//   disabled: boolean;
//   placeholder: string;
//   items: { value: string; label: string }[];
// }

// function CascadeSelect({
//   value,
//   onValueChange,
//   disabled,
//   placeholder,
//   items,
// }: CascadeSelectProps) {
//   return (
//     <Select
//       value={value}
//       onValueChange={(val) => {
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

// // ── component ─────────────────────────────────────────────────────────────────
// export default function LayoutFilters({
//   sites = [],
//   buildings = [],
//   floors = [],
//   layouts = [],
//   selectedSiteId,
//   selectedBuildingId,
//   selectedFloorId,
//   selectedLayoutId,
//   onSiteChange,
//   onBuildingChange,
//   onFloorChange,
//   onLayoutChange,
//   loadingSites,
//   loadingBuildings,
//   loadingFloors,
//   loadingLayouts,
// }: LayoutFiltersProps) {
//   const activeLayout = layouts.find((l) => l.layout_id === selectedLayoutId);

//   const lastUpdated = activeLayout
//     ? `${formatDate(activeLayout.updated_at)} by ${activeLayout.uploaded_by_name}`
//     : null;

//   return (
//     <div className="flex flex-wrap items-center gap-3">
//       {/* Site */}
//       <CascadeSelect
//         value={selectedSiteId}
//         onValueChange={onSiteChange}
//         disabled={!!loadingSites || sites.length === 0}
//         placeholder={loadingSites ? "Loading…" : "Select site"}
//         items={sites.map((s) => ({ value: String(s.id), label: s.name }))}
//       />

//       {/* Building */}
//       <CascadeSelect
//         value={selectedBuildingId}
//         onValueChange={onBuildingChange}
//         disabled={!!loadingBuildings || buildings.length === 0}
//         placeholder={loadingBuildings ? "Loading…" : "Select building"}
//         items={buildings.map((b) => ({ value: String(b.id), label: b.name }))}
//       />

//       {/* Floor */}
//       <CascadeSelect
//         value={selectedFloorId}
//         onValueChange={onFloorChange}
//         disabled={!!loadingFloors || floors.length === 0}
//         placeholder={loadingFloors ? "Loading…" : "Select floor"}
//         items={floors.map((f) => ({ value: String(f.id), label: f.name }))}
//       />

//       {/* Layout version */}
//       <CascadeSelect
//         value={selectedLayoutId}
//         onValueChange={onLayoutChange}
//         disabled={!!loadingLayouts || layouts.length === 0}
//         placeholder={loadingLayouts ? "Loading…" : "No layouts"}
//         items={layouts.map((l) => ({
//           value: l.layout_id,
//           label: versionLabel(l),
//         }))}
//       />

//       {/* Last updated */}
//       {lastUpdated && (
//         <span className="text-sm text-gray-500 whitespace-nowrap">
//           Last updated: {lastUpdated}
//         </span>
//       )}
//     </div>
//   );
// }

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