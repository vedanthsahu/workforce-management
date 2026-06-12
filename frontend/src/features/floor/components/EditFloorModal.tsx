"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";

import { Floor } from "../types/floor.types";
import { useEditFloor } from "../hooks/useEditFloor";

type Props = {
  floor: Floor;
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
  const { loading, formData, handleChange, handleUpdate } = useEditFloor(floor);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const hasChanges =
    formData.floor_name !== floor.floor_name ||
    formData.status !== floor.status;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!open) return null;

  const statusOptions = ["ACTIVE", "INACTIVE"];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white w-full max-w-xl mx-4 rounded-2xl shadow-xl">

        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-5 border-b">
          <div>
            <h2 className="text-xl font-semibold">Edit Floor</h2>
            <p className="text-sm text-gray-500">Update floor details.</p>
          </div>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-5">

          {/* Floor Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Floor Name</label>
            <input
              value={formData.floor_name}
              onChange={(e) => handleChange("floor_name", e.target.value)}
              className="w-full border rounded-xl px-4 py-3 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status — Custom Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Status</label>

            <div ref={dropdownRef} className="relative w-full">

              {/* Trigger — exact same styling as input above */}
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="w-full border rounded-xl px-4 py-3 text-sm text-left
                           bg-white flex items-center justify-between
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span>{formData.status}</span>
                <ChevronDown
                  size={16}
                  className={`text-gray-400 transition-transform duration-200 
                              ${dropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* Options — constrained to exact trigger width */}
              {dropdownOpen && (
                <ul className="absolute z-10 mt-1 w-full bg-white border
                               rounded-xl shadow-lg overflow-hidden">
                  {statusOptions.map((option) => (
                    <li
                      key={option}
                      onClick={() => {
                        handleChange("status", option);
                        setDropdownOpen(false);
                      }}
                      className={`px-4 py-3 text-sm cursor-pointer
                                  hover:bg-blue-50 transition-colors
                                  ${formData.status === option
                                    ? "bg-blue-50 text-blue-600 font-medium"
                                    : "text-gray-700"
                                  }`}
                    >
                      {option}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="px-5 py-2 border rounded-xl text-sm">
            Cancel
          </button>
          <button
            disabled={loading || !hasChanges}
            onClick={async () => {
              const success = await handleUpdate();
              if (success) { onSuccess(); onClose(); }
            }}
            className={`px-5 py-2 rounded-xl text-sm text-white ${
              loading || !hasChanges
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            Save Changes
          </button>
        </div>

      </div>
    </div>
  );
}
