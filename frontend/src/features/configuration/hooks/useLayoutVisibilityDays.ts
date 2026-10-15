"use client";

import { useEffect, useState } from "react";
import { fetchLayoutPolicy } from "../services/configuration.service";

/**
 * Tenant-configured Layout Visibility days (Configuration → Layout
 * Visibility), keyed by layout status. Null until the policy loads; callers
 * skip their age-based hiding/countdown until then -- the backend already
 * applies the same filter to the list it returns.
 */
export function useLayoutVisibilityDays(): Partial<Record<string, number>> | null {
  const [days, setDays] = useState<Partial<Record<string, number>> | null>(null);

  useEffect(() => {
    let active = true;
    fetchLayoutPolicy()
      .then(({ visibility_days }) => {
        if (!active) return;
        setDays({
          DRAFT: visibility_days.draft,
          ARCHIVED: visibility_days.archived,
          DELETED: visibility_days.deleted,
        });
      })
      .catch((err) => console.error("Failed to load layout visibility policy", err));
    return () => {
      active = false;
    };
  }, []);

  return days;
}
