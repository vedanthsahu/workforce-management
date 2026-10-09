"use client";

import { useEffect, useState } from "react";
import { fetchBlockedSeatPolicy } from "@/features/configuration/services/configuration.service";
import { DEFAULT_BLOCK_WINDOW_DAYS, maxBlockDate } from "../utils/blockDates";

/**
 * The tenant-configured block window (Configuration -> Blocked Seat Policy ->
 * Maximum Block Window), in days. Starts at the default until the policy
 * loads or if it fails to load -- the backend enforces the real value on save
 * either way, so this only drives the date pickers and the early validation.
 */
export function useBlockWindow() {
  const [days, setDays] = useState(DEFAULT_BLOCK_WINDOW_DAYS);

  useEffect(() => {
    let active = true;
    fetchBlockedSeatPolicy()
      .then((policy) => {
        if (active && policy.max_advance_days > 0) setDays(policy.max_advance_days);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return { days, latestBlockDate: maxBlockDate(days) };
}
