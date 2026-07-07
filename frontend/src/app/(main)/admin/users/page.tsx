"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import UsersTable from "@/features/users/components/UsersTable";
import UsersPagination from "@/features/users/components/UsersPagination";
import RoleFilterDropdown from "@/features/users/components/RoleFilterDropdown";
import StatusFilterDropdown from "@/features/users/components/StatusFilterDropdown";
import { useUsers } from "@/features/users/hooks/useUsers";
import type { RoleKey, User } from "@/features/users/types/users.types";
import { TableSkeleton, TableBodySkeleton } from "@/components/ui/table-skeleton";
import { normalizeRoleKey } from "@/features/users/utils/users.utils";
import { useUsersFilterStore } from "@/store/useUsersFilterStore";

const PIN_DURATION = 4000;
const PAGE_SIZES = [10, 25, 50, 75, 100];

function UserManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    users, summary, roles, loading,
    isSearchMode,
    search, setSearch,
    selectedRoles, setSelectedRoles,
    statusFilter, setStatusFilter,
    page, setPage, totalPages, limit, setLimit,
  } = useUsers();

  const [successMessage, setSuccessMessage] = useState("");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const pinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roleFilterAppliedRef = useRef(false);

  // Reset search/role/status filters on every mount so the page always starts
  // clean, without wiping the page/rows-per-page the user had set — those
  // should survive round-trips like navigating to change-role and back.
  // The URL-param effect below then re-applies the role filter if ?role= is present.
  // Using getState() avoids adding resetFilters to deps and prevents cleanup-on-unmount
  // races where the reset fires after the new filter has already been applied.
  useEffect(() => { useUsersFilterStore.getState().resetFilters(); }, []);

  const showBanner = (message: string) => {
    if (pinTimerRef.current) clearTimeout(pinTimerRef.current);
    setSuccessMessage(message);
    pinTimerRef.current = setTimeout(() => setSuccessMessage(""), PIN_DURATION);
  };

  useEffect(() => {
    const changedId = searchParams.get("roleChanged");
    const newRole = searchParams.get("newRole");
    if (!changedId) return;
    showBanner(`Role changed successfully${newRole ? ` to ${newRole}` : ""}.`);
    setHighlightedId(changedId);
    router.replace("/admin/users");
    setTimeout(() => setHighlightedId(null), PIN_DURATION);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const addedId = searchParams.get("added");
    if (!addedId) return;
    showBanner("User added successfully!");
    setHighlightedId(addedId);
    setPage(1);
    router.replace("/admin/users");
    setTimeout(() => setHighlightedId(null), PIN_DURATION);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Preselect role filter when navigated from RoleDetailModal.
  // NOTE: intentionally does NOT call router.replace() here — doing so while
  // this component sits inside a Suspense boundary that reads useSearchParams()
  // causes Next to re-suspend/remount the subtree, wiping selectedRoles right
  // after it's set. We just guard with a ref so it only applies once.
  // useEffect(() => {
  //   const roleParam = searchParams.get("role");
  //   if (!roleParam || roleFilterAppliedRef.current) return;
  //   roleFilterAppliedRef.current = true;
  //   setSelectedRoles([roleParam as RoleKey]);
  //   setPage(1);
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [searchParams]);
  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (!roleParam || roleFilterAppliedRef.current || !summary?.roles?.length) return;

    const match = summary.roles.find(
      (r) => normalizeRoleKey(r.roleName) === normalizeRoleKey(roleParam)
    );
    if (!match) return; // wait for summary to load, or role truly doesn't exist

    roleFilterAppliedRef.current = true;
    setSelectedRoles([match.roleName]); // use the EXACT roleName the API returns
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, summary]);

  useEffect(() => () => { if (pinTimerRef.current) clearTimeout(pinTimerRef.current); }, []);

  const handleChangeRole = (user: User) => {
    router.push(`/admin/users/${user.id}/change-role`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 bg-[#f8fafc] flex-1 min-h-0 flex flex-col overflow-hidden">

      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 shrink-0">
          {successMessage}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">User Management</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            View and search all users in the system.
          </p>
        </div>
        <div className="self-start sm:self-auto shrink-0">
          <button
            onClick={() => router.push("/admin/users/add")}
            onMouseEnter={() => router.prefetch("/admin/users/add")}
            className="inline-flex items-center gap-2 h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-sm"
          >
            <Plus size={15} />
            Add User
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col flex-1 min-h-0">

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 border-b shrink-0">
          <h2 className="text-sm sm:text-base font-semibold text-gray-800 flex items-center gap-2">
            User Management
            <span className="text-[11px] font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
              {summary?.filteredUsers ?? 0}
            </span>
          </h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <RoleFilterDropdown
                roleCounts={roles}
                selectedRoles={selectedRoles}
                onChange={setSelectedRoles}
              />
              <StatusFilterDropdown
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </div>
            <div className="relative w-full sm:w-44">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name ..."
                className="h-10 w-full pl-9 pr-3 text-sm border border-gray-200 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="w-full h-full overflow-x-auto flex-1 min-h-0">
          {loading ? (
            <TableBodySkeleton columns={5} rows={5} />
          ) : (
            <UsersTable
              users={users}
              highlightedUserId={highlightedId}
              onChangeRole={handleChangeRole}
            />
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 border-t shrink-0 text-xs sm:text-sm text-gray-500">
          <span>
            {isSearchMode
              ? users.length === 0
                ? ""
                : `${users.length} result${users.length !== 1 ? "s" : ""} for "${search}"`
              : !summary
                ? "Loading…"
                : users.length === 0
                  ? ""
                  : `Showing ${(page - 1) * limit + 1} to ${Math.min(page * limit, summary.filteredUsers)} of ${summary.filteredUsers} users`}
          </span>
          {!isSearchMode && (
            <div className="flex items-center gap-3 self-center sm:self-auto">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Rows</span>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="h-7 px-2 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                >
                  {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <UsersPagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6"><TableSkeleton columns={5} rows={5} /></div>}>
      <UserManagementPage />
    </Suspense>
  );
}