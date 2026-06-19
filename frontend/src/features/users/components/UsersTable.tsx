// "use client";

// import { getRoleBadgeClass } from "../utils/users.utils";
// import UserRowMenu from "./UserRowMenu";
// import type { User } from "../types/users.types";

// type Props = {
//   users: User[];
//   highlightedUserId?: string | null;
//   onChangeRole: (user: User) => void;
// };

// export default function UsersTable({ users, highlightedUserId, onChangeRole }: Props) {
//   return (
//     <div className="w-full overflow-x-auto">
//       <table className="w-full text-left">
//         <thead>
//           <tr className="border-b bg-gray-50/60">
//             <th className="py-2.5 px-4 text-xs font-semibold text-gray-500 whitespace-nowrap">Name</th>
//             <th className="py-2.5 px-4 text-xs font-semibold text-gray-500 whitespace-nowrap">Email</th>
//             <th className="py-2.5 px-4 text-xs font-semibold text-gray-500 whitespace-nowrap">Current Role</th>
//             <th className="py-2.5 px-4 text-xs font-semibold text-gray-500 whitespace-nowrap">Status</th>
//             <th className="py-2.5 px-4 text-xs font-semibold text-gray-500 whitespace-nowrap">Action</th>
//           </tr>
//         </thead>
//         <tbody>
//           {users.length === 0 && (
//             <tr>
//               <td colSpan={5} className="py-8 text-center text-sm text-gray-400">
//                 No users found.
//               </td>
//             </tr>
//           )}

//           {users.map((user) => (
//             <tr
//               key={user.id}
//               className={`border-b last:border-0 hover:bg-gray-50/60 transition-colors ${
//                 highlightedUserId === user.id ? "bg-indigo-50/40" : ""
//               }`}
//             >
//               <td className="py-3 px-4">
//                 <div className="flex items-center gap-2.5">
//                   <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-[11px] font-semibold text-indigo-700 shrink-0">
//                     {initialsFor(user.fullName)}
//                   </div>
//                   <span className="text-sm font-medium text-gray-900">{user.fullName}</span>
//                 </div>
//               </td>
//               <td className="py-3 px-4 text-sm text-gray-600">{user.email}</td>
//               <td className="py-3 px-4">
//                 <span
//                   className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ring-1 ${getRoleBadgeClass(
//                     user.currentRole
//                   )}`}
//                 >
//                   {user.currentRole}
//                 </span>
//               </td>
//               <td className="py-3 px-4">
//                 <span
//                   className={`inline-flex items-center gap-1.5 text-sm font-medium ${
//                     user.status === "active" ? "text-emerald-600" : "text-gray-400"
//                   }`}
//                 >
//                   <span className="w-1.5 h-1.5 rounded-full bg-current" />
//                   {user.status === "active" ? "Active" : "Inactive"}
//                 </span>
//               </td>
//               <td className="py-3 px-4">
//                 <div className="flex items-center justify-end gap-3">
//                   <button
//                     type="button"
//                     onClick={() => onChangeRole(user)}
//                     className="text-sm font-medium text-blue-600 hover:underline"
//                   >
//                     View
//                   </button>
//                   <UserRowMenu onChangeRole={() => onChangeRole(user)} />
//                 </div>
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }

// function initialsFor(name: string): string {
//   const parts = name.trim().split(/\s+/);
//   const first = parts[0]?.[0] ?? "";
//   const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
//   return (first + last).toUpperCase();
// }

"use client";

import { getRoleBadgeClass } from "../utils/users.utils";
import UserRowMenu from "./UserRowMenu";
import type { User } from "../types/users.types";

type Props = {
  users: User[];
  highlightedUserId?: string | null;
  onChangeRole: (user: User) => void;
};

export default function UsersTable({ users, highlightedUserId, onChangeRole }: Props) {
  if (users.length === 0) {
    return <p className="px-6 py-12 text-center text-gray-400 text-sm">No users found.</p>;
  }

  return (
    <>
      <style>{`
        @keyframes highlight-fade {
          0%   { background-color: #eff6ff; }
          60%  { background-color: #eff6ff; }
          100% { background-color: transparent; }
        }
        .row-highlight { animation: highlight-fade 3s ease forwards; }
      `}</style>

      <div className="w-full overflow-x-auto">
        <table className="w-full text-left">
          <thead className="text-xs text-gray-500 bg-gray-50 border-b sticky top-0 z-10">
            <tr>
              <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Name</th>
              <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Email</th>
              <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Current Role</th>
              <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Status</th>
              <th className="py-2.5 px-4 font-semibold whitespace-nowrap text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => {
              const isHighlighted = user.id === highlightedUserId;
              return (
                <tr
                  key={user.id}
                  className={isHighlighted ? "row-highlight" : "hover:bg-gray-50/60 transition-colors"}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-[11px] font-semibold text-indigo-700 shrink-0">
                        {initialsFor(user.fullName)}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{user.fullName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{user.email}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ring-1 ${getRoleBadgeClass(
                        user.currentRole
                      )}`}
                    >
                      {user.currentRole}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                        user.status === "active" ? "text-emerald-600" : "text-gray-400"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {user.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-3">
                      {/* placeholder for now — not clickable */}
                      <span className="text-sm font-medium text-gray-400 cursor-default select-none">
                        View
                      </span>
                      <UserRowMenu onChangeRole={() => onChangeRole(user)} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}