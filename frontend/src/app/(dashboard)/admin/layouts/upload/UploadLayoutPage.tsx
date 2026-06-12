"use client";

// This file is the content that used to live in page.tsx.
// Extracted so page.tsx can wrap it in <Suspense> — required for useSearchParams().

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import LayoutForm       from "@/features/uploadlayouts/components/LayoutForm";
import LayoutGuidelines from "@/features/uploadlayouts/components/LayoutGuidelines";
import LayoutSummary    from "@/features/uploadlayouts/components/LayoutSummary";
import { useLayoutForm } from "@/features/uploadlayouts/hooks/useLayoutForm";
import Link from "next/link";

export default function UploadLayoutPage() {
  const router = useRouter();
  const params = useSearchParams();

  const siteId     = params.get("siteId")     ? Number(params.get("siteId"))     : null;
  const buildingId = params.get("buildingId") ? Number(params.get("buildingId")) : null;
  const floorId    = params.get("floorId")    ? Number(params.get("floorId"))    : null;

  const { formData, setFormData } = useLayoutForm({
    initialSiteId:     siteId,
    initialBuildingId: buildingId,
    initialFloorId:    floorId,
  });

  const [floorLayoutInfo, setFloorLayoutInfo] = useState<any>(null);

  // FIX: Prefetch the back destination on mount so the Link click is instant
  useEffect(() => {
    router.prefetch("/admin/layouts");
  }, [router]);

  return (
    <main className="flex-1 p-6 bg-gray-50 space-y-6 overflow-y-auto">

     <div className="flex flex-wrap items-start justify-between gap-y-3">
        <div>
          <h1 className="text-xl font-semibold">Upload New Floor Layout</h1>
          <p className="text-sm text-muted-foreground">
            Upload an SVG layout file for a floor and create a new layout version.
          </p>
        </div>
        <Link
          href="/admin/layouts"
          className="border px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors"
        >
          ← Back to Floor Layouts
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
       <LayoutForm
  formData={formData}
  setFormData={setFormData}
  onFloorLayoutInfo={setFloorLayoutInfo}   // ← add this
/>
        <div className="space-y-6">
          <LayoutGuidelines />
          <LayoutSummary formData={formData} floorLayoutInfo={floorLayoutInfo} />
        </div>
      </div>

    </main>
  );
}