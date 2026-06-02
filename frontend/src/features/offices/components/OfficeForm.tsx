"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import useCreateSite from "../hooks/useCreateSite";


export default function OfficeForm() {
  const router = useRouter();
  // const timezones = Intl.supportedValuesOf("timeZone");
  // console.log(timezones.includes("Asia/Kolkata"));

  const timezones = [
  "Asia/Kolkata",
  ...Intl.supportedValuesOf("timeZone"),
]
  .filter(
    (value, index, self) =>
      self.indexOf(value) === index
  )
  .sort();

  const { createSite, loading } = useCreateSite();

  const [successMessage, setSuccessMessage] =
    useState("");

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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
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

      setSuccessMessage(
        "Office added successfully!"
      );

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

      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    } catch (error) {
      console.error(error);
    }
  };

  const inputClass =
    "w-full h-12 px-4 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

  const labelClass =
    "block text-sm font-medium text-gray-700 mb-2";

  return (
    <div className="p-6 bg-[#f8fafc] min-h-screen">

      {/* BACK BUTTON */}
      <button
        onClick={() =>
          router.push("/admin/offices")
        }
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-black mb-6"
      >
        <ArrowLeft size={18} />
        Back to Offices
      </button>

      {/* SUCCESS MESSAGE */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">
          {successMessage}
        </div>
      )}

      {/* HEADER */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">
            Add Office
          </h1>

          <p className="mt-2 text-gray-500">
            Enter the office details below to create a new office.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() =>
              router.push("/admin/offices")
            }
            className="h-11 px-5 border border-gray-300 rounded-xl bg-white hover:bg-gray-50 transition"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={!isFormValid || loading}
            className={`h-11 px-5 rounded-xl text-white transition ${
              isFormValid
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            {loading
              ? "Saving..."
              : "Save Office"}
          </button>
        </div>
      </div>

      {/* FORM CARD */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* OFFICE NAME */}
          <div>
            <label className={labelClass}>
              Office Name{" "}
              <span className="text-red-500">*</span>
            </label>

            <input
              name="site_name"
              value={formData.site_name}
              onChange={handleChange}
              placeholder="Enter office name"
              className={inputClass}
            />
          </div>

          {/* OFFICE CODE */}
          <div>
            <label className={labelClass}>
              Office Code{" "}
              <span className="text-red-500">*</span>
            </label>

            <input
              name="site_code"
              value={formData.site_code}
              onChange={handleChange}
              placeholder="Enter office code"
              className={inputClass}
            />

            <p className="text-xs text-gray-500 mt-2">
              Unique code to identify the office
            </p>
          </div>

          {/* CITY */}
          <div>
            <label className={labelClass}>
              City{" "}
              <span className="text-red-500">*</span>
            </label>

            <input
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="Enter city"
              className={inputClass}
            />
          </div>

          {/* COUNTRY */}
          <div>
            <label className={labelClass}>
              Country{" "}
              <span className="text-red-500">*</span>
            </label>

            <input
              name="country"
              value={formData.country}
              onChange={handleChange}
              placeholder="Enter country"
              className={inputClass}
            />
          </div>

          {/* TIMEZONE */}
          <div className="md:col-span-2">
            <label className={labelClass}>
              Timezone{" "}
              <span className="text-red-500">*</span>
            </label>

            {/* <input
              name="timezone"
              value={formData.timezone}
              onChange={handleChange}
              placeholder="Enter timezone"
              className={inputClass}
            /> */}

            <select
  name="timezone"
  value={formData.timezone}
  onChange={(e) =>
    setFormData((prev) => ({
      ...prev,
      timezone: e.target.value,
    }))
  }
  className={inputClass}
>
  <option value="">
    Select Timezone
  </option>

  {timezones.map((timezone) => (
    <option
      key={timezone}
      value={timezone}
    >
      {timezone}
    </option>
  ))}
</select>
          </div>

          {/* ADDRESS LINE 1 */}
          <div className="md:col-span-2">
            <label className={labelClass}>
              Address Line 1 (Optional)
            </label>

            <input
              name="address_line1"
              value={formData.address_line1}
              onChange={handleChange}
              placeholder="Enter address line 1"
              className={inputClass}
            />
          </div>

          {/* ADDRESS LINE 2 */}
          <div className="md:col-span-2">
            <label className={labelClass}>
              Address Line 2 (Optional)
            </label>

            <input
              name="address_line2"
              value={formData.address_line2}
              onChange={handleChange}
              placeholder="Enter address line 2"
              className={inputClass}
            />
          </div>

        </div>
      </div>
    </div>
  );
}