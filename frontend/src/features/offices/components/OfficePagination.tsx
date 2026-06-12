"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OfficePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function OfficePagination({
  currentPage,
  totalPages,
  onPageChange,
}: OfficePaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const delta = 2;
    const range: number[] = [];
    const left = Math.max(1, currentPage - delta);
    const right = Math.min(totalPages, currentPage + delta);

    for (let i = left; i <= right; i++) {
      range.push(i);
    }

    if (left > 2) range.unshift(-1);
    if (left > 1) range.unshift(1);
    if (right < totalPages - 1) range.push(-2);
    if (right < totalPages) range.push(totalPages);

    return range;
  };

  return (
    <div className="flex items-center gap-1.5">

      {/* PREV */}
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <ChevronLeft size={14} />
      </Button>

      {/* PAGE NUMBERS — full on sm+, compact on mobile */}
      <div className="hidden sm:flex items-center gap-1">
        {getPageNumbers().map((page, idx) =>
          page < 0 ? (
            <span key={`ellipsis-${idx}`} className="px-1 text-gray-400 text-xs">
              …
            </span>
          ) : (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => onPageChange(page)}
            >
              {page}
            </Button>
          )
        )}
      </div>

      {/* COMPACT on mobile */}
      <span className="sm:hidden text-xs text-gray-600 px-2">
        {currentPage} / {totalPages}
      </span>

      {/* NEXT */}
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <ChevronRight size={14} />
      </Button>

    </div>
  );
}
