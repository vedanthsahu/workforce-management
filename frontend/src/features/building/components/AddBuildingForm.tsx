"use client";

import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBuildingForm } from "../hooks/useBuildingForm";

export default function AddBuildingForm() {
  const router = useRouter();
  const { loading, sites, formData, handleChange, handleSubmit } = useBuildingForm();

  const [errorMessage, setErrorMessage] = useState("");

  const isFormValid =
    formData.site_id > 0 &&
    formData.building_code.trim() &&
    formData.building_name.trim();

  const handleSave = async () => {
    if (!isFormValid) return;
    setErrorMessage("");

    try {
      const result = await handleSubmit();
      setTimeout(() => {
        router.push(`/admin/building?success=true&building_id=${result.building_id}`);
      }, 300);
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      const serverMessage = axios.isAxiosError(error)
        ? error.response?.data?.message
        : undefined;

      if (status === 409) {
        setErrorMessage(
          serverMessage || "A building with this code already exists."
        );
      } else {
        setErrorMessage("Something went wrong. Please try again.");
      }
    }
  };

  // Same visual chrome as <Input> (components/ui/input.tsx) -- kept as a class
  // string instead of the component itself because this is a native <select>.
  const selectClass =
    "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none cursor-pointer focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50";

  // Shared field-label look across all "Add" forms (Office, Building, Floor, Amenity).
  const labelClass = "text-xs font-semibold text-gray-500 uppercase tracking-wide";

  // Read-only, derived fields (office/building/floor codes) share this look so
  // it's visually obvious they can't be typed into.
  const readOnlyInputClass = "bg-gray-50 text-gray-500 cursor-not-allowed";

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-clip p-4 sm:p-6 bg-[#f7f8fa]">

      {/* ERROR BANNER */}
      {errorMessage && (
        <div className="mb-4 flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-lg text-sm">
          <AlertCircle size={15} className="shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Add Building</h1>
          <p className="text-xs text-gray-500 mt-0.5">Fill in the details to create a new building.</p>
        </div>

        <div className="flex items-center gap-2 sm:shrink-0">
          <Button
            variant="outline"
            className="h-9 px-4 rounded-lg"
            onClick={() => router.push("/admin/building")}
          >
            Cancel
          </Button>
          <Button
            className="h-9 px-4 rounded-lg"
            onClick={handleSave}
            onMouseEnter={() => router.prefetch("/admin/building")}
            disabled={!isFormValid || loading}
          >
            {loading ? "Saving..." : "Save Building"}
          </Button>
        </div>
      </div>

      {/* CARD */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Basic Information</p>
        </div>

        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div className="space-y-1.5">
            <Label className={labelClass}>
              Office Name <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
            </Label>
            <select
              value={formData.site_id || ""}
              onChange={(e) => {
                setErrorMessage("");
                handleChange("site_id", Number(e.target.value));
              }}
              className={selectClass}
            >
              <option value="" disabled hidden>Select Office</option>
              {sites.map((site) => (
                <option key={site.site_id} value={site.site_id}>{site.site_name}</option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400">Select the office where this building belongs</p>
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>
              Building Name <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
            </Label>
            <Input
              value={formData.building_name}
              onChange={(e) => {
                setErrorMessage("");
                handleChange("building_name", e.target.value);
              }}
              placeholder="e.g. Roxana Towers"
            />
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>
              Building Code <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
            </Label>
            <Input
              value={formData.building_code}
              readOnly
              placeholder="Auto-generated from office + building name"
              className={readOnlyInputClass}
            />
            <p className="text-[11px] text-gray-400">Auto-generated from the office and building name</p>
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>Status</Label>
            <select
              value={formData.status}
              onChange={(e) => handleChange("status", e.target.value)}
              className={selectClass}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

        </div>
      </div>

      <p className="mt-3 text-[11px] text-gray-400 text-center">
        Fields marked <span className="text-red-400">*</span> are required
      </p>

    </div>
  );
}