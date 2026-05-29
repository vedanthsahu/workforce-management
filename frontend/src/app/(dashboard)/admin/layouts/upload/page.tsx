
"use client";

import { useState } from "react";
import AdminTopbar from "@/features/admin/components/AdminTopbar";
import LayoutForm from "@/features/uploadlayouts/components/LayoutForm";
import LayoutGuidelines from "@/features/uploadlayouts/components/LayoutGuidelines";
import LayoutSummary from "@/features/uploadlayouts/components/LayoutSummary";
import { useLayoutForm } from "@/features/uploadlayouts/hooks/useLayoutForm";
import Link from "next/link";
import { Toaster } from "sonner";

export default function UploadLayoutPage() {
  const { formData, setFormData } = useLayoutForm();

  return (
    <>
      <AdminTopbar />
      <main className="flex-1 p-6 bg-gray-50 space-y-6 overflow-y-auto">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold">Upload New Floor Layout</h1>
            <p className="text-sm text-muted-foreground">
              Upload an SVG layout file for a floor and create a new layout version.
            </p>
          </div>
          <Link href="/admin/layouts" className="border px-4 py-2 rounded-md text-sm">
            ← Back to Floor Layouts
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <LayoutForm formData={formData} setFormData={setFormData} />
          <div className="space-y-6">
            <LayoutGuidelines />
            <LayoutSummary formData={formData} />
            <Toaster richColors position="top-right" />
          </div>
        </div>
      </main>
    </>
  );
}