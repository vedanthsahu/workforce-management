"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFloorForm } from "../hooks/useFloorForm";

export default function FloorForm() {
  const router = useRouter();

  const {
    loading,
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

  const inputClass =
    "w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-150";

  const selectClass =
    "w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-150 cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed";

  const labelClass =
    "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-clip p-4 sm:p-6 space-y-4 sm:space-y-6 bg-[#f8fafc]">

      <Link
        href="/admin/floors"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 mb-5 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Floors
      </Link>

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 leading-tight">Add Floor</h1>
          <p className="text-xs text-gray-500 mt-0.5">Create a new floor for the selected building.</p>
        </div>

        <div className="flex items-center gap-2 sm:shrink-0">
          <Link
            href="/admin/floors"
            className="h-9 px-4 text-sm font-medium border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all inline-flex items-center"
          >
            Cancel
          </Link>
          <button
            onClick={saveFloor}
            onMouseEnter={() => router.prefetch("/admin/floors")}
            disabled={isDisabled || loading}
            className={`h-9 px-4 text-sm font-medium rounded-lg text-white transition-all ${
              !isDisabled && !loading
                ? "bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-200"
                : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            {loading ? "Saving..." : "Save Floor"}
          </button>
        </div>
      </div>

      {/* CARD */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Basic Information</p>
        </div>

        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* SITE */}
          <div>
            <label className={labelClass}>
              Site <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
            </label>
            <select
              value={formData.site_id}
              onChange={(e) => handleChange("site_id", e.target.value)}
              className={selectClass}
            >
              <option value="">Select Site</option>
              {sites.map((site) => (
                <option key={site.site_id} value={site.site_id}>
                  {site.site_name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 mt-1">Select the office/site</p>
          </div>

          {/* BUILDING */}
          <div>
            <label className={labelClass}>
              Building <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
            </label>
            <select
              value={formData.building_id}
              disabled={!formData.site_id}
              onChange={(e) => handleChange("building_id", e.target.value)}
              className={selectClass}
            >
              <option value="">Select Building</option>
              {buildings.map((building) => (
                <option key={building.building_id} value={building.building_id}>
                  {building.building_name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 mt-1">Select the building</p>
          </div>

          {/* FLOOR CODE */}
          <div>
            <label className={labelClass}>
              Floor Code <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
            </label>
            <input
              value={formData.floor_code}
              onChange={(e) => handleChange("floor_code", e.target.value)}
              placeholder="Enter floor code"
              className={inputClass}
            />
            <p className="text-[11px] text-gray-400 mt-1">Example: FLR-01</p>
          </div>

          {/* FLOOR NAME */}
          <div>
            <label className={labelClass}>
              Floor Name <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
            </label>
            <input
              value={formData.floor_name}
              onChange={(e) => handleChange("floor_name", e.target.value)}
              placeholder="Enter floor name"
              className={inputClass}
            />
            <p className="text-[11px] text-gray-400 mt-1">Example: Ground Floor</p>
          </div>

          {/* STATUS */}
          <div>
            <label className={labelClass}>Status</label>
            <select
              value={formData.status}
              onChange={(e) => handleChange("status", e.target.value)}
              className={selectClass}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
            <p className="text-[11px] text-gray-400 mt-1">
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
