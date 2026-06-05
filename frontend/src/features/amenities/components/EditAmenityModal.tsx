
"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { Amenity } from "../types/amenities.types";
import { useEditAmenity } from "../hooks/useEditAmenity";

type Props = {
  amenity: Amenity;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function EditAmenityModal({
  amenity,
  open,
  onClose,
  onSuccess,
}: Props) {
  const {
    loading,
    formData,
    categories,
    handleChange,
    handleUpdate,
  } = useEditAmenity(
    amenity,
    onSuccess
  );
  const [successMessage, setSuccessMessage] =
  useState("");

  if (!open) return null;

  


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">

      {/* MODAL */}
      <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">

        {/* HEADER */}
        <div className="flex items-center justify-between px-8 py-6 border-b">

          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              Edit Amenity
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Update amenity details and save changes.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
          >
            <X
              size={18}
              className="text-gray-500"
            />
          </button>

        </div>
{successMessage && (
  <div className="mx-8 mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
    ✅ {successMessage}
  </div>
)}
        {/* BODY */}
       <div className="p-8 overflow-y-auto flex-1">

          {/* SECTION TITLE */}
          {/* <div className="mb-6 pb-4 border-b">
            <h3 className="text-xs font-semibold tracking-widest uppercase text-gray-400">
              Basic Information
            </h3>
          </div> */}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* AMENITY NAME */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amenity Name{" "}
                <span className="text-red-500">
                  *
                </span>
              </label>

              <input
                value={
                  formData.amenity_name
                }
                onChange={(e) =>
                  handleChange(
                    "amenity_name",
                    e.target.value
                  )
                }
                className="w-full h-11 rounded-lg border border-gray-300 px-4 text-sm"
                placeholder="Enter amenity name"
              />

              <p className="text-xs text-gray-400 mt-2">
                Example: High Speed Wi-Fi
              </p>
            </div>

            {/* CATEGORY */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category{" "}
                <span className="text-red-500">
                  *
                </span>
              </label>

              <select
                value={
                  formData.category_id
                }
                onChange={(e) =>
                  handleChange(
                    "category_id",
                    e.target.value
                  )
                }
                className="w-full h-11 rounded-lg border border-gray-300 px-4 text-sm"
              >
                <option value="">
                  Select Category
                </option>

                {categories.map(
                  (category) => (
                    <option
                      key={
                        category.category_id
                      }
                      value={
                        category.category_id
                      }
                    >
                      {
                        category.category_name
                      }
                    </option>
                  )
                )}
              </select>

              <p className="text-xs text-gray-400 mt-2">
                Select the most relevant
                category
              </p>
            </div>

            {/* DESCRIPTION */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description{" "}
                <span className="text-red-500">
                  *
                </span>
              </label>

              <textarea
                rows={5}
                value={
                  formData.description
                }
                onChange={(e) =>
                  handleChange(
                    "description",
                    e.target.value
                  )
                }
                className="w-full h-min rounded-lg border border-gray-300 px-4 py-3 text-sm resize-none"
                placeholder="Enter short description"
              />

              <p className="text-xs text-gray-400 mt-2">
                Briefly describe what
                this amenity provides
              </p>
            </div>

            {/* STATUS */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status{" "}
                <span className="text-red-500">
                  *
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
                className="w-full h-11 rounded-lg border border-gray-300 px-4 text-sm"
              >
                <option value="ACTIVE">
                  Active
                </option>

                <option value="INACTIVE">
                  Inactive
                </option>
              </select>

              <p className="text-xs text-gray-400 mt-2">
                Inactive amenities
                will not be available
                for selection
              </p>
            </div>

          </div>

        </div>

        {/* FOOTER */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 px-8 py-5 border-t bg-gray-50">

          <button
            onClick={onClose}
            className="h-11 px-5 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-100"
          >
            Cancel
          </button>

          <button
            onClick={async () => {

  const success =
  await handleUpdate();

if (success) {
  setSuccessMessage(
    "Amenity updated successfully"
  );

  setTimeout(() => {
    setSuccessMessage("");
    onSuccess();
    onClose();
  }, 1200);
}
}}

// onClick={async () => {
//   await handleUpdate();
//   onClose();
// }}
            disabled={loading}
            className="h-11 px-5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading
              ? "Saving..."
              : "Save Changes"}
          </button>

        </div>

      </div>

    </div>
  );
}