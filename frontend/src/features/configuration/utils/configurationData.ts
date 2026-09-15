import {
  ListChecks,
  CalendarClock,
  UsersRound,
  CalendarRange,
  UserRound,
  FileText,
  Archive,
  Trash2,
} from "lucide-react";
import type {
  ConfigurationField,
  ConfigurationItem,
  ConfigurationSection,
} from "../types/configuration.types";

function field(
  key: string,
  label: string,
  statLabel: string,
  value: number,
  unit: string,
  helperText: string
): ConfigurationField {
  return { key, label, statLabel, value, unit, helperText };
}

function getField(fields: ConfigurationField[], key: string): number {
  return fields.find((f) => f.key === key)?.value ?? 0;
}

export const INITIAL_CONFIGURATIONS: ConfigurationItem[] = [
  {
    id: "activity-table-record-count",
    name: "Activity Table Record Count",
    description: "Configure the default number of records to display in activity tables.",
    icon: ListChecks,
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
    fields: [
      field("records", "Record Count", "Record Count", 50, "records", "Number of rows shown per page in activity/recent-activity tables."),
    ],
    lastUpdatedAt: "2026-05-02T10:30:00Z",
    lastUpdatedBy: "Admin User",
    describeRule: (fields) =>
      `Activity tables will show ${getField(fields, "records")} records per page by default.`,
  },
  {
    id: "new-layout-publishing",
    name: "New Layout Publishing",
    description: "Set the number of days after which a newly published layout will take effect in the application.",
    icon: CalendarClock,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    fields: [
      field("days", "Days", "Effective After", 3, "days", "Number of days after publishing before the layout becomes the active one."),
    ],
    lastUpdatedAt: "2026-05-02T10:30:00Z",
    lastUpdatedBy: "Admin User",
    describeRule: (fields) =>
      `A newly published layout will take effect ${getField(fields, "days")} day(s) after it is published.`,
  },
  {
    id: "booking-future-bookings-employee",
    name: "Future Bookings (Employee)",
    description: "Define how many future bookings an employee can create.",
    icon: UsersRound,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    fields: [
      field("bookings", "Future Bookings", "Max Future Bookings", 10, "bookings", "Maximum number of upcoming (not yet occurred) bookings an employee may hold at once."),
    ],
    lastUpdatedAt: "2026-05-02T10:30:00Z",
    lastUpdatedBy: "Admin User",
    describeRule: (fields) =>
      `Employees will be able to hold up to ${getField(fields, "bookings")} future bookings at a time.`,
  },
  {
    id: "booking-calendar-employee",
    name: "Booking Calendar (Employee)",
    description: "Set how far in advance an employee can make bookings.",
    icon: CalendarRange,
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    fields: [
      field("durationDays", "Future Duration (Days)", "Duration", 30, "days", "Bookings are allowed within this number of days from today."),
    ],
    lastUpdatedAt: "2026-05-02T10:30:00Z",
    lastUpdatedBy: "Admin User",
    describeRule: (fields) =>
      `Employees will be able to create bookings within the next ${getField(fields, "durationDays")} days from the current date.`,
  },
  {
    id: "visitor-booking",
    name: "Visitor Booking",
    description: "Set the maximum number of visitor bookings within a configurable future duration.",
    icon: UserRound,
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    fields: [
      field("maxBookings", "Maximum Bookings", "Max Bookings", 5, "bookings", "Maximum number of visitor bookings a host can make."),
      field("durationDays", "Future Duration (Days)", "Duration", 30, "days", "Visitor bookings are allowed within this number of days from today."),
    ],
    lastUpdatedAt: "2026-05-02T10:30:00Z",
    lastUpdatedBy: "Admin User",
    describeRule: (fields) =>
      `Hosts will be able to create up to ${getField(fields, "maxBookings")} visitor bookings within the next ${getField(fields, "durationDays")} days from the current date.`,
  },
  {
    id: "layout-visibility",
    name: "Layout Visibility",
    description: "Configure how long layouts with different statuses remain available in the UI before being automatically hidden.",
    icon: FileText,
    iconBg: "bg-gray-100",
    iconColor: "text-gray-600",
    multiField: true,
    // Real values currently enforced server-side -- see
    // LAYOUT_VISIBILITY_THRESHOLDS in backend/services/floor_layout_service.py.
    fields: [
      {
        key: "draftDays",
        label: "Draft (Days)",
        statLabel: "Draft",
        value: 15,
        unit: "days",
        helperText: "How long a Draft layout stays listed after its last update.",
        icon: FileText,
        iconBg: "bg-amber-100",
        iconColor: "text-amber-600",
        cardTitle: "Draft",
        cardDescription: "Layouts in draft state will remain available in the UI for the configured number of days.",
        lastUpdatedAt: "2026-05-02T10:30:00Z",
        lastUpdatedBy: "Admin User",
      },
      {
        key: "archivedDays",
        label: "Archived (Days)",
        statLabel: "Archived",
        value: 30,
        unit: "days",
        helperText: "How long an Archived layout stays listed after its last update.",
        icon: Archive,
        iconBg: "bg-blue-100",
        iconColor: "text-blue-600",
        cardTitle: "Archived",
        cardDescription: "Archived layouts will remain available in the UI for the configured number of days.",
        lastUpdatedAt: "2026-05-02T10:30:00Z",
        lastUpdatedBy: "Admin User",
      },
      {
        key: "discardedDays",
        label: "Discarded (Days)",
        statLabel: "Discarded",
        value: 5,
        unit: "days",
        helperText: "How long a Discarded layout stays listed after its last update.",
        icon: Trash2,
        iconBg: "bg-red-100",
        iconColor: "text-red-600",
        cardTitle: "Discarded",
        cardDescription: "Discarded layouts will remain available in the UI for the configured number of days.",
        lastUpdatedAt: "2026-05-02T10:30:00Z",
        lastUpdatedBy: "Admin User",
      },
    ],
    lastUpdatedAt: "2026-05-02T10:30:00Z",
    lastUpdatedBy: "Admin User",
    describeRule: (fields) =>
      `Draft layouts hide after ${getField(fields, "draftDays")} days, Archived after ${getField(fields, "archivedDays")} days, and Discarded after ${getField(fields, "discardedDays")} days of inactivity.`,
  },
];

