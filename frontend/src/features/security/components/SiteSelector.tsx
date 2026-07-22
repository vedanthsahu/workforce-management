"use client";

// Using a native select element instead of the shadcn Select component
import { useSiteSelector } from "../hooks/Usesiteselector";
import type { Site } from "../types/security.types";

type Props = {
  sites: Site[];
  selectedSiteId?: string;
  onChange: (siteId: string) => void;
};

export function SiteSelector({ sites, selectedSiteId, onChange }: Props) {
  const { options, selectedKey, selectOption } = useSiteSelector({ sites, selectedSiteId, onChange });

  return (
    <div className="flex items-center gap-6">
      <select
        value={selectedKey}
        onChange={(e) => selectOption(e.target.value)}
        className="h-9 w-55 text-sm font-medium px-3
          border border-gray-200 bg-white text-gray-700 hover:bg-gray-50
          focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-1
          rounded-lg shadow-sm transition-colors"
      >
        {options.map((o) => (
          <option key={o.key} value={o.key} className="text-sm text-gray-700">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}