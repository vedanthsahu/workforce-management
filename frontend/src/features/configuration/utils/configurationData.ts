import {
  ListChecks,
  CalendarClock,
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
  helperText: string,
  readOnly = false,
): ConfigurationField {
  return { key, label, statLabel, value, unit, helperText, readOnly };
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
    description: "Set the safety buffer added on top of the employee booking window before a newly scheduled layout can take effect.",
    icon: CalendarClock,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    fields: [
      field("days", "Safety Buffer (Days)", "Buffer", 15, "days", "Days added on top of the employee booking window below, so a layout can never be scheduled to take effect before every booking against the old layout has passed."),
      // Derived, not stored: buffer + the Employee Booking Window rule
      // (below) -- shown so "Effective After" never gets confused with
      // the buffer alone again. Refreshed from the server after every
      // save (this card's own or the booking window's), not
      // recalculated live while typing.
      field("totalDays", "Effective After (Total)", "Effective After", 30, "days", "The actual earliest a newly scheduled layout can take effect: the employee booking window plus this buffer.", true),
    ],
    lastUpdatedAt: "2026-05-02T10:30:00Z",
    lastUpdatedBy: "Admin User",
    describeRule: (fields) => {
      const buffer = getField(fields, "days");
      const total = getField(fields, "totalDays");
      const employeeWindow = Math.max(total - buffer, 0);
      return `A newly scheduled layout must be at least ${total} day(s) out -- the employee booking window (${employeeWindow} days) plus this ${buffer}-day safety buffer.`;
    },
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
    name: "Guest Booking Window",
    description: "How many days in advance a host can book for a guest.",
    icon: UserRound,
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    fields: [
      field("durationDays", "Advance Window (Days)", "Advance Window", 30, "days", "Guest visits/bookings can be made up to this many days from today."),
    ],
    lastUpdatedAt: "2026-05-02T10:30:00Z",
    lastUpdatedBy: "Admin User",
    describeRule: (fields) =>
      `Hosts can book a guest for any date up to ${getField(fields, "durationDays")} days from today.`,
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
    subtitle: "Configure how far in advance employees can book.",
    itemIds: ["booking-calendar-employee"],
  },
  {
    id: "visitor-booking",
    title: "Visitor Booking",
    subtitle: "Configure how far in advance hosts can book for guests.",
    itemIds: ["visitor-booking"],
  },
  {
    id: "layout-visibility",
    title: "Layout Visibility",
    subtitle: "Configure how long layouts with different statuses remain available in the UI before being automatically hidden.",
    itemIds: ["layout-visibility"],
  },
];
