// "use client";

// import { ChevronDown } from "lucide-react";
// import type { RoleKey } from "../types/users.types";

// type Props = {
//   roles: RoleKey[];
//   selectedRole: RoleKey | null;
//   setSelectedRole: (role: RoleKey) => void;
//   hasChanged: boolean;
//   onSave: () => void;
//   onCancel: () => void;
// };

// export default function ChangeRolePanel({ roles, selectedRole, setSelectedRole, hasChanged, onSave, onCancel }: Props) {
//   return (
//     <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4 h-fit">
//       <h3 className="text-sm font-semibold text-gray-900">Change Role</h3>

//       <div>
//         <p className="text-xs font-medium text-gray-500 mb-1.5">Select Role</p>
//         <div className="relative">
//           <select
//             value={selectedRole ?? ""}
//             onChange={(e) => setSelectedRole(e.target.value as RoleKey)}
//             className="w-full appearance-none h-9 px-3 pr-8 text-sm border rounded-md bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
//           >
//             {roles.map((r) => (
//               <option key={r} value={r}>{r}</option>
//             ))}
//           </select>
//           <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
//         </div>
//       </div>

//       <div className="flex gap-3 pt-2">
//         <button
//           type="button"
//           onClick={onCancel}
//           className="flex-1 h-9 rounded-md border text-sm font-medium text-gray-700 hover:bg-gray-50"
//         >
//           Cancel
//         </button>
//         <button
//           type="button"
//           disabled={!hasChanged}
//           onClick={onSave}
//           className="flex-1 h-9 rounded-md bg-blue-600 hover:bg-blue-700 text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed"
//         >
//           Save Role
//         </button>
//       </div>
//     </div>
//   );
// }




"use client";

import { ChevronDown } from "lucide-react";
import type { RoleKey, UserStatus } from "../types/users.types";

type Props = {
  roles: RoleKey[];
  selectedRole: RoleKey | null;
  setSelectedRole: (role: RoleKey) => void;
  selectedStatus: UserStatus;
  setSelectedStatus: (status: UserStatus) => void;
  hasChanged: boolean;
  onSave: () => void;
  onCancel: () => void;
};

export default function ChangeRolePanel({
  roles, selectedRole, setSelectedRole,
  selectedStatus, setSelectedStatus,
  hasChanged, onSave, onCancel,
}: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4 h-fit">
      <h3 className="text-sm font-semibold text-gray-900">Change Role</h3>

      <div>
        <p className="text-xs font-medium text-gray-500 mb-1.5">Select Role</p>
        <div className="relative">
          <select
            value={selectedRole ?? ""}
            onChange={(e) => setSelectedRole(e.target.value as RoleKey)}
            className="w-full appearance-none h-9 px-3 pr-8 text-sm border rounded-md bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 mb-1.5">Status</p>
        <div className="relative">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as UserStatus)}
            className="w-full appearance-none h-9 px-3 pr-8 text-sm border rounded-md bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 h-9 rounded-md border text-sm font-medium text-gray-700 hover:bg-gray-50">
          Cancel
        </button>
        <button
          type="button"
          disabled={!hasChanged}
          onClick={onSave}
          className="flex-1 h-9 rounded-md bg-blue-600 hover:bg-blue-700 text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save Role
        </button>
      </div>
    </div>
  );
}