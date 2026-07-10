"use client";

import {
  Pencil,
  Wifi,
  Coffee,
  Monitor,
  VolumeX,
  AppWindow,
  ArrowUpDown,
  CircleParking,
  ParkingCircle,
  Printer,
  Phone,
  Accessibility,
  Hand,
  Leaf,
  Wind,
  Presentation,
  BatteryCharging,
  Lock,
  Table2,
  Armchair,
  Users,
  HandCoins,
  Link2,
  MapPin,
  Ellipsis,
  ShieldCheck,
  ShelvingUnit,
  Cpu,
  HeartPulse,
  Tag,
  type LucideIcon,
} from "lucide-react";

import { Amenity } from "../types/amenities.types";

type Props = {
  data: Amenity[];
  onEdit: (amenity: Amenity) => void;
  highlightedAmenityId?: string | null;
};

type IconConfig = { icon: LucideIcon; text: string; bg: string };

const DEFAULT_ICON_CONFIG: IconConfig = { icon: Tag, text: "text-gray-500", bg: "bg-gray-100" };

// Primary source of truth: the amenity's category. Category is a fixed,
// always-present 15-value taxonomy (see GET /amenity-categories), so this
// gives every amenity a modern, colorful, meaningful icon — unlike per-item
// icon_name, which is free text and won't always match a known keyword.
const CATEGORY_ICON_CONFIG: Record<string, IconConfig> = {
  "ACCESSIBILITY":       { icon: Hand,          text: "text-teal-600",    bg: "bg-teal-100" },
  "COLLABORATION":       { icon: Users,         text: "text-violet-600",  bg: "bg-violet-100" },
  "COMFORT":             { icon: Armchair,      text: "text-pink-600",    bg: "bg-pink-100" },
  "CONNECTIVITY":        { icon: Wifi,          text: "text-sky-600",     bg: "bg-sky-100" },
  "ENVIRONMENT":         { icon: Link2,         text: "text-purple-600",  bg: "bg-purple-100" },
  "FACILITIES":          { icon: HandCoins,     text: "text-amber-600",   bg: "bg-amber-100" },
  "FOOD & BEVERAGE":     { icon: Coffee,        text: "text-orange-600",  bg: "bg-orange-100" },
  "LOCATION PREFERENCE": { icon: MapPin,        text: "text-rose-600",    bg: "bg-rose-100" },
  "OTHER":               { icon: Ellipsis,      text: "text-slate-600",   bg: "bg-slate-100" },
  "PARKING":             { icon: ParkingCircle, text: "text-emerald-600", bg: "bg-emerald-100" },
  "SAFETY & SECURITY":   { icon: ShieldCheck,   text: "text-red-600",     bg: "bg-red-100" },
  "STORAGE":             { icon: ShelvingUnit,  text: "text-indigo-600",  bg: "bg-indigo-100" },
  "TECHNOLOGY":          { icon: Cpu,           text: "text-blue-600",    bg: "bg-blue-100" },
  "WELLNESS":            { icon: HeartPulse,    text: "text-lime-600",    bg: "bg-lime-100" },
  "WORKSPACE":           { icon: Monitor,       text: "text-fuchsia-600", bg: "bg-fuchsia-100" },
};

// Fallback for the rare amenity whose category doesn't match a known key —
// keyed by the free-text icon_name field.
const AMENITY_ICON_CONFIG: Record<string, IconConfig> = {
  wifi:          { icon: Wifi,            text: "text-sky-600",     bg: "bg-sky-100" },
  coffee:        { icon: Coffee,          text: "text-orange-600",  bg: "bg-orange-100" },
  monitor:       { icon: Monitor,         text: "text-fuchsia-600", bg: "bg-fuchsia-100" },
  "volume-x":    { icon: VolumeX,         text: "text-purple-600",  bg: "bg-purple-100" },
  elevator:      { icon: ArrowUpDown,     text: "text-rose-600",    bg: "bg-rose-100" },
  window:        { icon: AppWindow,       text: "text-rose-600",    bg: "bg-rose-100" },
  parking:       { icon: CircleParking,   text: "text-emerald-600", bg: "bg-emerald-100" },
  printer:       { icon: Printer,         text: "text-amber-600",   bg: "bg-amber-100" },
  phone:         { icon: Phone,           text: "text-sky-600",     bg: "bg-sky-100" },
  accessibility: { icon: Accessibility,   text: "text-teal-600",    bg: "bg-teal-100" },
  plant:         { icon: Leaf,             text: "text-lime-600",    bg: "bg-lime-100" },
  ac:            { icon: Wind,            text: "text-pink-600",    bg: "bg-pink-100" },
  whiteboard:    { icon: Presentation,    text: "text-fuchsia-600", bg: "bg-fuchsia-100" },
  charging:      { icon: BatteryCharging, text: "text-blue-600",    bg: "bg-blue-100" },
  lock:          { icon: Lock,            text: "text-indigo-600",  bg: "bg-indigo-100" },
  desk:          { icon: Table2,          text: "text-fuchsia-600", bg: "bg-fuchsia-100" },
  chair:         { icon: Armchair,        text: "text-pink-600",    bg: "bg-pink-100" },
};

