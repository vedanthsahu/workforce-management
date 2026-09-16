import { Briefcase, Building2, Hash, MapPin, Phone, type LucideIcon } from "lucide-react";
import { getRoleBadgeClass } from "../utils/users.utils";
import type { User } from "../types/users.types";

export default function UserProfileCard({ user }: { user: User }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 sm:p-6 flex flex-col gap-5 h-full">

      {/* Avatar + name */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-linear-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-base font-bold text-white shrink-0 shadow-sm">
          {initialsFor(user.fullName)}
        </div>
        <div className="min-w-0">
          <p className="text-base font-semibold text-gray-900 truncate">{user.fullName}</p>
          <p className="text-sm text-gray-500 truncate">{user.email}</p>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 border-t border-gray-100 pt-5">
        <Field icon={Building2} label="Department" value={user.department} />
        <Field icon={Hash} label="Employee ID" value={user.employeeId ?? "—"} />
        <Field icon={Briefcase} label="Job Title" value={user.jobTitle} />
        <Field icon={Phone} label="Mobile Phone" value={user.mobilePhone} />
        <Field icon={MapPin} label="Work Location" value={user.officeLocation ?? "—"} />
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

function Field({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-indigo-500" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800 leading-snug truncate" title={value}>{value}</p>
      </div>
    </div>
  );
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}
