"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, CheckCircle2 } from "lucide-react";
import useCreateSite from "../hooks/useCreateSite";

export default function OfficeForm() {
  const router = useRouter();

  const timezones = [
    "Asia/Kolkata",
    ...Intl.supportedValuesOf("timeZone"),
  ]
    .filter((value, index, self) => self.indexOf(value) === index)
    .sort();

  const { createSite, loading } = useCreateSite();

  const [successMessage, setSuccessMessage] = useState("");

  const [formData, setFormData] = useState({
    site_name: "",
    site_code: "",
    city: "",
    country: "",
    timezone: "",
    address_line1: "",
    address_line2: "",
    status: "ACTIVE" as const,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const isFormValid =
    formData.site_name.trim() &&
    formData.site_code.trim() &&
    formData.city.trim() &&
    formData.country.trim() &&
    formData.timezone.trim();

  const handleSave = async () => {
    if (!isFormValid) return;

    try {
      await createSite(formData);
      setSuccessMessage("Office added successfully!");
      setFormData({
        site_name: "",
        site_code: "",
        city: "",
        country: "",
        timezone: "",
        address_line1: "",
        address_line2: "",
        status: "ACTIVE",
      });
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error(error);
    }
  };

  const inputClass =
    "w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-150";

  const selectClass =
    "w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-150 cursor-pointer";

  const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div className="p-4 sm:p-6 bg-[#f7f8fa] min-h-screen overflow-x-hidden">

      {/* BACK BUTTON */}
      <button
        onClick={() => router.push("/admin/offices")}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 mb-5 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Offices
      </button>

      {/* SUCCESS MESSAGE */}
      {successMessage && (
        <div className="mb-4 flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3.5 py-2.5 rounded-lg text-sm">
          <CheckCircle2 size={15} className="shrink-0" />
          {successMessage}
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          {/* <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <Building2 size={15} className="text-white" />
          </div> */}
          <div>
            <h1 className="text-lg font-semibold text-gray-900 leading-tight">Add Office</h1>
            <p className="text-xs text-gray-500 mt-0.5">Fill in the details to create a new office location.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:shrink-0">
          <button
            onClick={() => router.push("/admin/offices")}
            className="h-8 px-4 text-xs font-medium border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isFormValid || loading}
            className={`h-8 px-4 text-xs font-medium rounded-lg text-white transition-all ${
              isFormValid && !loading
                ? "bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-200"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {loading ? "Saving..." : "Save Office"}
          </button>
        </div>
      </div>

      {/* FORM CARD */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

        {/* Section: Basic Info */}
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Basic Information</p>
        </div>
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* OFFICE NAME */}
          <div>
            <label className={labelClass}>
              Office Name <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
            </label>
            <input
              name="site_name"
              value={formData.site_name}
              onChange={handleChange}
              placeholder="e.g. Mumbai HQ"
              className={inputClass}
            />
          </div>

          {/* OFFICE CODE */}
          <div>
            <label className={labelClass}>
              Office Code <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
            </label>
            <input
              name="site_code"
              value={formData.site_code}
              onChange={handleChange}
              placeholder="e.g. MUM-01"
              className={inputClass}
            />
            <p className="text-[11px] text-gray-400 mt-1">Short unique identifier for this office</p>
          </div>

          {/* CITY */}
          <div>
            <label className={labelClass}>
              City <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
            </label>
            <input
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="e.g. Mumbai"
              className={inputClass}
            />
          </div>

          {/* COUNTRY */}
          <div>
            <label className={labelClass}>
              Country <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
            </label>
            <input
              name="country"
              value={formData.country}
              onChange={handleChange}
              placeholder="e.g. India"
              className={inputClass}
            />
          </div>

          {/* TIMEZONE */}
          <div className="sm:col-span-2">
            <label className={labelClass}>
              Timezone <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
            </label>
            <select
              name="timezone"
              value={formData.timezone}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, timezone: e.target.value }))
              }
              className={selectClass}
            >
              <option value="">Select a timezone…</option>
              {timezones.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Section: Address */}
        <div className="px-5 py-4 border-t border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Address <span className="normal-case tracking-normal font-normal text-gray-400">(optional)</span></p>
        </div>
        <div className="px-5 py-4 grid grid-cols-1 gap-4">

          {/* ADDRESS LINE 1 */}
          <div>
            <label className={labelClass}>Address Line 1</label>
            <input
              name="address_line1"
              value={formData.address_line1}
              onChange={handleChange}
              placeholder="Street address, building name"
              className={inputClass}
            />
          </div>

          {/* ADDRESS LINE 2 */}
          <div>
            <label className={labelClass}>Address Line 2</label>
            <input
              name="address_line2"
              value={formData.address_line2}
              onChange={handleChange}
              placeholder="Floor, suite, landmark"
              className={inputClass}
            />
          </div>

        </div>
      </div>

      {/* FOOTER NOTE */}
      <p className="mt-3 text-[11px] text-gray-400 text-center">
        Fields marked <span className="text-red-400">*</span> are required
      </p>

    </div>
  );
}