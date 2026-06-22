"use client";
// hard coded
import { useEffect, useState } from "react";

export interface SiteOption {
  key: string; // unique dropdown key — never shown to the user
  label: string; // what's actually displayed in the dropdown
  siteId: string; // the real site_id this option filters by
}

// Static for now — no live /sites call yet.
// "Roxana Towers" is a building inside "Hyderabad Begumpet Office," so
// picking either one filters the dashboard by the same real site_id ("5").
export const SITE_OPTIONS: SiteOption[] = [
  { key: "Hyderabad Begumpet", label: "Hyderabad Begumpet Office", siteId: "5" },
  { key: "Roxana Towers", label: "Roxana Towers", siteId: "5" },
  { key: "tech-park", label: "Tech Park Annex", siteId: "6" },
];

// Auto-selected the moment security logs in / the dashboard first loads.
// Exported so useSecurityDashboard can seed its initial site_id with the
// exact same default — single source of truth, no magic strings repeated.
export const DEFAULT_SITE_KEY = "Roxana Towers";
export const DEFAULT_SITE_ID =
  SITE_OPTIONS.find((o) => o.key === DEFAULT_SITE_KEY)?.siteId ?? "";

interface UseSiteSelectorOptions {
  selectedSiteId?: string;
  onChange: (siteId: string) => void;
}

/**
 * Owns the mapping between what's shown in the dropdown (a friendly label/
 * key) and the real site_id that actually gets sent to the API. The
 * <SiteSelector /> component never touches an id directly — it just renders
 * `options` and calls `selectOption(key)` on click.
 */
export function useSiteSelector({ selectedSiteId, onChange }: UseSiteSelectorOptions) {
  const [selectedKey, setSelectedKey] = useState<string>(DEFAULT_SITE_KEY);

  // If the real site id changes from outside (e.g. reset elsewhere) and the
  // currently-tracked key no longer matches it, fall back to the first
  // option that does match that site id.
  useEffect(() => {
    if (!selectedSiteId) {
      setSelectedKey(DEFAULT_SITE_KEY);
      return;
    }
    const currentKeyStillMatches =
      SITE_OPTIONS.find((o) => o.key === selectedKey)?.siteId === selectedSiteId;

    if (!currentKeyStillMatches) {
      const match = SITE_OPTIONS.find((o) => o.siteId === selectedSiteId);
      setSelectedKey(match?.key ?? "");
    }
  }, [selectedSiteId, selectedKey]);

  const selectOption = (key: string) => {
    const option = SITE_OPTIONS.find((o) => o.key === key);
    if (!option) return;
    setSelectedKey(option.key);
    onChange(option.siteId);
  };

  return { options: SITE_OPTIONS, selectedKey, selectOption };
}