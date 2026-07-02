// "use client";

// import { useEffect, useRef } from "react";
// import { AlertTriangle, Check, ChevronDown, X } from "lucide-react";
// import { useRoleChange } from "../hooks/useRoleChange";
// import { getRoleBadgeClass, formatDate } from "../utils/users.utils";
// import type { RoleKey, User } from "../types/users.types";

// type Props = {
//   userId: string | null;
//   onClose: () => void;
//   onSuccess: (user: User, newRole: RoleKey) => void;
// };

// const ROLE_CHANGE_CONSEQUENCES = [
//   "Update user permissions",
//   "Invalidate existing sessions",
//   "Force the user to login again",
// ];

// export default function ChangeRoleModal({ userId, onClose, onSuccess }: Props) {
//   const overlayRef = useRef<HTMLDivElement>(null);

//   const {
//     user,
//     loading,
//     roles,
//     step,
//     selectedRole,
//     setSelectedRole,
//     hasChanged,
//     submitting,
//     errorMessage,
//     goToConfirm,
//     backToSelect,
//     confirmRoleChange,
//   } = useRoleChange(userId);

//   // Close on Escape
//   useEffect(() => {
//     const handler = (e: KeyboardEvent) => {
//       if (e.key === "Escape") onClose();
//     };
//     document.addEventListener("keydown", handler);
//     return () => document.removeEventListener("keydown", handler);
//   }, [onClose]);

//   // Lock body scroll while open
//   useEffect(() => {
//     if (!userId) return;
//     document.body.style.overflow = "hidden";
//     return () => {
//       document.body.style.overflow = "";
//     };
//   }, [userId]);

//   if (!userId) return null;

//   const handleOverlayClick = (e: React.MouseEvent) => {
//     if (e.target === overlayRef.current) onClose();
//   };

//   const handleConfirm = async () => {
//     if (!user || !selectedRole) return;
//     const success = await confirmRoleChange();
//     if (success) onSuccess(user, selectedRole);
//   };

//   return (
//     <div
//       ref={overlayRef}
//       onClick={handleOverlayClick}
//       className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
//     >
//       <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4 max-h-[85vh] overflow-y-auto">
//         {loading && (
//           <div className="py-10 text-center text-sm text-gray-400">Loading user…</div>
//         )}

//         {!loading && !user && (
//           <div className="space-y-3">
//             <p className="text-sm text-red-600">{errorMessage ?? "User not found."}</p>
//             <button
//               type="button"
//               onClick={onClose}
//               className="text-sm font-medium text-gray-600 hover:text-gray-800"
//             >
//               Close
//             </button>
//           </div>
//         )}

//         {!loading && user && step === "select" && (
//           <>
//             {/* HEADER */}
//             <div className="flex items-start justify-between gap-2">
//               <div>
//                 <p className="text-xs text-gray-400 mb-1">User Profile</p>
//                 <p className="text-sm font-semibold text-gray-900">{user.fullName}</p>
//                 <p className="text-xs text-gray-400">{user.email}</p>
//               </div>
//               <button
//                 type="button"
//                 onClick={onClose}
//                 className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
//               >
//                 <X size={16} />
//               </button>
//             </div>

//             {/* PROFILE DETAILS */}
//             <div className="grid grid-cols-2 gap-y-3 text-sm border-t pt-3">
//               <div>
//                 <p className="text-xs text-gray-400">Department</p>
//                 <p className="font-medium text-gray-800">{user.department}</p>
//               </div>
//               <div>
//                 <p className="text-xs text-gray-400">Employee ID</p>
//                 <p className="font-medium text-gray-800">{user.employeeId}</p>
//               </div>
//               <div>
//                 <p className="text-xs text-gray-400">Status</p>
//                 <span
//                   className={`inline-flex items-center gap-1.5 font-medium ${
//                     user.status === "active" ? "text-emerald-600" : "text-gray-400"
//                   }`}
//                 >
//                   <span className="w-1.5 h-1.5 rounded-full bg-current" />
//                   {user.status === "active" ? "Active" : "Inactive"}
//                 </span>
//               </div>
//               <div>
//                 <p className="text-xs text-gray-400">Joined On</p>
//                 <p className="font-medium text-gray-800">{formatDate(user.joinedOn)}</p>
//               </div>
//             </div>

//             {/* CURRENT ROLE */}
//             <div className="rounded-lg bg-gray-50 p-3 border">
//               <div className="flex items-center gap-2">
//                 <span className="text-xs text-gray-500">Current Role</span>
//                 <span
//                   className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ring-1 ${getRoleBadgeClass(
//                     user.currentRole
//                   )}`}
//                 >
//                   {user.currentRole}
//                 </span>
//               </div>
//               <p className="text-[11px] text-gray-400 mt-1">
//                 Assigned on: {formatDate(user.roleAssignedOn)}
//               </p>
//             </div>

