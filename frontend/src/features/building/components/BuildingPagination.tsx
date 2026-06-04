"use client";

import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function BuildingPagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() =>
          onPageChange(currentPage - 1)
        }
        disabled={currentPage === 1}
        className="p-2 border rounded-md hover:bg-gray-50 disabled:opacity-40"
      >
        <ChevronLeft size={14} />
      </button>

      {Array.from(
        { length: totalPages },
        (_, i) => (
          <button
            key={i}
            onClick={() =>
              onPageChange(i + 1)
            }
            className={`px-3 py-1 rounded-md ${
              currentPage === i + 1
                ? "bg-blue-600 text-white"
                : "border"
            }`}
          >
            {i + 1}
          </button>
        )
      )}

      <button
        onClick={() =>
          onPageChange(currentPage + 1)
        }
        disabled={
          currentPage === totalPages
        }
        className="p-2 border rounded-md hover:bg-gray-50 disabled:opacity-40"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}