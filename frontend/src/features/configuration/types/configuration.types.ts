import type { LucideIcon } from "lucide-react";

export interface ConfigurationField {
  key: string;
  /** Label used in the edit panel's form. */
  label: string;
  value: number;
  /** Unit word shown under the value in a stat block, e.g. "days", "bookings". */
  unit: string;
  /** Short label shown above the value in a stat block, e.g. "Record Count". */
  statLabel: string;
  helperText: string;
  // Only set on fields that render as their own mini stat-card (icon +
  // title + description + value) instead of a plain stat block -- only
  // Layout Visibility's Draft/Archived/Discarded fields use this.
  icon?: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  cardTitle?: string;
  cardDescription?: string;
  // Per-field metadata, shown alongside cardTitle/cardDescription on
  // Layout Visibility's mini stat-cards -- other fields are edited as part
  // of their item and rely on the item's own lastUpdatedAt/lastUpdatedBy.
  lastUpdatedAt?: string;
  lastUpdatedBy?: string;
}

export interface ConfigurationItem {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  fields: ConfigurationField[];
  lastUpdatedAt: string;
  lastUpdatedBy: string;
  /** Plain-English summary shown as an info callout in the edit panel --
   * recomputed from `fields` (including unsaved draft edits) so it updates
   * live as the admin types. */
  describeRule: (fields: ConfigurationField[]) => string;
  /** When true, this item's fields each render as their own mini stat-card
   * instead of the usual stat-block row, and the section header carries the
   * single Edit action for all of them together -- only Layout Visibility
   * uses this (one configuration, three status thresholds). */
  multiField?: boolean;
}

/** Groups related configurations under one heading, matching the page's
 * section-per-topic layout (Activity, Layout Management, Employee Booking,
 * Visitor Booking, Layout Visibility). */
export interface ConfigurationSection {
  id: string;
  title: string;
  subtitle: string;
  itemIds: string[];
}
