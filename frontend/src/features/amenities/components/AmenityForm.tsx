"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAmenityForm } from "../hooks/useAmenityForm";
import ApplicableSeatTypesSelect from "./ApplicableSeatTypesSelect";

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
    handleSeatTypesChange,
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

  // Same visual chrome as <Input> (components/ui/input.tsx) -- kept as a class
  // string instead of the component itself because this is a native <select>.
  const selectClass =
    "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none cursor-pointer focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50";

  // Shared field-label look across all "Add" forms (Office, Building, Floor, Amenity).
  const labelClass = "text-xs font-semibold text-gray-500 uppercase tracking-wide";

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-clip p-4 sm:p-6 bg-[#f7f8fa]">

      {errorMessage && (
        <div className="mb-4 flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-lg text-sm">
          <AlertCircle size={15} className="shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Add Amenity</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Create a new amenity to make it available in your workspace.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:shrink-0">
          <Button
            variant="outline"
            className="h-9 px-4 rounded-lg"
            onClick={() => router.push("/admin/amenities")}
            onMouseEnter={() => router.prefetch("/admin/amenities")}
          >
            Cancel
          </Button>

          <Button
            className="h-9 px-4 rounded-lg"
            onClick={handleSave}
            disabled={!isFormValid || loading}
          >
            {loading ? "Saving..." : "Save Amenity"}
          </Button>
        </div>
      </div>

      {/* FORM CARD */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">

        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Basic Information
          </p>
        </div>

        <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* AMENITY NAME */}
            <div className="space-y-1.5">
              <Label className={labelClass}>
                Amenity Name <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
              </Label>
              <Input
                value={formData.amenity_name}
                onChange={(e) => handleChange("amenity_name", e.target.value)}
                placeholder="Enter amenity name"
              />
              <p className="text-[11px] text-gray-400">Example: High Speed Wi-Fi</p>
            </div>

            {/* CATEGORY */}
            <div className="space-y-1.5">
              <Label className={labelClass}>
                Category <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
              </Label>
              <select
                value={formData.category_id}
                onChange={(e) => handleChange("category_id", e.target.value)}
                className={selectClass}
              >
                <option value="" disabled hidden>Select category</option>
                {categories.map((category) => (
                  <option key={category.category_id} value={category.category_id}>
                    {category.category_name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400">Select the most relevant category</p>
            </div>

            {/* DESCRIPTION */}
            <div className="md:col-span-2 space-y-1.5">
              <Label className={labelClass}>
                Description <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
              </Label>
              <Textarea
                rows={3}
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Enter short description"
                className="resize-none"
              />
              <p className="text-[11px] text-gray-400">
                Briefly describe what this amenity provides
              </p>
            </div>

            {/* STATUS */}
            <div className="space-y-1.5">
              <Label className={labelClass}>
                Status <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
              </Label>
              <select
                value={formData.is_active ? "ACTIVE" : "INACTIVE"}
                onChange={(e) => handleChange("is_active", e.target.value === "ACTIVE")}
                className={selectClass}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
              <p className="text-[11px] text-gray-400">
                Inactive amenities will not be available for selection
              </p>
            </div>

            {/* APPLICABLE SEAT TYPES */}
            <div className="space-y-1.5">
              <Label className={labelClass}>Applicable Space Types</Label>
              <ApplicableSeatTypesSelect
                value={formData.applicable_seat_types}
                onChange={handleSeatTypesChange}
              />
              <p className="text-[11px] text-gray-400">
                Leave unselected to show this amenity for every space type
              </p>
            </div>

        </div>

      </div>

      <p className="mt-3 text-[11px] text-gray-400 text-center">
        Fields marked <span className="text-red-400">*</span> are required
      </p>

    </div>
  );
}
