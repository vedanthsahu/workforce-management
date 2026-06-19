"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { siteDirectoryClientService } from "../services/siteDirectoryClient.service";

const initialForm = {
  site_code: "",
  site_name: "",
  city: "",
  country: "",
  timezone: "Asia/Kolkata",
};

// Client Component: posts a new site, then asks the Server Component
// above (the page) to re-fetch its data via router.refresh().
export default function AddSiteForm() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof typeof initialForm) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await siteDirectoryClientService.createSite({ ...form, status: "ACTIVE" });
      setForm(initialForm);
      router.refresh();
    } catch (err) {
      console.error("createSite failed:", err);
      setError("Failed to create site. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 flex flex-wrap items-end gap-3"
    >
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Site Code</label>
        <Input value={form.site_code} onChange={handleChange("site_code")} required className="w-32" />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Site Name</label>
        <Input value={form.site_name} onChange={handleChange("site_name")} required className="w-48" />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">City</label>
        <Input value={form.city} onChange={handleChange("city")} required className="w-36" />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Country</label>
        <Input value={form.country} onChange={handleChange("country")} required className="w-36" />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Timezone</label>
        <Input value={form.timezone} onChange={handleChange("timezone")} required className="w-40" />
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? "Adding..." : "Add Site"}
      </Button>

      {error && <p className="text-sm text-red-500 w-full">{error}</p>}
    </form>
  );
}
