"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function ManageLayoutPage() {
  const params = useSearchParams();

  const layoutId = params.get("layoutId");
  const floorId = params.get("floorId");

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">
          Floor Layout Management
        </h1>

        <button className="bg-indigo-600 text-white px-4 py-2 rounded-md">
          Publish Layout
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="grid grid-cols-4 gap-4">
        <select className="border rounded-md p-2">
          <option>BENGALURU (HQ)</option>
        </select>

        <select className="border rounded-md p-2">
          <option>8th Floor</option>
        </select>

        <select className="border rounded-md p-2">
          <option>v1 (Active)</option>
        </select>

        <div className="text-sm text-gray-500 flex items-center">
          Last updated: --
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-6 border-b pb-2">
        <span className="font-medium text-indigo-600">Layout Preview</span>
        <span>Seat Summary</span>
        <span>Amenities</span>
        <span>Blocked Areas</span>
      </div>

      {/* MAIN CONTENT */}
      <div className="grid grid-cols-3 gap-6">

        {/* LEFT - SVG PLACEHOLDER */}
        <div className="col-span-2 border rounded-md h-[500px] flex items-center justify-center">
          <span className="text-gray-400">
            SVG Layout Preview (Coming Soon)
          </span>
        </div>

        {/* RIGHT PANEL */}
        <div className="border rounded-md p-4 space-y-4">

          <h2 className="font-semibold">Layout Details</h2>

          <div className="text-sm">
            <p><b>Layout ID:</b> {layoutId}</p>
            <p><b>Floor ID:</b> {floorId}</p>
            <p><b>Name:</b> --</p>
            <p><b>Status:</b> DRAFT</p>
          </div>

          <div className="space-y-2">
            <button className="w-full border p-2 rounded-md">
              Manage Seats
            </button>

            <button className="w-full border p-2 rounded-md">
              Manage Amenities
            </button>

            <button className="w-full border p-2 rounded-md">
              Manage Blocked Areas
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}