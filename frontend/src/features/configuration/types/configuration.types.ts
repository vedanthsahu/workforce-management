import type { LucideIcon } from "lucide-react";

export interface ConfigurationField {
  key: string;
  label: string;
  value: number;
  helperText: string;
}

export interface ConfigurationValuePill {
  label: string;
  value: string;
  className: string;
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
  /** Colored pills shown in the list table's "Current Value" column --
   * recomputed from `fields` so an edit is reflected immediately. */
  valuePills: (fields: ConfigurationField[]) => ConfigurationValuePill[];
  /** Plain-English summary shown as an info callout in the edit panel --
   * recomputed from `fields` (including unsaved draft edits) so it updates
   * live as the admin types. */
  describeRule: (fields: ConfigurationField[]) => string;
}
