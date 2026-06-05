// "use client";

// import Link from "next/link";
// import { useRouter } from "next/navigation";

// import { useFloorForm } from "../hooks/useFloorForm";

// export default function FloorForm() {
//   const router = useRouter();

//   const {
//     loading,
//     sites,
//     buildings,
//     formData,
//     handleChange,
//     handleSubmit,
//   } = useFloorForm();

//   const isDisabled =
//     !formData.site_id ||
//     !formData.building_id ||
//     !formData.floor_code ||
//     !formData.floor_name;

//   const saveFloor = async () => {
//     const success =
//       await handleSubmit();

//     if (success) {
//       router.push(
//         "/admin/floors"
//       );
//     }
//   };

//   return (
//     <div className="space-y-6">

//       {/* HEADER */}
//       <div className="flex items-start justify-between">
//         <div>
//           <Link
//             href="/admin/floors"
//             className="text-sm text-gray-500 hover:text-gray-700"
//           >
//             ← Back to Floors
//           </Link>

//           <h1 className="text-4xl font-bold text-gray-900 mt-4">
//             Add Floor
//           </h1>

//           <p className="text-gray-500 mt-2">
//             Enter the floor details below
//             to create a new floor.
//           </p>
//         </div>

//         <div className="flex gap-3">
//           <Link
//             href="/admin/floors"
//             className="px-5 py-2 border rounded-xl text-sm"
//           >
//             Cancel
//           </Link>

//           <button
//             disabled={
//               isDisabled || loading
//             }
//             onClick={saveFloor}
//             className={`px-5 py-2 rounded-xl text-sm font-medium ${
//               isDisabled
//                 ? "bg-gray-300 text-white cursor-not-allowed"
//                 : "bg-blue-600 text-white hover:bg-blue-700"
//             }`}
//           >
//             Save Floor
//           </button>
//         </div>
//       </div>

//       {/* FORM CARD */}
//       <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">

//         <div className="px-6 py-4 border-b bg-gray-50">
//           <h3 className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
//             Basic Information
//           </h3>
//         </div>

//         <div className="p-6 space-y-6">

//           {/* ROW 1 */}
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

//             {/* SITE */}
//             <div>
//               <label className="block text-sm font-medium mb-2">
//                 Site *
//               </label>

//               <select
//                 value={
//                   formData.site_id
//                 }
//                 onChange={(e) =>
//                   handleChange(
//                     "site_id",
//                     e.target.value
//                   )
//                 }
//                 className="w-full border rounded-xl px-4 py-3"
//               >
//                 <option value="">
//                   Select Site
//                 </option>

//                 {sites.map(
//                   (site: any) => (
//                     <option
//                       key={
//                         site.site_id
//                       }
//                       value={
//                         site.site_id
//                       }
//                     >
//                       {
//                         site.site_name
//                       }
//                     </option>
//                   )
//                 )}
//               </select>
//             </div>

//             {/* BUILDING */}
//             <div>
//               <label className="block text-sm font-medium mb-2">
//                 Building *
//               </label>

//               <select
//                 value={
//                   formData.building_id
//                 }
//                 disabled={
//                   !formData.site_id
//                 }
//                 onChange={(e) =>
//                   handleChange(
//                     "building_id",
//                     e.target.value
//                   )
//                 }
//                 className="w-full border rounded-xl px-4 py-3"
//               >
//                 <option value="">
//                   Select Building
//                 </option>

//                 {buildings.map(
//                   (
//                     building: any
//                   ) => (
//                     <option
//                       key={
//                         building.building_id
//                       }
//                       value={
//                         building.building_id
//                       }
//                     >
//                       {
//                         building.building_name
//                       }
//                     </option>
//                   )
//                 )}
//               </select>
//             </div>

//             {/* FLOOR CODE */}
//             <div>
//               <label className="block text-sm font-medium mb-2">
//                 Floor Code *
//               </label>

//               <input
//                 value={
//                   formData.floor_code
//                 }
//                 onChange={(e) =>
//                   handleChange(
//                     "floor_code",
//                     e.target.value
//                   )
//                 }
//                 placeholder="Enter floor code"
//                 className="w-full border rounded-xl px-4 py-3"
//               />
//             </div>
//           </div>

//           {/* ROW 2 */}
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

//             {/* FLOOR NAME */}
//             <div>
//               <label className="block text-sm font-medium mb-2">
//                 Floor Name *
//               </label>

//               <input
//                 value={
//                   formData.floor_name
//                 }
//                 onChange={(e) =>
//                   handleChange(
//                     "floor_name",
//                     e.target.value
//                   )
//                 }
//                 placeholder="Enter floor name"
//                 className="w-full border rounded-xl px-4 py-3"
//               />
//             </div>

//             {/* STATUS */}
//             <div>
//               <label className="block text-sm font-medium mb-2">
//                 Status *
//               </label>

