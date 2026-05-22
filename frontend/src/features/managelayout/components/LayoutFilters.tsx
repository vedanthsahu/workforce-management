"use client";

export default function LayoutFilters() {
  return (
    <div className="grid grid-cols-4 gap-4">

      {/* Office */}
      <select className="border rounded-md p-2 text-sm">
        <option>BENGALURU (HQ)</option>
      </select>

      {/* Floor */}
      <select className="border rounded-md p-2 text-sm">
        <option>8th Floor</option>
      </select>

      {/* Layout Version */}
      <select className="border rounded-md p-2 text-sm">
        <option>v1 (Active)</option>
      </select>

      {/* Last Updated */}
      <div className="flex items-center text-sm text-gray-500">
        Last updated: May 15, 2026 by Admin
      </div>

    </div>
  );
}