function getIconConfig(amenity: Pick<Amenity, "category_name" | "icon_name">): IconConfig {
  const categoryKey = amenity.category_name?.trim().toUpperCase();
  if (categoryKey && CATEGORY_ICON_CONFIG[categoryKey]) {
    return CATEGORY_ICON_CONFIG[categoryKey];
  }
  const iconKey = amenity.icon_name?.toLowerCase();
  return (iconKey && AMENITY_ICON_CONFIG[iconKey]) || DEFAULT_ICON_CONFIG;
}

export default function AmenitiesTable({ data, onEdit, highlightedAmenityId }: Props) {
  if (data.length === 0) {
    return <p className="px-6 py-12 text-center text-gray-400 text-sm">No amenities found.</p>;
  }

  return (
    <>
      <style>{`
        @keyframes highlight-fade {
          0%   { background-color: #eff6ff; }
          60%  { background-color: #eff6ff; }
          100% { background-color: transparent; }
        }
        .row-highlight { animation: highlight-fade 3s ease forwards; }
      `}</style>

      {/* ── Mobile card list (hidden on md+) ──────────────── */}
      <div className="md:hidden divide-y">
        {data.map((amenity) => {
          const { icon: Icon, text, bg } = getIconConfig(amenity);
          const isHighlighted = String(amenity.amenity_id) === String(highlightedAmenityId);
          return (
            <div
              key={amenity.amenity_id}
              className={`px-4 py-3 flex items-center justify-between gap-3 ${isHighlighted ? "row-highlight" : ""}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 shrink-0 flex items-center justify-center rounded-full ring-1 ring-black/5 ${bg} ${isHighlighted ? "ring-2 ring-blue-300" : ""}`}>
                  <Icon className={`w-5 h-5 ${text}`} strokeWidth={2.25} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{amenity.amenity_name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                      {amenity.category_name}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                      amenity.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                    }`}>
                      {amenity.is_active ? "Active" : "Inactive"}
                    </span>
                    <span className="text-xs text-gray-500">{amenity.assigned_seat_count} seats</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => onEdit(amenity)}
                className="p-1.5 border rounded-lg hover:bg-gray-100 transition shrink-0"
              >
                <Pencil size={13} className="text-blue-600" />
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Desktop table (hidden below md) ───────────────── */}
      {/* ✅ CHANGED: removed overflow-x-auto here — parent div in page.tsx owns it now */}
      <div className="hidden md:block">
        <table className="w-full text-xs" style={{ minWidth: "860px" }}>
          <colgroup>
            <col style={{ width: "150px" }} />
            <col style={{ width: "170px" }} />
            <col style={{ width: "220px" }} />
            <col style={{ width: "90px" }} />
            <col style={{ width: "110px" }} />
            <col style={{ width: "70px" }} />
          </colgroup>
          <thead className="text-xs text-blue-600 bg-blue-100 border-b sticky top-0 z-10">
            <tr>
              <th className="pl-10 px-3 py-3 text-left font-bold">Amenity Name</th>
              <th className="px-3 py-3 text-center font-bold">Category</th>
              <th className="pl-18 px-3 py-3 text-left font-bold">Description</th>
              <th className="px-3 py-3 text-center font-bold">Status</th>
              <th className="px-3 py-3 text-center font-bold">Assigned Seats</th>
              <th className="px-3 py-3 text-center font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((amenity) => {
              const { icon: Icon, text, bg } = getIconConfig(amenity);
              const isHighlighted = String(amenity.amenity_id) === String(highlightedAmenityId);
              return (
                <tr key={amenity.amenity_id} className={isHighlighted ? "row-highlight" : "hover:bg-gray-50"}>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-9 h-9 shrink-0 flex items-center justify-center rounded-full ring-1 ring-black/5 ${bg} ${
                        isHighlighted ? "ring-2 ring-blue-300" : ""
                      }`}>
                        <Icon className={`w-5 h-5 ${text}`} strokeWidth={2.25} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{amenity.amenity_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="inline-flex px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-medium whitespace-nowrap">
                      {amenity.category_name}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-black max-w-0">
                    <span className="block truncate">{amenity.description}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium whitespace-nowrap ${
                      amenity.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                    }`}>
                      {amenity.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center font-medium">
                    {amenity.assigned_seat_count.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={() => onEdit(amenity)}
                      className="p-1.5 border rounded-lg hover:bg-gray-100 transition"
                    >
                      <Pencil size={13} className="text-blue-600" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}