//             {/* PERMISSIONS */}
//             <div>
//               <p className="text-xs font-medium text-gray-500 mb-2">
//                 Assigned Permissions ({user.permissions.length})
//               </p>
//               <ul className="space-y-1.5">
//                 {user.permissions.map((perm, i) => (
//                   <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
//                     <Check size={14} className="text-emerald-500 mt-0.5 shrink-0" />
//                     {perm}
//                   </li>
//                 ))}
//               </ul>
//             </div>

//             {/* CHANGE ROLE */}
//             <div className="pt-3 border-t">
//               <p className="text-xs font-medium text-gray-500 mb-1.5">Select Role</p>
//               <div className="relative">
//                 <select
//                   value={selectedRole ?? ""}
//                   onChange={(e) => setSelectedRole(e.target.value as RoleKey)}
//                   className="w-full appearance-none h-9 px-3 pr-8 text-sm border rounded-md bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
//                 >
//                   {roles.map((r) => (
//                     <option key={r} value={r}>
//                       {r}
//                     </option>
//                   ))}
//                 </select>
//                 <ChevronDown
//                   size={14}
//                   className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
//                 />
//               </div>
//             </div>

//             {/* ACTIONS */}
//             <div className="flex gap-3 pt-2">
//               <button
//                 type="button"
//                 onClick={onClose}
//                 className="flex-1 h-9 rounded-md border text-sm font-medium text-gray-700 hover:bg-gray-50"
//               >
//                 Cancel
//               </button>
//               <button
//                 type="button"
//                 disabled={!hasChanged}
//                 onClick={goToConfirm}
//                 className="flex-1 h-9 rounded-md bg-blue-600 hover:bg-blue-700 text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed"
//               >
//                 Save Role
//               </button>
//             </div>
//           </>
//         )}

//         {!loading && user && step === "confirm" && selectedRole && (
//           <>
//             {/* WARNING ICON */}
//             <div className="flex items-start justify-between">
//               <div className="w-full flex flex-col items-center">
//                 <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
//                   <AlertTriangle size={22} className="text-amber-500" />
//                 </div>
//               </div>
//               <button
//                 type="button"
//                 onClick={onClose}
//                 className="absolute right-5 top-5 p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
//               >
//                 <X size={16} />
//               </button>
//             </div>

//             <h3 className="text-center text-base font-semibold text-gray-900">
//               Confirm Role Change
//             </h3>

//             <p className="text-sm text-gray-600">
//               You are changing <span className="font-semibold text-gray-900">{user.fullName}</span>&apos;s role:
//             </p>

//             {/* FROM -> TO */}
//             <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3 border">
//               <div className="flex-1">
//                 <p className="text-xs text-gray-400">From:</p>
//                 <span
//                   className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ring-1 mt-1 ${getRoleBadgeClass(
//                     user.currentRole
//                   )}`}
//                 >
//                   {user.currentRole}
//                 </span>
//               </div>
//               <span className="text-gray-300">→</span>
//               <div className="flex-1">
//                 <p className="text-xs text-gray-400">To:</p>
//                 <span
//                   className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ring-1 mt-1 ${getRoleBadgeClass(
//                     selectedRole
//                   )}`}
//                 >
//                   {selectedRole}
//                 </span>
//               </div>
//             </div>

//             {/* CONSEQUENCES */}
//             <div>
//               <p className="text-sm font-medium text-gray-700 mb-2">This will:</p>
//               <ul className="space-y-1.5">
//                 {ROLE_CHANGE_CONSEQUENCES.map((item) => (
//                   <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
//                     <Check size={14} className="text-emerald-500 shrink-0" />
//                     {item}
//                   </li>
//                 ))}
//               </ul>
//             </div>

//             {errorMessage && (
//               <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
//                 {errorMessage}
//               </div>
//             )}

//             {/* ACTIONS */}
//             <div className="flex gap-3 pt-2">
//               <button
//                 type="button"
//                 onClick={backToSelect}
//                 disabled={submitting}
//                 className="flex-1 h-9 rounded-md border text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
//               >
//                 Cancel
//               </button>
//               <button
//                 type="button"
//                 onClick={handleConfirm}
//                 disabled={submitting}
//                 className="flex-1 h-9 rounded-md bg-red-600 hover:bg-red-700 text-sm font-medium text-white disabled:opacity-50"
//               >
//                 {submitting ? "Saving…" : "Confirm Change"}
//               </button>
//             </div>
//           </>
//         )}
//       </div>
//     </div>
//   );
// }