//               <select
//                 value={
//                   formData.status
//                 }
//                 onChange={(e) =>
//                   handleChange(
//                     "status",
//                     e.target.value
//                   )
//                 }
//                 className="w-full border rounded-xl px-4 py-3"
//               >
//                 <option value="ACTIVE">
//                   ACTIVE
//                 </option>

//                 <option value="INACTIVE">
//                   INACTIVE
//                 </option>
//               </select>
//             </div>
//           </div>

//         </div>
//       </div>
//     </div>
//   );
// }


"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { useFloorForm } from "../hooks/useFloorForm";

export default function FloorForm() {
  const router = useRouter();

  const {
    loading,
    sites,
    buildings,
    formData,
    handleChange,
    handleSubmit,
  } = useFloorForm();

  const [successMessage, setSuccessMessage] =
    useState("");

  const isDisabled =
    !formData.site_id ||
    !formData.building_id ||
    !formData.floor_code ||
    !formData.floor_name;

 const saveFloor = async () => {
  if (isDisabled) return;

  const floorId =
    await handleSubmit();

  if (floorId) {
    setSuccessMessage(
      "Floor added successfully!"
    );

    setTimeout(() => {
      router.push(
        `/admin/floors?added=${floorId}`
      );
    }, 1000);
  }
};

  return (
    <div>

      {/* BACK BUTTON */}
      <button
        onClick={() =>
          router.push("/admin/floors")
        }
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-black mb-6"
      >
        <ArrowLeft size={16} />
        Back to Floors
      </button>

      {/* SUCCESS MESSAGE */}
      {/* {successMessage && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {successMessage}
        </div>
      )} */}

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">

        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Add Floor
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Create a new floor for the selected building.
          </p>
        </div>

        <div className="flex items-center gap-3">

          <button
            onClick={() =>
              router.push("/admin/floors")
            }
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            onClick={saveFloor}
            disabled={
              isDisabled || loading
            }
            className={`px-4 py-2 rounded-lg text-white ${
              !isDisabled
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            {loading
              ? "Saving..."
              : "Save Floor"}
          </button>

        </div>

      </div>

      {/* FORM CARD */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

        {/* SECTION HEADER */}
        <div className="px-6 py-4 border-b">
          <h3 className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
            Basic Information
          </h3>
        </div>

        {/* FORM BODY */}
        <div className="p-6">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* SITE */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Site <span className="text-red-500">*</span>
              </label>

              <select
                value={formData.site_id}
                onChange={(e) =>
                  handleChange(
                    "site_id",
                    e.target.value
                  )
                }
                className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">
                  Select Site
                </option>

                {sites.map(
                  (site: any) => (
                    <option
                      key={site.site_id}
                      value={site.site_id}
                    >
                      {site.site_name}
                    </option>
                  )
                )}
              </select>

              <p className="text-xs text-gray-500 mt-2">
                Select the office/site
              </p>
            </div>

            {/* BUILDING */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Building <span className="text-red-500">*</span>
              </label>

              <select
                value={formData.building_id}
                disabled={
                  !formData.site_id
                }
                onChange={(e) =>
                  handleChange(
                    "building_id",
                    e.target.value
                  )
                }
                className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">
                  Select Building
                </option>

                {buildings.map(
                  (
                    building: any
                  ) => (
                    <option
                      key={
                        building.building_id
                      }
                      value={
                        building.building_id
                      }
                    >
                      {
                        building.building_name
                      }
                    </option>
                  )
                )}
              </select>

              <p className="text-xs text-gray-500 mt-2">
                Select the building
              </p>
            </div>

            {/* FLOOR CODE */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Floor Code <span className="text-red-500">*</span>
              </label>

              <input
                value={
                  formData.floor_code
                }
                onChange={(e) =>
                  handleChange(
                    "floor_code",
                    e.target.value
                  )
                }
                placeholder="Enter floor code"
                className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <p className="text-xs text-gray-500 mt-2">
                Example: FLR-01
              </p>
            </div>

            {/* FLOOR NAME */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Floor Name <span className="text-red-500">*</span>
              </label>

              <input
                value={
                  formData.floor_name
                }
                onChange={(e) =>
                  handleChange(
                    "floor_name",
                    e.target.value
                  )
                }
                placeholder="Enter floor name"
                className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <p className="text-xs text-gray-500 mt-2">
                Example: Ground Floor
              </p>
            </div>

            {/* STATUS */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status <span className="text-red-500">*</span>
              </label>

              <select
                value={formData.status}
                onChange={(e) =>
                  handleChange(
                    "status",
                    e.target.value
                  )
                }
                className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ACTIVE">
                  ACTIVE
                </option>

                <option value="INACTIVE">
                  INACTIVE
                </option>
              </select>

              <p className="text-xs text-gray-500 mt-2">
                Inactive floors will not be available for seat allocation
              </p>
            </div>

          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t bg-gray-50 text-center">
          <p className="text-xs text-gray-400">
            Fields marked{" "}
            <span className="text-red-500">*</span>{" "}
            are required
          </p>
        </div>

      </div>
    </div>
  );
}