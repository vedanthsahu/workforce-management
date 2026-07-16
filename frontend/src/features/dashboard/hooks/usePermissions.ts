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
import { useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppPermission =
  | "booking:book_for_someone"
  | "booking:cancel_own"
  | "booking:view_own"
  | "dashboard:view"
  | "seat:book_self"
  | "teammate:view"
  | "report:view"
  | "user:manage"
  | "space:manage"
  | "admin:panel"
  | "facility:manage"
  | string; // forward-compatible — don't narrow away future permissions

export type AppRole =
  | "ADMIN"
  | "MANAGER"
  | "EMPLOYEE"
  | "FACILITATOR"
  | "FRONT_OFFICE"
  | "FACILITIES"
  | string;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePermissions() {
  const { user } = useAuthContext();

  // user.permissions comes from /auth/me as string[].
  const permissions: string[] = user?.permissions ?? [];
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