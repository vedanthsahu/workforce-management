import { Ban, CalendarDays, Clock3, CircleAlert, TimerOff } from "lucide-react";
import type { BlockCategory, BlockedSeatFilters, BlockType, DisplayStatus } from "../types/blockedSeats.types";

export const EMPTY_FILTERS: BlockedSeatFilters = { search: "", siteId: "", buildingId: "", floorId: "", blockType: "", date: "" };
export const SUMMARY_CARDS = [
  { id: "active" as const, summaryKey: "active_blocks" as const, label: "Active Blocks", icon: Ban, iconClass: "bg-primary/10 text-primary" },
  { id: "today" as const, summaryKey: "seats_blocked_today" as const, label: "Spaces Blocked Today", icon: CalendarDays, iconClass: "bg-blue-100 text-blue-600" },
  { id: "upcoming" as const, summaryKey: "upcoming_blocks" as const, label: "Upcoming Blocks", icon: Clock3, iconClass: "bg-primary/10 text-primary" },
  { id: "expiring" as const, summaryKey: "expiring_soon" as const, label: "Expiring Soon", icon: CircleAlert, iconClass: "bg-orange-100 text-orange-500" },
  { id: "expired" as const, summaryKey: "expired" as const, label: "Expired", icon: TimerOff, iconClass: "bg-red-100 text-red-500" },
];
export const TYPE_LABELS: Record<BlockType, string> = { MAINTENANCE: "Maintenance", RESERVED: "Reserved", ADMIN_BLOCK: "Admin Block" };
export const TYPE_STYLES: Record<BlockType, string> = { MAINTENANCE: "bg-primary/10 text-primary", RESERVED: "bg-blue-100 text-blue-700", ADMIN_BLOCK: "bg-orange-100 text-orange-700" };
export const STATUS_LABELS: Record<DisplayStatus, string> = { ACTIVE: "Active", UPCOMING: "Upcoming", EXPIRED: "Expired" };
export const STATUS_STYLES: Record<DisplayStatus, string> = { ACTIVE: "bg-emerald-100 text-emerald-700", UPCOMING: "bg-blue-100 text-blue-700", EXPIRED: "bg-gray-100 text-gray-600" };
export const BLOCK_TYPE_OPTIONS = Object.entries(TYPE_LABELS).map(([value, label]) => ({ value: value as BlockType, label }));
export const CATEGORY_LABELS: Record<BlockCategory, string> = Object.fromEntries(SUMMARY_CARDS.map((card) => [card.id, card.label])) as Record<BlockCategory, string>;
