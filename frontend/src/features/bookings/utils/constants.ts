import type { BookingTab } from "../types/bookings.types";

// Display names matched against the /preferences API response by name.
// Used when a booking has no preference data from the API.
export const FALLBACK_PREFERENCE_NAMES = ["Window Seat", "Near Cafeteria"];

export const TAG_STYLES: Record<string, string> = {
  confirmed: "bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]",
  manager:   "bg-[#E3F2FD] text-[#1565C0] border border-[#90CAF9]",
  zone:      "bg-[#F3E5F5] text-[#6A1B9A] border border-[#CE93D8]",
  sprint:    "bg-[#FFF8E1] text-[#F57F17] border border-[#FFE082]",
  recurring: "bg-[#E8EAF6] text-[#283593] border border-[#9FA8DA]",
};

export const TABS: { id: BookingTab; label: string }[] = [
  { id: "upcoming",  label: "Upcoming"  },
  { id: "past",      label: "Past"      },
  { id: "cancelled", label: "Cancelled" },
];
