"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { useState } from "react";
import axios from "axios";
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

  const inputClass =
    "w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-150";

  const selectClass =
    "w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-150 cursor-pointer";

  const labelClass =
    "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-clip p-4 sm:p-6 space-y-4 sm:space-y-6 bg-[#f8fafc]">

      <Link
        href="/admin/building"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 mb-5 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Buildings
      </Link>

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
          <h1 className="text-lg font-semibold text-gray-900 leading-tight">Add Building</h1>
          <p className="text-xs text-gray-500 mt-0.5">Fill in the details to create a new building.</p>
        </div>

        <div className="flex items-center gap-2 sm:shrink-0">
          <Link
            href="/admin/building"
            className="h-8 px-4 text-xs font-medium border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all inline-flex items-center"
          >
            Cancel
          </Link>
          <button
            onClick={handleSave}
            onMouseEnter={() => router.prefetch("/admin/building")}
            disabled={!isFormValid || loading}
            className={`h-8 px-4 text-xs font-medium rounded-lg text-white transition-all ${
              isFormValid && !loading
                ? "bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-200"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {loading ? "Saving..." : "Save Building"}
          </button>
        </div>
      </div>

      {/* CARD */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Basic Information</p>
        </div>

        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div>
            <label className={labelClass}>
              Site Name <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
            </label>
            <select
              value={formData.site_id || ""}
              onChange={(e) => {
                setErrorMessage("");
                handleChange("site_id", Number(e.target.value));
              }}
              className={selectClass}
            >
              <option value="">Select Site</option>
              {sites.map((site) => (
                <option key={site.site_id} value={site.site_id}>{site.site_name}</option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 mt-1">Select the office where this building belongs</p>
          </div>

          <div>
            <label className={labelClass}>
              Building Code <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
            </label>
            <input
              value={formData.building_code}
              onChange={(e) => {
                setErrorMessage("");
                handleChange("building_code", e.target.value);
              }}
              placeholder="e.g. HYD-BEG-ROX"
              className={inputClass}
            />
            <p className="text-[11px] text-gray-400 mt-1">Unique code for this building</p>
          </div>

          <div>
            <label className={labelClass}>
              Building Name <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
            </label>
            <input
              value={formData.building_name}
              onChange={(e) => {
                setErrorMessage("");
                handleChange("building_name", e.target.value);
              }}
              placeholder="e.g. Roxana Towers"
              className={inputClass}
            />
          </div>

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
          </div>

        </div>
      </div>

      <p className="mt-3 text-[11px] text-gray-400 text-center">
        Fields marked <span className="text-red-400">*</span> are required
      </p>

    </div>
  );
}