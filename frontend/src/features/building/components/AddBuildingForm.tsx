// "use client";

// import { useRouter } from "next/navigation";
// import { ArrowLeft } from "lucide-react";
// import { useState } from "react";

// import { useBuildingForm } from "../hooks/useBuildingForm";

// export default function AddBuildingForm() {
//   const router = useRouter();

//   const {
//     loading,
//     sites,
//     formData,
//     handleChange,
//     handleSubmit,
//   } = useBuildingForm();

//   const [successMessage, setSuccessMessage] =
//     useState("");

//   const isFormValid =
//     formData.site_id > 0 &&
//     formData.building_code.trim() &&
//     formData.building_name.trim();

//   const handleSave = async () => {
//     if (!isFormValid) return;

//     const success = await handleSubmit();

//     if (success) {
//       setSuccessMessage(
//         "Building added successfully!"
//       );

//       setTimeout(() => {
//         router.push(
//           "/admin/building"
//         );
//       }, 1000);
//     }
//   };

//   const inputClass =
//     "w-full h-12 px-4 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

//   const labelClass =
//     "block text-sm font-medium text-gray-700 mb-2";

//   return (
//     <div className="bg-[#f8fafc] min-h-screen">

//       {/* BACK BUTTON */}
//       <button
//         onClick={() =>
//           router.push(
//             "/admin/building"
//           )
//         }
//         className="flex items-center gap-2 text-sm text-gray-600 hover:text-black mb-6"
//       >
//         <ArrowLeft size={18} />
//         Back to Buildings
//       </button>

//       {/* SUCCESS */}
//       {successMessage && (
//         <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">
//           {successMessage}
//         </div>
//       )}

//       {/* HEADER */}
//       <div className="flex items-start justify-between mb-8">

//         <div>
//           <h1 className="text-2xl font-semibold text-gray-900">
//             Add Building
//           </h1>

//           <p className="text-sm text-gray-500 mt-1">
//             Create a new building
//             under a selected office.
//           </p>
//         </div>

//         <div className="flex gap-3">

//           <button
//             onClick={() =>
//               router.push(
//                 "/admin/building"
//               )
//             }
//             className="h-11 px-5 border border-gray-300 rounded-xl bg-white hover:bg-gray-50 transition"
//           >
//             Cancel
//           </button>

//           <button
//             onClick={handleSave}
//             disabled={
//               !isFormValid || loading
//             }
//             className={`h-11 px-5 rounded-xl text-white transition ${
//               isFormValid
//                 ? "bg-blue-600 hover:bg-blue-700"
//                 : "bg-gray-300 cursor-not-allowed"
//             }`}
//           >
//             {loading
//               ? "Saving..."
//               : "Save Building"}
//           </button>

//         </div>

//       </div>

//       {/* FORM CARD */}
//       <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">

//         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

//           {/* SITE NAME */}
//           <div>
//             <label className={labelClass}>
//               Site Name
//               <span className="text-red-500">
//                 {" "}*
//               </span>
//             </label>

//             <select
//               value={
//                 formData.site_id || ""
//               }
//               onChange={(e) =>
//                 handleChange(
//                   "site_id",
//                   Number(
//                     e.target.value
//                   )
//                 )
//               }
//               className={inputClass}
//             >
//               <option value="">
//                 Select Site
//               </option>

//               {sites.map((site) => (
//                 <option
//                   key={site.site_id}
//                   value={site.site_id}
//                 >
//                   {site.site_name}
//                 </option>
//               ))}
//             </select>
//           </div>

//           {/* BUILDING CODE */}
//           <div>
//             <label className={labelClass}>
//               Building Code
//               <span className="text-red-500">
//                 {" "}*
//               </span>
//             </label>

//             <input
//               value={
//                 formData.building_code
//               }
//               onChange={(e) =>
//                 handleChange(
//                   "building_code",
//                   e.target.value
//                 )
//               }
//               placeholder="HYD-BEG-ROX"
//               className={inputClass}
//             />
//           </div>

//           {/* BUILDING NAME */}
//           <div>
//             <label className={labelClass}>
//               Building Name
//               <span className="text-red-500">
//                 {" "}*
//               </span>
//             </label>

//             <input
//               value={
//                 formData.building_name
//               }
//               onChange={(e) =>
//                 handleChange(
//                   "building_name",
//                   e.target.value
//                 )
//               }
//               placeholder="Roxana Towers"
//               className={inputClass}
//             />
//           </div>

//           {/* STATUS */}
//           <div>
//             <label className={labelClass}>
//               Status
//             </label>

//             <select
//               value={
//                 formData.status
//               }
//               onChange={(e) =>
//                 handleChange(
//                   "status",
//                   e.target.value
//                 )
//               }
//               className={inputClass}
//             >
//               <option value="ACTIVE">
//                 ACTIVE
//               </option>

