"use client";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  return (
    <div className="flex items-center gap-2">

      {/* Previous */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="w-8 h-8 flex items-center justify-center border rounded-md hover:bg-gray-100 disabled:opacity-40"
      >
        ←
      </button>

      {/* Pages */}
      {Array.from({ length: totalPages }, (_, i) => (
        <button
          key={i}
          onClick={() => onPageChange(i + 1)}
          className={`w-8 h-8 rounded-md text-sm ${
            currentPage === i + 1
              ? "bg-blue-600 text-white"
              : "border hover:bg-gray-100"
          }`}
        >
          {i + 1}
        </button>
      ))}

      {/* Next */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="w-8 h-8 flex items-center justify-center border rounded-md hover:bg-gray-100 disabled:opacity-40"
      >
        →
      </button>
    </div>
  );
}