"use client";

import { useEffect, useState } from "react";
import { indiaDateIsoAfterDays } from "@/lib/indiaDate";
import { fetchBookingPolicy } from "../services/configuration.service";

/**
 * Tenant-configured booking advance windows (Configuration → Employee
 * Booking / Visitor Booking). Values are null until the policy loads; callers
 * skip their client-side date cap until then -- the backend enforces the
 * same rule on submit regardless.
 */
export function useBookingPolicy() {
  const [employeeMaxAdvanceDays, setEmployeeMaxAdvanceDays] = useState<number | null>(null);
  const [guestMaxAdvanceDays, setGuestMaxAdvanceDays] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetchBookingPolicy()
      .then((policy) => {
        if (!active) return;
        setEmployeeMaxAdvanceDays(policy.employee_max_advance_days);
        setGuestMaxAdvanceDays(policy.guest_max_advance_days);
      })
      .catch((err) => console.error("Failed to load booking policy", err));
    return () => {
      active = false;
    };
  }, []);

  return { employeeMaxAdvanceDays, guestMaxAdvanceDays };
}

/** Today + `days` as YYYY-MM-DD, or undefined while the policy is loading. */
export function maxDateIsoFromToday(days: number | null): string | undefined {
  if (days == null) return undefined;
  return indiaDateIsoAfterDays(days);
}
