import type { BookingTab } from "../types/bookings.types";

export const FALLBACK_PREFERENCE_NAMES = ["Window Seat", "Near Cafeteria"];

export const TAG_STYLES: Record<string, string> = {
  confirmed: "bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]",
  manager:   "bg-[#E3F2FD] text-[#1565C0] border border-[#90CAF9]",
  zone:      "bg-[#F3E5F5] text-[#6A1B9A] border border-[#CE93D8]",
  sprint:    "bg-[#FFF8E1] text-[#F57F17] border border-[#FFE082]",
  recurring: "bg-[#E8EAF6] text-[#283593] border border-[#9FA8DA]",
};

export const BOOKING_TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  self:       { bg: "bg-indigo-50",  text: "text-indigo-700",  label: "Self Booking" },
  on_behalf:  { bg: "bg-purple-50",  text: "text-purple-700",  label: "On Behalf" },
  employee:   { bg: "bg-blue-50",    text: "text-blue-700",    label: "Employee Booking" },
  guest:      { bg: "bg-amber-50",   text: "text-amber-700",   label: "Guest Booking" },
};

export const CARD_ICON_GRADIENTS: Record<string, string> = {
  self:       "from-indigo-100 to-blue-100",
  on_behalf:  "from-green-100 to-emerald-100",
  employee:   "from-blue-100 to-indigo-50",
  guest:      "from-amber-100 to-rose-100",
};

export const CARD_EMOJIS: Record<string, string> = {
  self:       "🖥️",
  on_behalf:  "💼",
  employee:   "🪑",
  guest:      "🏢",
};

export const TABS: { id: BookingTab; label: string }[] = [
  { id: "upcoming",  label: "Upcoming"  },
  { id: "past",      label: "Past"      },
  { id: "cancelled", label: "Cancelled" },
];
