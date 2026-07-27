

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useRoleChange } from "../hooks/useRoleChange";
import UserProfileCard from "./UserProfileCard";
import ChangeRolePanel from "./ChangeRolePanel";
import ConfirmRoleChangeModal from "./ConfirmRoleChangeModal";
import { ChangeRoleSkeleton } from "./ChangeRoleSkeleton";

export default function ChangeRolePage({ userId }: { userId: string }) {
  const router = useRouter();

  const {
    user, loading, notFound,
    roles, selectedRole, setSelectedRole,
    selectedStatus, setSelectedStatus,
    hasChanged,
    confirmOpen, openConfirm, closeConfirm,
    submitting, errorMessage, confirmRoleChange,
  } = useRoleChange(userId);

  useEffect(() => {
    router.prefetch("/admin/users");
  }, [router]);

  const handleConfirm = async () => {
    const success = await confirmRoleChange();
    if (success && user) {
      const roleDidChange = !!selectedRole && selectedRole !== user.currentRole;
      const statusDidChange = selectedStatus !== user.status;

      const params = new URLSearchParams({ roleChanged: userId });
      if (roleDidChange) params.set("newRole", selectedRole!);
      if (statusDidChange) params.set("newStatus", selectedStatus);

      router.push(`/admin/users?${params.toString()}`);
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-[#f8fafc]">
      {/* <button
        type="button"
        onClick={() => router.push("/admin/users")}
        onMouseEnter={() => router.prefetch("/admin/users")}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-black mb-5"
      >
        <ArrowLeft size={16} />
        Back to User Management
      </button> */}

      {loading && <ChangeRoleSkeleton />}
      {!loading && notFound && <div className="text-sm text-red-600">{errorMessage ?? "User not found."}</div>}

      {!loading && user && (
        <>
          <div className="mb-5">
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900">User Profile / Role Assignment</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">View user details, current permissions and change role.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
            <UserProfileCard user={user} />
            <ChangeRolePanel
              roles={roles}
              currentRole={user.currentRole}
              selectedRole={selectedRole}
              setSelectedRole={setSelectedRole}
              currentStatus={user.status}
              selectedStatus={selectedStatus}
              setSelectedStatus={setSelectedStatus}
              hasChanged={hasChanged}
              onSave={openConfirm}
              onCancel={() => router.push("/admin/users")}
            />
          </div>

          <ConfirmRoleChangeModal
            open={confirmOpen}
            user={user}
            newRole={selectedRole}
            newStatus={selectedStatus}
            submitting={submitting}
            errorMessage={errorMessage}
            onCancel={closeConfirm}
            onConfirm={handleConfirm}
          />
        </>
      )}
    </div>
  );
}