"use client";

import { X } from "lucide-react";

import { Building } from "../types/building.types";
import { useEditBuilding } from "../hooks/useEditBuilding";

type Props = {
  building: Building;
  open: boolean;
  onClose: () => void;
  onSuccess: (buildingId: string) => void;
};

export default function EditBuildingModal({
  building,
  open,
  onClose,
  onSuccess,
}: Props) {
  const {
    loading,
    formData,
    handleChange,
    handleUpdate,
  } = useEditBuilding(
    building,
    onSuccess
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">

      {/* MODAL */}
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* HEADER */}
        <div className="flex items-center justify-between border-b px-6 py-5">

          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Edit Building
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Update building details and save changes.
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
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">

          {/* BUILDING NAME */}
          <div className="space-y-2">

            <label className="text-sm font-medium text-gray-700">
              Building Name
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
              className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter building name"
            />

          </div>

          {/* STATUS */}
          <div className="space-y-2">

            <label className="text-sm font-medium text-gray-700">
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