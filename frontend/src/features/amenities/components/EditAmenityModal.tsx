"use client";

import { X } from "lucide-react";

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
    handleChange,
    handleUpdate,
  } = useEditAmenity(
    amenity,
    onSuccess
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">

      {/* MODAL */}
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden">

        {/* HEADER */}
        <div className="flex items-center justify-between border-b px-6 py-5">

          <div>
            <h2 className="text-xl font-semibold text-gray-900">
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

        {/* BODY */}
        <div className="p-6 space-y-5">

          <div className="grid grid-cols-2 gap-5">

            {/* AMENITY NAME */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Amenity Name
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
                className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter amenity name"
              />
            </div>

            {/* ICON */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Icon Name
              </label>

              <input
                value={
                  formData.icon_name
                }
                onChange={(e) =>
                  handleChange(
                    "icon_name",
                    e.target.value
                  )
                }
                className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="wifi / coffee / monitor"
              />
            </div>

          </div>

          {/* DESCRIPTION */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Description
            </label>

            <textarea
              value={
                formData.description
              }
              onChange={(e) =>
                handleChange(
                  "description",
                  e.target.value
                )
              }
              rows={4}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Enter description"
            />
          </div>

          {/* CATEGORY */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Category ID
            </label>

            <input
              value={
                formData.category_id
              }
              onChange={(e) =>
                handleChange(
                  "category_id",
                  e.target.value
                )
              }
              className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter category id"
            />
          </div>

          {/* STATUS */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
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
              className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

        {/* FOOTER */}
        <div className="flex justify-end gap-3 border-t px-6 py-4 bg-gray-50">

          <button
            onClick={onClose}
            className="h-11 rounded-xl border border-gray-200 px-5 text-sm font-medium hover:bg-gray-100 transition"
          >
            Cancel
          </button>

          <button
            onClick={async () => {
              await handleUpdate();
              onClose();
            }}
            disabled={loading}
            className="h-11 rounded-xl bg-blue-600 px-5 text-sm font-medium text-white hover:bg-blue-700 transition disabled:opacity-50"
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