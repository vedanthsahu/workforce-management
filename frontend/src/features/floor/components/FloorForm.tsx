"use client";

import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFloorForm } from "../hooks/useFloorForm";

export default function FloorForm() {
  const router = useRouter();

  const {
    loading,
    errorMessage,
    sites,
    buildings,
    formData,
    handleChange,
    handleSubmit,
  } = useFloorForm();

  const isDisabled =
    !formData.site_id ||
    !formData.building_id ||
    !formData.floor_code ||
    !formData.floor_name;

  const saveFloor = async () => {
    if (isDisabled) return;

    const floorId = await handleSubmit();

    if (floorId) {
      router.push(`/admin/floors?added=${floorId}`);
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

      {errorMessage && (
        <div className="mb-4 flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-lg text-sm">
          <AlertCircle size={15} className="shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Add Floor</h1>
          <p className="text-xs text-gray-500 mt-0.5">Create a new floor for the selected building.</p>
        </div>

        <div className="flex items-center gap-2 sm:shrink-0">
          <Button
            variant="outline"
            className="h-9 px-4 rounded-lg"
            onClick={() => router.push("/admin/floors")}
          >
            Cancel
          </Button>
          <Button
            className="h-9 px-4 rounded-lg"
            onClick={saveFloor}
            onMouseEnter={() => router.prefetch("/admin/floors")}
            disabled={isDisabled || loading}
          >
            {loading ? "Saving..." : "Save Floor"}
          </Button>
        </div>
      </div>

      {/* CARD */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Basic Information</p>
        </div>

        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* SITE */}
          <div className="space-y-1.5">
            <Label className={labelClass}>
              Office <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
            </Label>
            <select
              value={formData.site_id}
              onChange={(e) => handleChange("site_id", e.target.value)}
              className={selectClass}
            >
              <option value="" disabled hidden >Select Office</option>
              {sites.map((site) => (
                <option key={site.site_id} value={site.site_id}>
                  {site.site_name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400">Select the office where this floor belongs</p>
          </div>

          {/* BUILDING */}
          <div className="space-y-1.5">
            <Label className={labelClass}>
              Building <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
            </Label>
            <select
              value={formData.building_id}
              disabled={!formData.site_id}
              onChange={(e) => handleChange("building_id", e.target.value)}
              className={selectClass}
            >
              <option value="" disabled hidden>Select Building</option>
              {buildings.map((building) => (
                <option key={building.building_id} value={building.building_id}>
                  {building.building_name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400">Select the building where this floor belongs</p>
          </div>

          {/* FLOOR NAME */}
          <div className="space-y-1.5">
            <Label className={labelClass}>
              Floor Name <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
            </Label>
            <Input
              value={formData.floor_name}
              onChange={(e) => handleChange("floor_name", e.target.value)}
              placeholder="e.g. Ground Floor"
            />
            {/* <p className="text-[11px] text-gray-400">Example: Ground Floor</p> */}
          </div>

          {/* FLOOR CODE */}
          <div className="space-y-1.5">
            <Label className={labelClass}>
              Floor Code <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
            </Label>
            <Input
              value={formData.floor_code}
              readOnly
              placeholder="Auto-generated from office + building + floor name"
              className={readOnlyInputClass}
            />
            <p className="text-[11px] text-gray-400">Auto-generated from the office, building, and floor name</p>
          </div>

          {/* STATUS */}
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
            <p className="text-[11px] text-gray-400">
              Inactive floors will not be available for seat allocation
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
