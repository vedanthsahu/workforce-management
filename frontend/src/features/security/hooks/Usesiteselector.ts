"use client";

import type { Site } from "../types/security.types";

export interface SiteOption {
  key: string; // unique dropdown key — never shown to the user
  label: string; // what's actually displayed in the dropdown
  siteId: string; // the real site_id this option filters by
}

interface UseSiteSelectorOptions {
  sites: Site[];
  selectedSiteId?: string;
  onChange: (siteId: string) => void;
}

/**
 * Owns the mapping between what's shown in the dropdown (a friendly label/
 * key) and the real site_id that actually gets sent to the API. Options come
 * straight from the live /sites list — no hardcoded site data.
 */
export function useSiteSelector({ sites, selectedSiteId, onChange }: UseSiteSelectorOptions) {
  const options: SiteOption[] = sites.map((s) => ({ key: s.id, label: s.name, siteId: s.id }));
  const selectedKey = selectedSiteId ?? "";

  const selectOption = (key: string) => {
    const option = options.find((o) => o.key === key);
    if (!option) return;
    onChange(option.siteId);
  };

  return { options, selectedKey, selectOption };
}
