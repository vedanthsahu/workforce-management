
"use client";

import { useState, useEffect } from "react";
import {
  Office,
  UpdateOfficePayload,
} from "../types/office.types";

import { officeService } from "../services/office.service";

import { X } from "lucide-react";

type Props = {
  office: Office;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function EditOfficeModal({
  office,
  open,
  onClose,
  onSuccess,
}: Props) {

const [loading, setLoading] = useState(false);
const [successMessage, setSuccessMessage] = useState("");

 const [formData, setFormData] =
  useState<UpdateOfficePayload>({
    site_name: "",
    city: "",
    country: "",
    timezone: "",
    address_line1: "",
    address_line2: "",
    status: "ACTIVE",
  });

useEffect(() => {
  if (office) {
    setFormData({
      site_name: office.site_name || "",
      city: office.city || "",
      country: office.country || "",
      timezone: office.timezone || "",
      address_line1: office.address_line1 || "",
      address_line2: office.address_line2 || "",
      status: office.status || "ACTIVE",
    });
  }
}, [office]);
  //  INPUT CHANGE
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  //  SUBMIT
  const handleSubmit = async () => {
    try {

      setLoading(true);

      await officeService.updateSite(
  office.site_id,
  formData
);

setSuccessMessage("Office updated successfully");

await onSuccess();

setTimeout(() => {
  setSuccessMessage("");
  onClose();
}, 1300);

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);

    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">

      {/* MODAL */}
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden">

        {/* HEADER */}
        <div className="flex items-center justify-between border-b px-6 py-5">

          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Edit Office
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Update office details and save changes.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
          >
            <X size={18} className="text-gray-500" />
          </button>

        </div>

        {successMessage && (
  <div className="mx-6 mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
    {successMessage}
  </div>
)}

        {/* BODY */}
        <div className="p-6 space-y-5">

          {/* GRID */}
          <div className="grid grid-cols-2 gap-5">

            {/* OFFICE NAME */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Office Name
              </label>

              <input
                name="site_name"
                value={formData.site_name || ""}
                onChange={handleChange}
                className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter office name"
              />
            </div>

            {/* CITY */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                City
              </label>

              <input
                name="city"
                value={formData.city || ""}
                onChange={handleChange}
                className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter city"
              />
            </div>

            {/* COUNTRY */}
            {/* <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Country
              </label>

              <input
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter country"
              />
            </div> */}

            {/* TIMEZONE */}
            {/* <div className="space-y-2">
             <label className="text-sm font-medium text-gray-700">
               Timezone
            </label>

               <input
                 name="timezone"
                 value={formData.timezone}
                onChange={handleChange}
                 className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                 placeholder="Enter timezone"
               />
            </div> */}

          </div>

          {/* ADDRESS */}
          {/* <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Address Line 1
            </label>

            <input
              name="address_line1"
              value={formData.address_line1}
              onChange={handleChange}
              className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter address"
            />
          </div> */}

          {/* STATUS */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Status
            </label>

            <select
              name="status"
              // value={formData.status}
              value={formData.status || "ACTIVE"}
              onChange={handleChange}
              className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
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
            onClick={handleSubmit}
            disabled={loading}
            className="h-11 rounded-xl bg-blue-600 px-5 text-sm font-medium text-white hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>

        </div>

      </div>
    </div>
  );
}