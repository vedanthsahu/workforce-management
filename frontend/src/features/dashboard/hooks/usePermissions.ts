/**
 * usePermissions
 *
 * A thin hook that reads the current user's permissions[] array from
 * AuthContext and exposes helpers for component-level RBAC.
 *
 * Usage:
 *   const { can, hasRole, permissions } = usePermissions();
 *
 *   // Gate a whole component
 *   if (!can("booking:book_for_someone")) return null;
 *
 *   // Gate a button
 *   {can("booking:cancel_own") && <CancelButton />}
 *
 *   // Gate by role
 *   {hasRole("ADMIN", "MANAGER") && <AdminPanel />}
 */

import { useAuthContext } from "@/features/auth/context/AuthContext";
import { useCallback, useMemo } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

// Real backend permission catalog lives in docs/Permission-Groups-Summary.xlsx
// ("Backend Permissions" sheet) and backend/db/migrations/Trial_003_seed_permissions.sql.
// This union is a DX aid for autocomplete on the most-used keys, not an
// exhaustive list -- `can`/`canAny` work against any real key via `| string`.
export type AppPermission =
  | "booking:create_own"
  | "booking:view_own"
  | "booking:cancel_own"
  | "booking:update_own"
  | "booking:create_for_employee"
  | "booking:create_for_guest"
  | "booking:view_any_employee"
  | "booking:view_any_guest"
  | "dashboard:view"
  | "admin_dashboard:view"
  | "teammate:view"
  | "team:view"
  | "office:view"
  | "building:view"
  | "floor:view"
  | "layout:view"
  | "amenity:view"
  | "user:view"
  | "user:view_any"
  | "role:view"
  | "audit:view"
  | "guest:view"
  | "guest_visit:view"
  | string; // forward-compatible — don't narrow away future permissions

// MANAGER and PRODUCT_ADMIN are deliberately out of scope for the group
// model work so far -- see the permission-model conversation history.
export type AppRole =
  | "TENANT_ADMIN"
  | "EMPLOYEE"
  | "FACILITATOR"
  | "FRONT_OFFICE"
  | string;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePermissions() {
  const { user } = useAuthContext();

  // user.permissions comes from /auth/me as string[]. Memoized so the
  // fallback `[]` doesn't get a fresh reference every render — that would
  // silently break `can`/`canAny`'s useCallback memoization below whenever
  // permissions is nullish.
  const permissions: string[] = useMemo(() => user?.permissions ?? [], [user?.permissions]);
  const role: AppRole         = user?.role ?? "EMPLOYEE";

  /**
   * Returns true if the current user has ALL of the listed permissions.
   * Pass a single string for the common case; pass multiple for AND logic.
   *
   * @example
   *   can("seat:book_self")                           // single
   *   can("user:manage", "space:manage")              // both required
   */
  const can = useCallback(
    (...perms: AppPermission[]): boolean =>
      perms.every((p) => permissions.includes(p)),
    [permissions],
  );

  /**
   * Returns true if the current user has ANY of the listed permissions.
   *
   * @example
   *   canAny("booking:cancel_own", "booking:cancel_others")
   */
  const canAny = useCallback(
    (...perms: AppPermission[]): boolean =>
      perms.some((p) => permissions.includes(p)),
    [permissions],
  );

  /**
   * Returns true if the current user's role matches ANY of the given roles.
   * Use this as a coarse fallback when a permission hasn't been defined yet.
   *
   * @example
   *   hasRole("ADMIN", "MANAGER")
   */
  const hasRole = useCallback(
    (...roles: AppRole[]): boolean => roles.includes(role),
    [role],
  );

  return {
    /** The raw permissions array from /auth/me */
    permissions,
    /** The current user's role string */
    role,
    /** True if user has ALL listed permissions */
    can,
    /** True if user has ANY listed permission */
    canAny,
    /** True if user's role matches ANY listed role */
    hasRole,
  };
}