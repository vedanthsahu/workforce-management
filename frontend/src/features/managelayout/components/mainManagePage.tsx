"use client";

import { useSearchParams } from "next/navigation";

import LayoutPreview from "./LayoutPreview";
import LayoutDetails from "./LayoutDetails";

import { useLayoutDetails } from "@/features/managelayout/hooks/useLayoutDetails";
import { activateLayout } from "@/features/managelayout/services/layoutService";

import {Layout} from "@/features/managelayout/types/layout.types";

export default function MainManagePage() {
  const params = useSearchParams();

  const layoutId = params.get("layoutId");
  const floorId = params.get("floorId");

  const { layout } = useLayoutDetails(layoutId, floorId);

  const handlePublish = async () => {
    if (!layoutId) return;

    try {
      await activateLayout(layoutId);
      alert("Layout Published ✅");
    } catch (err) {
      console.error("Publish error:", err);
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">
          Floor Layout Management
        </h1>

        <button
          onClick={handlePublish}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md"
        >
          Publish Layout
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="grid grid-cols-4 gap-4">
        <select className="border rounded-md p-2">
          <option>{layout?.site_id || "Site"}</option>
        </select>

        <select className="border rounded-md p-2">
          <option>{layout?.floor_id || "Floor"}</option>
        </select>

        <select className="border rounded-md p-2">
          <option>v{layout?.version_no || "-"}</option>
        </select>

        <div className="text-sm text-gray-500 flex items-center">
          Last updated: {layout?.updated_at || "--"}
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-6 border-b pb-2">
        <span className="font-medium text-indigo-600">
          Layout Preview
        </span>
        <span>Seat Summary</span>
        <span>Amenities</span>
        <span>Blocked Areas</span>
      </div>

      {/* MAIN CONTENT */}
      <div className="grid grid-cols-3 gap-6">

        {/* LEFT - SVG */}
        <LayoutPreview url={layout?.layout_file_url} />

        {/* RIGHT PANEL */}
        <LayoutDetails layout={layout} />

      </div>

    </div>
  );
}