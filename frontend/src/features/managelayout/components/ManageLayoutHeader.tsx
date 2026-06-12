"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useEffect, useCallback } from "react";
import { Layout } from "../types/layout.types";

interface ManageLayoutHeaderProps {
  layout?: Layout | null;
}

function UploadIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  );
}

export default function ManageLayoutHeader({ layout }: ManageLayoutHeaderProps) {
  const router       = useRouter();
  const searchParams = useSearchParams();

  // Read params once — stable across renders
  const siteId     = searchParams.get("siteId")     ?? "";
  const buildingId = searchParams.get("buildingId") ?? "";
  const floorId    = searchParams.get("floorId")    ?? "";
  const layoutId   = searchParams.get("layoutId")   ?? layout?.layout_id ?? "";

  // Prefetch both destination routes on mount.
  // Back button → /admin/layouts
  // Upload button → /admin/layouts/upload
  // Both JS bundles are downloaded before the user clicks anything.
  useEffect(() => {
    router.prefetch("/admin/layouts");
    router.prefetch("/admin/layouts/upload");
  }, [router]);

  const handleBack = useCallback(() => {
    const params = new URLSearchParams();
    if (siteId)     params.set("siteId",     siteId);
    if (buildingId) params.set("buildingId", buildingId);
    if (floorId)    params.set("floorId",    floorId);
    if (layoutId)   params.set("layoutId",   layoutId);

    router.push(`/admin/layouts?${params.toString()}`);
  }, [router, siteId, buildingId, floorId, layoutId]);

  const handleUpload = useCallback(() => {
    const params = new URLSearchParams();
    if (siteId)     params.set("siteId",     siteId);
    if (buildingId) params.set("buildingId", buildingId);
    if (floorId)    params.set("floorId",    floorId);

    router.push(`/admin/layouts/upload?${params.toString()}`);
  }, [router, siteId, buildingId, floorId]);

  return (
    <div className="flex justify-between items-center">

      {/* LEFT — title */}
      <div>
        <h1  className="text-xl sm:text-2xl font-semibold text-gray-900">Floor Layout Management</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Review, manage and publish floor layouts for employee bookings
        </p>
      </div>

      {/* RIGHT — back + upload */}
      <div className="flex gap-3 items-center">

        <button
          onClick={handleBack}
          onMouseEnter={() => router.prefetch("/admin/layouts")}
          className="flex items-center gap-2 border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Layouts
        </button>

        <button
          onClick={handleUpload}
          onMouseEnter={() => router.prefetch("/admin/layouts/upload")}
          className="flex items-center gap-2 border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors"
        >
          <UploadIcon />
          Upload New Layout
        </button>

      </div>

    </div>
  );
}
