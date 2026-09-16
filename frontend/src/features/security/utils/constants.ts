import { CalendarCheck, UserCheck, Clock, XCircle } from "lucide-react";

// ─── Dashboard stat cards ─────────────────────────────────────────────────────

export const STAT_CARDS_CONFIG = [
  {
    key: "expected" as const,
    label: "Expected Today",
    sublabel: "Scheduled visitors",
    icon: CalendarCheck,
    accentBar: "bg-blue-400",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-500",
    viewAllColor: "text-blue-600 hover:text-blue-800",
  },
  {
    key: "checked-in" as const,
    label: "Checked In",
    sublabel: "Currently in office",
    icon: UserCheck,
    accentBar: "bg-emerald-400",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-500",
    viewAllColor: "text-emerald-600 hover:text-emerald-800",
  },
  {
    key: "overdue" as const,
    label: "Overdue Checkout",
    sublabel: "Past end time",
    icon: Clock,
    accentBar: "bg-amber-400",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-500",
    viewAllColor: "text-amber-600 hover:text-amber-800",
  },
  {
    key: "cancelled" as const,
    label: "Cancelled / No Show",
    sublabel: "Today",
    icon: XCircle,
    accentBar: "bg-red-400",
    iconBg: "bg-red-50",
    iconColor: "text-red-500",
    viewAllColor: "text-red-600 hover:text-red-800",
  },
];

// ─── Visitor table ────────────────────────────────────────────────────────────

export const VISITOR_TABLE_HEADERS = [
  "Guest Name",
  "Host",
  "Visit Time",
  "Location",
  "Seat Booked",
  "Status",
  "Actions",
];

// ~57px per row × 4 rows + 40px header = 268px minimum
export const VISITOR_TABLE_MIN_HEIGHT = "min-h-[268px]";
