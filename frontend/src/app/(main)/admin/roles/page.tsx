// "use client";

// import { useState } from "react";
// import { Plus } from "lucide-react";
// import RolesTable from "@/features/roles/components/RolesTable";
// import RoleDetailPanel from "@/features/roles/components/RoleDetailPanel";
// import { useRoles } from "@/features/roles/hooks/useRoles";
// import type { Role } from "@/features/roles/types/roles.types";

// export default function RoleManagementPage() {
//   const { roles, totalRoles, loading, search, setSearch } = useRoles();

//   const [selectedRole, setSelectedRole] = useState<Role | null>(null);

//   return (
//     <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 bg-[#f8fafc] min-h-screen">

//       {/* HEADER */}
//       <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//         <div>
//           <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Role Management</h1>
//           <p className="text-xs sm:text-sm text-gray-500 mt-1">
//             View all roles, number of users and permissions.
//           </p>
//         </div>
//         <div className="self-start sm:self-auto shrink-0">
//           <button
//             type="button"
//             className="inline-flex items-center gap-2 h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm"
//           >
//             <Plus size={15} />
//             Create Role
//           </button>
//         </div>
//       </div>

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

//         {/* ROLE LIST */}
//         <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
//           <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 border-b shrink-0">
//             <h2 className="text-sm sm:text-base font-semibold text-gray-800 flex items-center gap-2">
//               Role Management
//               <span className="text-[11px] font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
//                 {totalRoles}
//               </span>
//             </h2>
//             <div className="w-full sm:w-auto">
//               <input
//                 value={search}
//                 onChange={(e) => setSearch(e.target.value)}
//                 placeholder="Search roles..."
//                 className="h-9 w-full sm:w-56 px-3 text-sm border rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
//               />
//             </div>
//           </div>

//           <div
//             className="w-full overflow-x-auto overflow-y-auto"
//             style={{ maxHeight: "calc(100vh - 320px)", minHeight: "200px" }}
//           >
//             {loading ? (
//               <div className="p-6 text-sm text-gray-500">Loading...</div>
//             ) : (
//               <RolesTable
//                 roles={roles}
//                 onViewRole={setSelectedRole}
//                 activeRoleKey={selectedRole?.key}
//               />
//             )}
//           </div>

//           <div className="px-4 sm:px-6 py-3 border-t shrink-0 text-xs text-gray-500">
//             Showing 1 to {roles.length} of {totalRoles} roles
//           </div>
//         </div>

//         {/* ROLE DETAIL PANEL */}
//         <div className="lg:col-span-1">
//           {selectedRole ? (
//             <RoleDetailPanel role={selectedRole} onClose={() => setSelectedRole(null)} />
//           ) : (
//             <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex flex-col items-center justify-center text-center gap-2 h-full min-h-[240px]">
//               <p className="text-sm text-gray-400">
//                 Select a role from the list to view its details.
//               </p>
//             </div>
//           )}
//         </div>

//       </div>

//     </div>
//   );
// }

"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import RolesTable from "@/features/roles/components/RolesTable";
import RoleDetailModal from "@/features/roles/components/RoleDetailModal";
import { useRoles } from "@/features/roles/hooks/useRoles";
import type { Role } from "@/features/roles/types/roles.types";

export default function RoleManagementPage() {
  const { roles, totalRoles, loading, search, setSearch } = useRoles();

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 bg-[#f8fafc] flex-1 min-h-0 flex flex-col overflow-hidden">

      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Role Management</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            View all roles, number of users and permissions.
          </p>
        </div>
        <div className="self-start sm:self-auto shrink-0">
          <button
            type="button"
            className="inline-flex items-center gap-2 h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm"
          >
            <Plus size={15} />
            Create Role
          </button>
        </div>
      </div>

      {/* FULL-WIDTH ROLE LIST */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col flex-1 min-h-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 border-b shrink-0">
          <h2 className="text-sm sm:text-base font-semibold text-gray-800 flex items-center gap-2">
            Role Management
            <span className="text-[11px] font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
              {totalRoles}
            </span>
          </h2>
          <div className="w-full sm:w-auto">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search roles..."
              className="h-9 w-full sm:w-56 px-3 text-sm border rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </div>
        </div>

        <div className="w-full h-full overflow-x-auto flex-1 min-h-0">
          {loading ? (
            <div className="p-6 text-sm text-gray-500">Loading...</div>
          ) : (
            <RolesTable roles={roles} onViewRole={setSelectedRole} activeRoleKey={null} />
          )}
        </div>

        <div className="px-4 sm:px-6 py-3 border-t shrink-0 text-xs sm:text-sm text-gray-500">
          {roles.length > 0 && `Showing 1 to ${roles.length} of ${totalRoles} roles`}
        </div>
      </div>

      {/* ROLE DETAIL POPUP — opens on eye-icon click */}
      <RoleDetailModal role={selectedRole} onClose={() => setSelectedRole(null)} />

    </div>
  );
}