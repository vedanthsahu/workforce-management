// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import {
//   ArrowLeft,
//   CheckCircle2,
// } from "lucide-react";

// import { useAmenityForm } from "../hooks/useAmenityForm";

// export default function AmenityForm() {
//   const router = useRouter();

//   const {
//     loading,
//     formData,
//     preferences,
//     handleChange,
//     handleSubmit,
//   } = useAmenityForm();

//   const [successMessage, setSuccessMessage] =
//     useState("");

//   const isFormValid =
//     formData.amenity_name.trim() &&
//     formData.description.trim() &&
//     formData.category_id;

//   const handleSave = async () => {
//     if (!isFormValid) return;

//     const success = await handleSubmit();

//     if (success) {
//       setSuccessMessage(
//         "Amenity added successfully!"
//       );

//       setTimeout(() => {
//         router.push("/admin/amenities");
//       }, 1000);
//     }
//   };

//   const inputClass =
//     "w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-150";

//   const selectClass =
//     "w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-150 cursor-pointer";

//   const labelClass =
//     "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

//   return (
//     <div >

//       {/* BACK BUTTON */}
//       <button
//         onClick={() =>
//           router.push("/admin/amenities")
//         }
//         className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 mb-5 transition-colors"
//       >
//         <ArrowLeft size={14} />
//         Back to Amenities
//       </button>

//       {/* SUCCESS MESSAGE */}
//       {successMessage && (
//         <div className="mb-4 flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3.5 py-2.5 rounded-lg text-sm">
//           <CheckCircle2
//             size={15}
//             className="shrink-0"
//           />
//           {successMessage}
//         </div>
//       )}

//       {/* HEADER */}
//       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">

//         <div>
//           <h1 className="text-lg font-semibold text-gray-900 leading-tight">
//             Add Amenity
//           </h1>

//           <p className="text-xs text-gray-500 mt-0.5">
//             Create a new amenity available for seat assignment.
//           </p>
//         </div>

//         <div className="flex items-center gap-2 sm:shrink-0">

//           <button
//             onClick={() =>
//               router.push("/admin/amenities")
//             }
//             className="h-8 px-4 text-xs font-medium border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
//           >
//             Cancel
//           </button>

//           <button
//             onClick={handleSave}
//             disabled={
//               !isFormValid || loading
//             }
//             className={`h-8 px-4 text-xs font-medium rounded-lg text-white transition-all ${
//               isFormValid && !loading
//                 ? "bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-200"
//                 : "bg-gray-200 text-gray-400 cursor-not-allowed"
//             }`}
//           >
//             {loading
//               ? "Saving..."
//               : "Save Amenity"}
//           </button>

//         </div>

//       </div>

//       {/* FORM CARD */}
//       <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

//         {/* SECTION HEADER */}
//         <div className="px-5 py-4 border-b border-gray-100">
//           <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
//             Basic Information
//           </p>
//         </div>

//         <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">

//           {/* AMENITY NAME */}
//           <div>
//             <label className={labelClass}>
//               Amenity Name
//               <span className="text-red-400 normal-case tracking-normal font-normal">
//                 {" "}*
//               </span>
//             </label>

//             <input
//               value={formData.amenity_name}
//               onChange={(e) =>
//                 handleChange(
//                   "amenity_name",
//                   e.target.value
//                 )
//               }
//               placeholder="e.g. High Speed Wi-Fi"
//               className={inputClass}
//             />

//             <p className="text-[11px] text-gray-400 mt-1">
//               Example: High Speed Wi-Fi
//             </p>
//           </div>

//           {/* CATEGORY */}
//           <div>
//             <label className={labelClass}>
//               Category
//               <span className="text-red-400 normal-case tracking-normal font-normal">
//                 {" "}*
//               </span>
//             </label>

//             <select
//               value={formData.category_id}
//               onChange={(e) =>
//                 handleChange(
//                   "category_id",
//                   e.target.value
//                 )
//               }
//               className={selectClass}
//             >
//               <option value="">
//                 Select Category
//               </option>

//               {[
//                 ...new Map(
//                   preferences.map(
//                     (item) => [
//                       item.category,
//                       item,
//                     ]
//                   )
//                 ).values(),
//               ].map((item) => (
//                 <option
//                   key={item.id}
//                   value={item.id}
//                 >
//                   {item.category}
//                 </option>
//               ))}
//             </select>

//             <p className="text-[11px] text-gray-400 mt-1">
//               Select the most relevant category
//             </p>
//           </div>

//           {/* DESCRIPTION */}
//           <div className="sm:col-span-2">
//             <label className={labelClass}>
//               Description
//               <span className="text-red-400 normal-case tracking-normal font-normal">
//                 {" "}*
//               </span>
//             </label>

//             <textarea
//               rows={4}
//               value={formData.description}
//               onChange={(e) =>
//                 handleChange(
//                   "description",
//                   e.target.value
//                 )
//               }
//               placeholder="Briefly describe this amenity"
//               className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-150 resize-none"
//             />

//             <p className="text-[11px] text-gray-400 mt-1">
//               Briefly describe what this amenity provides
//             </p>
//           </div>

//           {/* STATUS */}
//           <div className="sm:col-span-2">
//             <label className={labelClass}>
//               Status
//             </label>

