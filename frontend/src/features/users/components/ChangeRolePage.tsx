// "use client";

// import { useEffect } from "react";
// import { useRouter } from "next/navigation";
// import { ArrowLeft } from "lucide-react";
// import { useRoleChange } from "../hooks/useRoleChange";
// import UserProfileCard from "./UserProfileCard";
// import ChangeRolePanel from "./ChangeRolePanel";
// import ConfirmRoleChangeModal from "./ConfirmRoleChangeModal";
// import { ChangeRoleSkeleton } from "./ChangeRoleSkeleton";

// export default function ChangeRolePage({ userId }: { userId: string }) {
//   const router = useRouter();

//   const {
//     user, loading, notFound,
//     roles, selectedRole, setSelectedRole, hasChanged,
//     confirmOpen, openConfirm, closeConfirm,
//     submitting, errorMessage, confirmRoleChange,
//   } = useRoleChange(userId);

//   useEffect(() => {
//     router.prefetch("/admin/users");
//   }, [router]);

//   // "Confirm Change" -> save, close this page, go back to the list with the
//   // params it needs to pin + highlight the row and show the success banner.
//   const handleConfirm = async () => {
//     const success = await confirmRoleChange();
//     if (success && selectedRole) {
//       router.push(`/admin/users?roleChanged=${userId}&newRole=${selectedRole}`);
//     }
//   };

//   return (
//     <div className="p-4 sm:p-6 bg-[#f8fafc] min-h-screen">
//       <button
//         type="button"
//         onClick={() => router.push("/admin/users")}
//         onMouseEnter={() => router.prefetch("/admin/users")}
//         className="flex items-center gap-2 text-sm text-gray-600 hover:text-black mb-5"
//       >
//         <ArrowLeft size={16} />
//         Back to User Management
//       </button>

//       {loading && <ChangeRoleSkeleton />}
//       {!loading && notFound && <div className="text-sm text-red-600">{errorMessage ?? "User not found."}</div>}

//       {!loading && user && (
//         <>
//           <div className="mb-5">
//             <h1 className="text-lg sm:text-xl font-semibold text-gray-900">User Profile / Role Assignment</h1>
//             <p className="text-xs sm:text-sm text-gray-500 mt-1">View user details, current permissions and change role.</p>
//           </div>

//           <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-4xl">
//             <UserProfileCard user={user} />
//             <ChangeRolePanel
//               roles={roles}
//               selectedRole={selectedRole}
//               setSelectedRole={setSelectedRole}
//               hasChanged={hasChanged}
//               onSave={openConfirm}
//               onCancel={() => router.push("/admin/users")}
//             />
//           </div>

//           <ConfirmRoleChangeModal
//             open={confirmOpen}
//             user={user}
//             newRole={selectedRole}
//             submitting={submitting}
//             errorMessage={errorMessage}
//             onCancel={closeConfirm}
//             onConfirm={handleConfirm}
//           />
//         </>
//       )}
//     </div>
//   );
// }


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
    if (success && selectedRole) {
      router.push(`/admin/users?roleChanged=${userId}&newRole=${selectedRole}`);
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-[#f8fafc] min-h-screen">
      <button
        type="button"
        onClick={() => router.push("/admin/users")}
        onMouseEnter={() => router.prefetch("/admin/users")}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-black mb-5"
      >
        <ArrowLeft size={16} />
        Back to User Management
      </button>

      {loading && <ChangeRoleSkeleton />}
      {!loading && notFound && <div className="text-sm text-red-600">{errorMessage ?? "User not found."}</div>}

      {!loading && user && (
        <>
          <div className="mb-5">
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900">User Profile / Role Assignment</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">View user details, current permissions and change role.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-4xl">
            <UserProfileCard user={user} />
            <ChangeRolePanel
              roles={roles}
              selectedRole={selectedRole}
              setSelectedRole={setSelectedRole}
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