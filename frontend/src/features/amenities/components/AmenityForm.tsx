"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

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
    formData.amenity_key.trim() &&
    formData.amenity_name.trim() &&
    formData.description.trim() &&
    formData.icon_name.trim();

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
      <div className="flex items-start justify-between mb-8">

        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Add Amenity
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Create a new amenity available for seat assignment.
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

          {/* AMENITY KEY */}
          {/* <div>
            <label className={labelClass}>
              Amenity Key
              <span className="text-red-500">
                {" "}*
              </span>
            </label>

            <input
              value={formData.amenity_key}
              onChange={(e) =>
                handleChange(
                  "amenity_key",
                  e.target.value
                )
              }
              placeholder="WINDOW_SEAT"
              className={inputClass}
            />
          </div> */}

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
              placeholder="Window Seat"
              className={inputClass}
            />
          </div>

          {/* ICON */}
          {/* <div>
            <label className={labelClass}>
              Icon Name
              <span className="text-red-500">
                {" "}*
              </span>
            </label>

            <input
              value={formData.icon_name}
              onChange={(e) =>
                handleChange(
                  "icon_name",
                  e.target.value
                )
              }
              placeholder="window"
              className={inputClass}
            />
          </div> */}

          {/* CATEGORY */}
          <div>
            <label className={labelClass}>
              Category
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
                Select Category
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
          </div>

          {/* STATUS */}
          <div>
            <label className={labelClass}>
              Status
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
                ACTIVE
              </option>

              <option value="INACTIVE">
                INACTIVE
              </option>
            </select>
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
              placeholder="Enter amenity description"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

          </div>

        </div>

      </div>

    </div>
  );
}