//             <select
//               value={
//                 formData.is_active
//                   ? "ACTIVE"
//                   : "INACTIVE"
//               }
//               onChange={(e) =>
//                 handleChange(
//                   "is_active",
//                   e.target.value ===
//                     "ACTIVE"
//                 )
//               }
//               className={selectClass}
//             >
//               <option value="ACTIVE">
//                 Active
//               </option>

//               <option value="INACTIVE">
//                 Inactive
//               </option>
//             </select>

//             <p className="text-[11px] text-gray-400 mt-1">
//               Inactive amenities will not be available for selection
//             </p>
//           </div>

//         </div>

//       </div>

//       {/* FOOTER NOTE */}
//       <p className="mt-3 text-[11px] text-gray-400 text-center">
//         Fields marked{" "}
//         <span className="text-red-400">
//           *
//         </span>{" "}
//         are required
//       </p>

//     </div>
//   );
// }


"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { useAmenityForm } from "../hooks/useAmenityForm";

export default function AmenityForm() {
  const router = useRouter();

  const {
    loading,
    formData,
    preferences,
    handleChange,
    handleSubmit,
  } = useAmenityForm();

  const [successMessage, setSuccessMessage] =
    useState("");

  const isFormValid =
    formData.amenity_name.trim() &&
    formData.description.trim() &&
    formData.category_id;

  const handleSave = async () => {
    if (!isFormValid) return;

    const success = await handleSubmit();

    if (success) {
      setSuccessMessage(
        "Amenity added successfully!"
      );

      setTimeout(() => {
        router.push("/admin/amenities");
      }, 1000);
    }
  };

  const inputClass =
    "w-full h-12 px-4 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

  const labelClass =
    "block text-sm font-medium text-gray-700 mb-2";

  return (
    <div className="bg-[#f8fafc] min-h-screen">

      {/* BACK BUTTON */}
      <button
        onClick={() =>
          router.push("/admin/amenities")
        }
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-black mb-6"
      >
        <ArrowLeft size={18} />
        Back to Amenities
      </button>

      {/* SUCCESS MESSAGE */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">
          {successMessage}
        </div>
      )}

      {/* HEADER */}
      <div className="flex justify-between items-start mb-8">

        <div>
          <h1 className="text-3xl font-semibold text-gray-900">
            Add Amenity
          </h1>

          <p className="text-sm text-gray-500 mt-2">
            Create a new amenity to make it available in your workspace.
          </p>
        </div>

        <div className="flex gap-3">

          <button
            onClick={() =>
              router.push("/admin/amenities")
            }
            className="h-11 px-5 border border-gray-300 rounded-xl bg-white hover:bg-gray-50 transition"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={
              !isFormValid || loading
            }
            className={`h-11 px-5 rounded-xl text-white transition ${
              isFormValid
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            {loading
              ? "Saving..."
              : "Save Amenity"}
          </button>

        </div>

      </div>

      {/* FORM CARD */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* AMENITY NAME */}
          <div>
            <label className={labelClass}>
              Amenity Name
              <span className="text-red-500">
                {" "}*
              </span>
            </label>

            <input
              value={formData.amenity_name}
              onChange={(e) =>
                handleChange(
                  "amenity_name",
                  e.target.value
                )
              }
              placeholder="Enter amenity name"
              className={inputClass}
            />

            <p className="text-xs text-gray-500 mt-2">
              Example: High Speed Wi-Fi
            </p>
          </div>

          {/* CATEGORY */}
          <div>
            <label className={labelClass}>
              Category
              <span className="text-red-500">
                {" "}*
              </span>
            </label>

            <select
              value={formData.category_id}
              onChange={(e) =>
                handleChange(
                  "category_id",
                  e.target.value
                )
              }
              className={inputClass}
            >
              <option value="">
                Select category
              </option>

              {[
                ...new Map(
                  preferences.map((item) => [
                    item.category,
                    item,
                  ])
                ).values(),
              ].map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.category}
                </option>
              ))}
            </select>

            <p className="text-xs text-gray-500 mt-2">
              Select the most relevant category
            </p>
          </div>

         

          {/* STATUS */}
          <div className="md:col-span-2">
            <label className={labelClass}>
              Status
              <span className="text-red-500">
                {" "}*
              </span>
            </label>

            <select
              value={
                formData.is_active
                  ? "ACTIVE"
                  : "INACTIVE"
              }
              onChange={(e) =>
                handleChange(
                  "is_active",
                  e.target.value ===
                    "ACTIVE"
                )
              }
              className={inputClass}
            >
              <option value="ACTIVE">
                Active
              </option>

              <option value="INACTIVE">
                Inactive
              </option>
            </select>

            <p className="text-xs text-gray-500 mt-2">
              Inactive amenities will not be available for selection
            </p>
          </div>

           {/* DESCRIPTION */}
          <div className="md:col-span-2">
            <label className={labelClass}>
              Description
              <span className="text-red-500">
                {" "}*
              </span>
            </label>

            <textarea
              rows={5}
              value={formData.description}
              onChange={(e) =>
                handleChange(
                  "description",
                  e.target.value
                )
              }
              placeholder="Enter short description"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <p className="text-xs text-gray-500 mt-2">
              Briefly describe what this amenity provides
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}