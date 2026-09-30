"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxItem,
} from "@/components/ui/combobox";
import useCreateSite from "../hooks/useCreateSite";
import { officeService } from "../services/office.service";
import { TIMEZONES, COUNTRIES } from "../utils/office.utils";
import { officeCodeFromName, uniqueCode } from "@/lib/codeGenerator";

// Shared field-label look across all "Add" forms (Office, Building, Floor, Amenity).
const labelClass = "text-xs font-semibold text-gray-500 uppercase tracking-wide";

// Read-only, derived fields (office/building/floor codes) share this look so
// it's visually obvious they can't be typed into.
const readOnlyInputClass = "bg-gray-50 text-gray-500 cursor-not-allowed";

export default function OfficeForm() {
  const router = useRouter();
  const { createSite, loading } = useCreateSite();

  const [errorMessage, setErrorMessage] = useState("");

  // Existing office codes, fetched once so the generated code can be
  // disambiguated (HYD, HYD-01, HYD-02, ...) before the user ever submits.
  const [existingCodes, setExistingCodes] = useState<string[]>([]);
  useEffect(() => {
    officeService.getSites().then(
      (sites) => setExistingCodes(sites.map((s) => s.site_code)),
      (err) => console.error("Failed to load existing office codes", err)
    );
  }, []);

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
    setErrorMessage("");
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      // Office code is derived from the name, not typed by hand.
      ...(name === "site_name"
        ? { site_code: uniqueCode(officeCodeFromName(value), existingCodes) }
        : {}),
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
    setErrorMessage("");

    try {
      const result = await createSite(formData);
      router.push(`/admin/offices?success=true&site_id=${result.site_id}`);
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      const serverMessage = axios.isAxiosError(error) ? error.response?.data?.message : undefined;

      if (status === 409) {
        setErrorMessage(
          serverMessage || "An office with this name or code already exists."
        );
      } else {
        setErrorMessage("Something went wrong. Please try again.");
      }
    }
  };

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
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Add Office</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Fill in the details to create a new office location.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:shrink-0">
          <Button
            variant="outline"
            className="h-9 px-4 rounded-lg"
            onClick={() => router.push("/admin/offices")}
          >
            Cancel
          </Button>
          <Button
            className="h-9 px-4 rounded-lg"
            onClick={handleSave}
            disabled={!isFormValid || loading}
          >
            {loading ? "Saving..." : "Save Office"}
          </Button>
        </div>
      </div>

      {/* FORM CARD */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">

        {/* Section: Basic Info */}
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Basic Information
          </p>
        </div>
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div className="space-y-1.5">
            <Label className={labelClass}>
              Office Name <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
            </Label>
            <Input
              name="site_name"
              value={formData.site_name}
              onChange={handleChange}
              placeholder="e.g. Mumbai HQ"
            />
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>
              Office Code <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
            </Label>
            <Input
              name="site_code"
              value={formData.site_code}
              readOnly
              placeholder="Auto-generated from office name"
              className={readOnlyInputClass}
            />
            <p className="text-[11px] text-gray-400">Auto-generated from the office name</p>
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>
              City <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
            </Label>
            <Input
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="e.g. Mumbai"
            />
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>
              Country <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
            </Label>
            <Combobox
              items={COUNTRIES}
              value={formData.country || null}
              onValueChange={(value) => {
                setErrorMessage("");
                setFormData((prev) => ({ ...prev, country: value ?? "" }));
              }}
            >
              <ComboboxInput placeholder="Select a country…" />
              <ComboboxContent>
                {(country: string) => (
                  <ComboboxItem key={country} value={country}>
                    {country}
                  </ComboboxItem>
                )}
              </ComboboxContent>
            </Combobox>
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label className={labelClass}>
              Timezone <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
            </Label>
            <Combobox
              items={TIMEZONES}
              value={formData.timezone || null}
              onValueChange={(value) => {
                setErrorMessage("");
                setFormData((prev) => ({ ...prev, timezone: value ?? "" }));
              }}
            >
              <ComboboxInput placeholder="Select a timezone…" />
              <ComboboxContent>
                {(tz: string) => (
                  <ComboboxItem key={tz} value={tz}>
                    {tz}
                  </ComboboxItem>
                )}
              </ComboboxContent>
            </Combobox>
          </div>

        </div>

        {/* Section: Address */}
        <div className="px-5 py-4 border-t border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Address{" "}
            <span className="normal-case tracking-normal font-normal text-gray-400">(optional)</span>
          </p>
        </div>
        <div className="px-5 py-4 grid grid-cols-1 gap-4">

          <div className="space-y-1.5">
            <Label className={labelClass}>Address Line 1</Label>
            <Input
              name="address_line1"
              value={formData.address_line1}
              onChange={handleChange}
              placeholder="Street address, building name"
            />
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>Address Line 2</Label>
            <Input
              name="address_line2"
              value={formData.address_line2}
              onChange={handleChange}
              placeholder="Floor, suite, landmark"
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
