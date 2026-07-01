"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import UsersTable from "@/features/users/components/UsersTable";
import UsersPagination from "@/features/users/components/UsersPagination";
import { useUsers } from "@/features/users/hooks/useUsers";
import type { User } from "@/features/users/types/users.types";
import { TableSkeleton, TableBodySkeleton } from "@/components/ui/table-skeleton";

const PIN_DURATION = 4000;

function UserManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    users, summary, loading,
    search, setSearch,
    page, setPage, totalPages,
  } = useUsers();

  const [successMessage, setSuccessMessage] = useState("");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const pinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBanner = (message: string) => {
    if (pinTimerRef.current) clearTimeout(pinTimerRef.current);
    setSuccessMessage(message);
    pinTimerRef.current = setTimeout(() => setSuccessMessage(""), PIN_DURATION);
  };

  // ─── Role-change flow: read ?roleChanged=ID&newRole=ROLE after the Change
  // Role page closes and sends us back here ────────────────────────────────
  useEffect(() => {
    const changedId = searchParams.get("roleChanged");
    const newRole = searchParams.get("newRole");
    if (!changedId) return;
    showBanner(`Role changed successfully${newRole ? ` to ${newRole}` : ""}.`);
    setHighlightedId(changedId);
    setPage(1);
    router.replace("/admin/users");
    setTimeout(() => setHighlightedId(null), PIN_DURATION);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ─── Add User flow: read ?added=ID after the Add User page redirects back ─
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

  // Cleanup timer on unmount
  useEffect(() => () => { if (pinTimerRef.current) clearTimeout(pinTimerRef.current); }, []);

  // 3-dot -> "Change Role" -> dedicated page
  const handleChangeRole = (user: User) => {
    router.push(`/admin/users/${user.id}/change-role`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 bg-[#f8fafc] min-h-screen flex flex-col">

      {/* SUCCESS BANNER */}
      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 shrink-0">
          {successMessage}
        </div>
      )}

      {/* HEADER */}
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

      {/* TABLE CARD — flex-1 so it stretches to fill whatever vertical space
          is actually left, instead of guessing a fixed calc(100vh - Npx) */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col flex-1 min-h-0">

        {/* TABLE HEADER */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 border-b shrink-0">
          <h2 className="text-sm sm:text-base font-semibold text-gray-800 flex items-center gap-2">
            User Management
            <span className="text-[11px] font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
              {summary?.totalUsers ?? 0}
            </span>
          </h2>
          <div className="w-full sm:w-auto">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name or email..."
              className="h-9 w-full sm:w-72 px-3 text-sm border rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </div>
        </div>

        {/* TABLE BODY — flex-1 + min-h-0 lets this scroll area grow to fill
            the card; sticky header in UsersTable still works since this is
            still the bounded, scrollable ancestor */}
        <div className="w-full overflow-x-auto overflow-y-auto flex-1 min-h-0">
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

        {/* FOOTER */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 border-t shrink-0 text-xs sm:text-sm text-gray-500">
          <span>
            {summary
              ? `Showing ${summary.filteredUsers === 0 ? 0 : (page - 1) * 10 + 1} to ${Math.min(page * 10, summary.filteredUsers)} of ${summary.filteredUsers} users`
              : "Loading…"}
          </span>
          <div className="self-center sm:self-auto">
            <UsersPagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
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