//               <option value="INACTIVE">
//                 INACTIVE
//               </option>
//             </select>
//           </div>

//         </div>

//       </div>

//     </div>
//   );
// }

"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useState } from "react";

import { useBuildingForm } from "../hooks/useBuildingForm";

export default function AddBuildingForm() {
  const router = useRouter();

  const {
    loading,
    sites,
    formData,
    handleChange,
    handleSubmit,
  } = useBuildingForm();

  const [successMessage, setSuccessMessage] =
    useState("");

  const isFormValid =
    formData.site_id > 0 &&
    formData.building_code.trim() &&
    formData.building_name.trim();

  const handleSave = async () => {
    if (!isFormValid) return;

    const success = await handleSubmit();

    if (success) {
      setSuccessMessage(
        "Building added successfully!"
      );

      setTimeout(() => {
        router.push("/admin/building");
      }, 1000);
    }
  };

  const inputClass =
    "w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-150";

  const selectClass =
    "w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-150 cursor-pointer";

  const labelClass =
    "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div className="p-6 space-y-6 bg-[#f8fafc] min-h-screen">

      {/* BACK */}
      <button
        onClick={() =>
          router.push("/admin/building")
        }
        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 mb-5 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Buildings
      </button>

      {/* SUCCESS */}
      {successMessage && (
        <div className="mb-4 flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3.5 py-2.5 rounded-lg text-sm">
          <CheckCircle2
            size={15}
            className="shrink-0"
          />
          {successMessage}
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">

        <div>
          <h1 className="text-lg font-semibold text-gray-900 leading-tight">
            Add Building
          </h1>

          <p className="text-xs text-gray-500 mt-0.5">
            Fill in the details to create a new building.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:shrink-0">

          <button
            onClick={() =>
              router.push("/admin/building")
            }
            className="h-8 px-4 text-xs font-medium border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={
              !isFormValid || loading
            }
            className={`h-8 px-4 text-xs font-medium rounded-lg text-white transition-all ${
              isFormValid &&
              !loading
                ? "bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-200"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {loading
              ? "Saving..."
              : "Save Building"}
          </button>

        </div>

      </div>

      {/* CARD */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">

        {/* SECTION HEADER */}
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Basic Information
          </p>
        </div>

        {/* FORM */}
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* SITE */}
          <div>
            <label className={labelClass}>
              Site Name{" "}
              <span className="text-red-400 normal-case tracking-normal font-normal">
                *
              </span>
            </label>

            <select
              value={
                formData.site_id || ""
              }
              onChange={(e) =>
                handleChange(
                  "site_id",
                  Number(
                    e.target.value
                  )
                )
              }
              className={selectClass}
            >
              <option value="">
                Select Site
              </option>

              {sites.map((site) => (
                <option
                  key={site.site_id}
                  value={site.site_id}
                >
                  {site.site_name}
                </option>
              ))}
            </select>

            <p className="text-[11px] text-gray-400 mt-1">
              Select the office where this building belongs
            </p>
          </div>

          {/* CODE */}
          <div>
            <label className={labelClass}>
              Building Code{" "}
              <span className="text-red-400 normal-case tracking-normal font-normal">
                *
              </span>
            </label>

            <input
              value={
                formData.building_code
              }
              onChange={(e) =>
                handleChange(
                  "building_code",
                  e.target.value
                )
              }
              placeholder="e.g. HYD-BEG-ROX"
              className={inputClass}
            />

            <p className="text-[11px] text-gray-400 mt-1">
              Unique code for this building
            </p>
          </div>

          {/* BUILDING NAME */}
          <div>
            <label className={labelClass}>
              Building Name{" "}
              <span className="text-red-400 normal-case tracking-normal font-normal">
                *
              </span>
            </label>

            <input
              value={
                formData.building_name
              }
              onChange={(e) =>
                handleChange(
                  "building_name",
                  e.target.value
                )
              }
              placeholder="e.g. Roxana Towers"
              className={inputClass}
            />
          </div>

          {/* STATUS */}
          <div>
            <label className={labelClass}>
              Status
            </label>

            <select
              value={formData.status}
              onChange={(e) =>
                handleChange(
                  "status",
                  e.target.value
                )
              }
              className={selectClass}
            >
              <option value="ACTIVE">
                ACTIVE
              </option>

              <option value="INACTIVE">
                INACTIVE
              </option>
            </select>
          </div>

        </div>

      </div>

      <p className="mt-3 text-[11px] text-gray-400 text-center">
        Fields marked{" "}
        <span className="text-red-400">
          *
        </span>{" "}
        are required
      </p>

    </div>
  );
}