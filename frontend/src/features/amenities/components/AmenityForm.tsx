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
  categories,
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
  <div>

    {/* BACK BUTTON */}
    <button
      onClick={() => router.push("/admin/amenities")}
      className="flex items-center gap-2 text-sm text-gray-600 hover:text-black mb-6"
    >
      <ArrowLeft size={16} />
      Back to Amenities
    </button>

    {/* SUCCESS MESSAGE */}
    {successMessage && (
      <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
        {successMessage}
      </div>
    )}

    {/* HEADER */}
    <div className="flex justify-between items-center mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Add Amenity
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          Create a new amenity to make it available in your workspace.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/admin/amenities")}
          className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
        >
          Cancel
        </button>

        <button
          onClick={handleSave}
          disabled={!isFormValid || loading}
          className={`px-4 py-2 rounded-lg text-white ${
            isFormValid
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-300 cursor-not-allowed"
          }`}
        >
          {loading ? "Saving..." : "Save Amenity"}
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

          {/* AMENITY NAME */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amenity Name <span className="text-red-500">*</span>
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
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <p className="text-xs text-gray-500 mt-2">
              Example: High Speed Wi-Fi
            </p>
          </div>

          {/* CATEGORY */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category <span className="text-red-500">*</span>
            </label>

            {/* <select
              value={formData.category_id}
              onChange={(e) =>
                handleChange(
                  "category_id",
                  e.target.value
                )
              }
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            </select> */}


            <select
  value={formData.category_id}
  onChange={(e) =>
    handleChange(
      "category_id",
      e.target.value
    )
  }
  className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
>
  <option value="">
    Select category
  </option>

  {categories.map((category) => (
    <option
      key={category.category_id}
      value={category.category_id}
    >
      {category.category_name}
    </option>
  ))}
</select>


            <p className="text-xs text-gray-500 mt-2">
              Select the most relevant category
            </p>
          </div>

          {/* DESCRIPTION */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>

            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) =>
                handleChange(
                  "description",
                  e.target.value
                )
              }
              placeholder="Enter short description"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />

            <p className="text-xs text-gray-500 mt-2">
              Briefly describe what this amenity provides
            </p>
          </div>

          {/* STATUS */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status <span className="text-red-500">*</span>
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
                  e.target.value === "ACTIVE"
                )
              }
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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