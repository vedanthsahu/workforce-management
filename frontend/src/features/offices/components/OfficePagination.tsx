"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination() {
  return (
    <div className="flex items-center gap-2">

      <button className="p-2 border rounded-md hover:bg-gray-50">
        <ChevronLeft size={14} />
      </button>

      <button className="px-3 py-1 bg-blue-600 text-white rounded-md">1</button>
      <button className="px-3 py-1 border rounded-md">2</button>
      <button className="px-3 py-1 border rounded-md">3</button>

      <button className="p-2 border rounded-md hover:bg-gray-50">
        <ChevronRight size={14} />
      </button>

    </div>
  );
}