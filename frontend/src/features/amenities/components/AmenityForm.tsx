"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { useAmenityForm } from "../hooks/useAmenityForm";

export default function AmenityForm() {
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/admin/amenities");
  }, [router]);

  const {
    loading,
    errorMessage,
    formData,
    categories,
    handleChange,
    handleSubmit,
  } = useAmenityForm();

  const isFormValid =
    formData.amenity_name.trim() &&
    formData.description.trim() &&
    formData.category_id;

  const handleSave = async () => {
    if (!isFormValid) return;

    const newAmenityId = await handleSubmit();

    if (newAmenityId) {
      router.push(`/admin/amenities?added=${newAmenityId}`);
    }
  };

  const inputClass =
    "w-full h-9 px-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500";

  const selectClass =
    "w-full h-9 px-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500";

  const labelClass =
    "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div className="max-w-5xl">

      {errorMessage && (
        <div className="mb-4 flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-lg text-sm">
          <AlertCircle size={15} className="shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Add Amenity</h1>
          <p className="text-[11px] text-gray-400 mt-1">
            Create a new amenity to make it available in your workspace.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin/amenities")}
            onMouseEnter={() => router.prefetch("/admin/amenities")}
            className="h-9 px-4 text-sm font-medium border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={!isFormValid || loading}
            className={`h-9 px-4 text-sm font-medium rounded-lg text-white transition-all ${
              isFormValid && !loading
                ? "bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-200"
                : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            {loading ? "Saving..." : "Save Amenity"}
          </button>
        </div>
      </div>

      {/* FORM CARD */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">

        <div className="px-5 py-3 border-b">
          <h3 className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
            Basic Information
          </h3>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* AMENITY NAME */}
            <div>
              <label className={labelClass}>
                Amenity Name <span className="text-red-400">*</span>
              </label>
              <input
                value={formData.amenity_name}
                onChange={(e) => handleChange("amenity_name", e.target.value)}
                placeholder="Enter amenity name"
                className={inputClass}
              />
              <p className="text-[11px] text-gray-400 mt-1">Example: High Speed Wi-Fi</p>
            </div>

            {/* CATEGORY */}
            <div>
              <label className={labelClass}>
                Category <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => handleChange("category_id", e.target.value)}
                className={selectClass}
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.category_id} value={category.category_id}>
                    {category.category_name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400 mt-1">Select the most relevant category</p>
            </div>

            {/* DESCRIPTION */}
            <div className="md:col-span-2">
              <label className={labelClass}>
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Enter short description"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Briefly describe what this amenity provides
              </p>
            </div>

            {/* STATUS */}
            <div className="md:col-span-2">
              <label className={labelClass}>
                Status <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.is_active ? "ACTIVE" : "INACTIVE"}
                onChange={(e) => handleChange("is_active", e.target.value === "ACTIVE")}
                className={selectClass}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
              <p className="text-[11px] text-gray-400 mt-1">
                Inactive amenities will not be available for selection
              </p>
            </div>

          </div>
        </div>

      </div>

      <p className="mt-3 text-[11px] text-gray-400 text-center">
        Fields marked <span className="text-red-400">*</span> are required
      </p>

    </div>
  );
}
