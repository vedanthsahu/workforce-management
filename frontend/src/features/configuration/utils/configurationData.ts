import {
  ListChecks,
  CalendarClock,
  UsersRound,
  CalendarRange,
  UserRound,
  Eye,
} from "lucide-react";
import type { ConfigurationField, ConfigurationItem } from "../types/configuration.types";

function field(key: string, label: string, value: number, helperText: string): ConfigurationField {
  return { key, label, value, helperText };
}

function getField(fields: ConfigurationField[], key: string): number {
  return fields.find((f) => f.key === key)?.value ?? 0;
}

export const INITIAL_CONFIGURATIONS: ConfigurationItem[] = [
  {
    id: "activity-table-record-count",
    name: "Activity Table Record Count",
    description:
      "Configure the default number of records to display in activity tables across the application.",
    icon: ListChecks,
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
    fields: [
      field("records", "Record Count", 50, "Number of rows shown per page in activity/recent-activity tables."),
    ],
    lastUpdatedAt: "2026-05-02T10:30:00Z",
    lastUpdatedBy: "Admin User",
    valuePills: (fields) => [
      { label: "Records", value: String(getField(fields, "records")), className: "bg-indigo-50 text-indigo-700" },
    ],
    describeRule: (fields) =>
      `Activity tables will show ${getField(fields, "records")} records per page by default.`,
  },
  {
    id: "new-layout-publishing",
    name: "New Layout Publishing",
    description:
      "Set the number of days after which a newly published layout will take effect in the application.",
    icon: CalendarClock,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    fields: [
      field("days", "Days", 3, "Number of days after publishing before the layout becomes the active one."),
    ],
    lastUpdatedAt: "2026-05-02T10:30:00Z",
    lastUpdatedBy: "Admin User",
    valuePills: (fields) => [
      { label: "Days", value: String(getField(fields, "days")), className: "bg-emerald-50 text-emerald-700" },
    ],
    describeRule: (fields) =>
      `A newly published layout will take effect ${getField(fields, "days")} day(s) after it is published.`,
  },
  {
    id: "booking-future-bookings-employee",
    name: "Booking - Future Bookings (Employee)",
    description: "Define how many future bookings an employee can create.",
    icon: UsersRound,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    fields: [
      field("bookings", "Future Bookings", 10, "Maximum number of upcoming (not yet occurred) bookings an employee may hold at once."),
    ],
    lastUpdatedAt: "2026-05-02T10:30:00Z",
    lastUpdatedBy: "Admin User",
    valuePills: (fields) => [
      { label: "Bookings", value: String(getField(fields, "bookings")), className: "bg-blue-50 text-blue-700" },
    ],
    describeRule: (fields) =>
      `Employees will be able to hold up to ${getField(fields, "bookings")} future bookings at a time.`,
  },
  {
    id: "booking-calendar-employee",
    name: "Booking Calendar (Employee)",
    description:
      "Limit the maximum number of bookings an employee can make within a configurable future duration.",
    icon: CalendarRange,
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    fields: [
      field("maxBookings", "Maximum Bookings", 7, "Maximum number of bookings an employee can make."),
      field("durationDays", "Future Duration (Days)", 30, "Bookings are allowed within this number of days from today."),
    ],
    lastUpdatedAt: "2026-05-02T10:30:00Z",
    lastUpdatedBy: "Admin User",
    valuePills: (fields) => [
      { label: "Max Bookings", value: String(getField(fields, "maxBookings")), className: "bg-orange-50 text-orange-700" },
      { label: "Duration", value: `${getField(fields, "durationDays")} days`, className: "bg-orange-50 text-orange-700" },
    ],
    describeRule: (fields) =>
      `Employees will be able to create up to ${getField(fields, "maxBookings")} bookings within the next ${getField(fields, "durationDays")} days from the current date.`,
  },
  {
    id: "visitor-booking",
    name: "Visitor Booking",
    description: "Limit the maximum number of visitor bookings within a configurable future duration.",
    icon: UserRound,
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
    fields: [
      field("maxBookings", "Maximum Bookings", 5, "Maximum number of visitor bookings a host can make."),
      field("durationDays", "Future Duration (Days)", 30, "Visitor bookings are allowed within this number of days from today."),
    ],
    lastUpdatedAt: "2026-05-02T10:30:00Z",
    lastUpdatedBy: "Admin User",
    valuePills: (fields) => [
      { label: "Max Bookings", value: String(getField(fields, "maxBookings")), className: "bg-rose-50 text-rose-700" },
      { label: "Duration", value: `${getField(fields, "durationDays")} days`, className: "bg-rose-50 text-rose-700" },
    ],
    describeRule: (fields) =>
      `Hosts will be able to create up to ${getField(fields, "maxBookings")} visitor bookings within the next ${getField(fields, "durationDays")} days from the current date.`,
  },
  {
    id: "layout-visibility",
    name: "Layout Visibility (Draft/Archived/Discarded)",
    description:
      "Configure how long layouts with different statuses remain visible in the UI before being automatically hidden.",
    icon: Eye,
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    // Real values currently enforced server-side -- see
    // LAYOUT_VISIBILITY_THRESHOLDS in backend/services/floor_layout_service.py.
    fields: [
      field("draftDays", "Draft (Days)", 15, "How long a Draft layout stays listed after its last update."),
      field("archivedDays", "Archived (Days)", 30, "How long an Archived layout stays listed after its last update."),
      field("discardedDays", "Discarded (Days)", 5, "How long a Discarded layout stays listed after its last update."),
    ],
    lastUpdatedAt: "2026-05-02T10:30:00Z",
    lastUpdatedBy: "Admin User",
    valuePills: () => [
      { label: "Statuses", value: "3 Statuses Configured", className: "bg-violet-50 text-violet-700" },
    ],
    describeRule: (fields) =>
      `Draft layouts hide after ${getField(fields, "draftDays")} days, Archived after ${getField(fields, "archivedDays")} days, and Discarded after ${getField(fields, "discardedDays")} days of inactivity.`,
  },
];
