
import { getRoleBadgeClass } from "../utils/users.utils";
import type { User } from "../types/users.types";

export default function UserProfileCard({ user }: { user: User }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 sm:p-6 flex flex-col gap-5 h-full">

      {/* Avatar + name */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center text-base font-bold text-white shrink-0 shadow-sm">
          {initialsFor(user.fullName)}
        </div>
        <div className="min-w-0">
          <p className="text-base font-semibold text-gray-900 truncate">{user.fullName}</p>
          <p className="text-sm text-gray-500 truncate">{user.email}</p>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 border-t border-gray-100 pt-5">
        <Field label="Department" value={user.department} />
        <Field label="Employee ID" value={user.employeeId ?? "—"} />
        <Field label="Job Title" value={user.jobTitle} />
        <Field label="Mobile Phone" value={user.mobilePhone} />
      </div>

      {/* Status + Current Role — pushed to bottom */}
      <div className="mt-auto flex flex-col gap-2">
        <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500">Status</span>
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${user.status === "active" ? "text-emerald-600" : "text-gray-400"}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {user.status === "active" ? "Active" : "Inactive"}
          </span>
        </div>
        <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500">Current Role</span>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ring-1 ${getRoleBadgeClass(user.currentRole)}`}>
            {user.currentRole}
          </span>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-medium text-gray-800 leading-snug">{value}</p>
    </div>
  );
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}