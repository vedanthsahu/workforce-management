"use client";

import {
  X,
} from "lucide-react";

import { useEditFloor } from "../hooks/useEditFloor";

type Props = {
  floor: any;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function EditFloorModal({
  floor,
  open,
  onClose,
  onSuccess,
}: Props) {

  const {
    loading,
    formData,
    handleChange,
    handleUpdate,
  } = useEditFloor(
    floor,
    onSuccess
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">

      <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl">

        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-5 border-b">
          <div>
            <h2 className="text-xl font-semibold">
              Edit Floor
            </h2>

            <p className="text-sm text-gray-500">
              Update floor details.
            </p>
          </div>

          <button
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-5">

          <div>
            <label className="block text-sm font-medium mb-2">
              Floor Name
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
              className="w-full border rounded-xl px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
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
              className="w-full border rounded-xl px-4 py-3"
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
        <div className="flex justify-end gap-3 px-6 py-4 border-t">

          <button
            onClick={onClose}
            className="px-5 py-2 border rounded-xl"
          >
            Cancel
          </button>

          <button
            disabled={loading}
            onClick={async () => {
              const success =
                await handleUpdate();

              if (success) {
                onSuccess();
                onClose();
              }
            }}
            className="px-5 py-2 rounded-xl bg-blue-600 text-white"
          >
            Save Changes
          </button>

        </div>
      </div>
    </div>
  );
}