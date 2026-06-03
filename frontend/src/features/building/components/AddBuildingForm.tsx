"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
        router.push(
          "/admin/building"
        );
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
          router.push(
            "/admin/building"
          )
        }
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-black mb-6"
      >
        <ArrowLeft size={18} />
        Back to Buildings
      </button>

      {/* SUCCESS */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">
          {successMessage}
        </div>
      )}

      {/* HEADER */}
      <div className="flex items-start justify-between mb-8">

        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Add Building
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Create a new building
            under a selected office.
          </p>
        </div>

        <div className="flex gap-3">

          <button
            onClick={() =>
              router.push(
                "/admin/building"
              )
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
              : "Save Building"}
          </button>

        </div>

      </div>

      {/* FORM CARD */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* SITE NAME */}
          <div>
            <label className={labelClass}>
              Site Name
              <span className="text-red-500">
                {" "}*
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
              className={inputClass}
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
          </div>

          {/* BUILDING CODE */}
          <div>
            <label className={labelClass}>
              Building Code
              <span className="text-red-500">
                {" "}*
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
              placeholder="HYD-BEG-ROX"
              className={inputClass}
            />
          </div>

          {/* BUILDING NAME */}
          <div>
            <label className={labelClass}>
              Building Name
              <span className="text-red-500">
                {" "}*
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
              placeholder="Roxana Towers"
              className={inputClass}
            />
          </div>

          {/* STATUS */}
          <div>
            <label className={labelClass}>
              Status
            </label>

            <select
              value={
                formData.status
              }
              onChange={(e) =>
                handleChange(
                  "status",
                  e.target.value
                )
              }
              className={inputClass}
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

    </div>
  );
}