export const CONFIGURATION_SECTIONS: ConfigurationSection[] = [
  {
    id: "activity",
    title: "Activity",
    subtitle: "Control the data displayed in the Activity table on the Admin Dashboard.",
    itemIds: ["activity-table-record-count"],
  },
  {
    id: "layout-management",
    title: "Layout Management",
    subtitle: "Configure layout related settings and publishing rules.",
    itemIds: ["new-layout-publishing"],
  },
  {
    id: "employee-booking",
    title: "Employee Booking",
    subtitle: "Configure booking limits and duration for employees.",
    itemIds: ["booking-future-bookings-employee", "booking-calendar-employee"],
  },
  {
    id: "visitor-booking",
    title: "Visitor Booking",
    subtitle: "Configure booking limits for visitors.",
    itemIds: ["visitor-booking"],
  },
  {
    id: "layout-visibility",
    title: "Layout Visibility",
    subtitle: "Configure how long layouts with different statuses remain available in the UI before being automatically hidden.",
    itemIds: ["layout-visibility"],
  },
];

// Tailwind needs literal class strings to scan -- can't derive "bg-X" from
// the "text-X" values above at runtime, so the accent bar color is looked
// up from a static map keyed by that same iconColor string.
export const ACCENT_BAR_BY_ICON_COLOR: Record<string, string> = {
  "text-amber-600": "bg-amber-200",
  "text-blue-600": "bg-blue-200",
  "text-red-600": "bg-red-200",
  "text-indigo-600": "bg-indigo-200",
  "text-emerald-600": "bg-emerald-200",
  "text-orange-600": "bg-orange-200",
  "text-violet-600": "bg-violet-200",
  "text-gray-600": "bg-gray-200",
};
