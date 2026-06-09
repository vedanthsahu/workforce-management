// "use client";

// import {
//   ChevronLeft,
//   ChevronRight,
// } from "lucide-react";

// interface PaginationProps {
//   currentPage: number;
//   totalPages: number;
//   onPageChange: (page: number) => void;
// }

// export default function AmenitiesPagination({
//   currentPage,
//   totalPages,
//   onPageChange,
// }: PaginationProps) {
//   if (totalPages <= 1) return null;

//   return (
//     <div className="flex items-center gap-2">
//       <button
//         onClick={() =>
//           onPageChange(currentPage - 1)
//         }
//         disabled={currentPage === 1}
//         className="p-2 border rounded-md hover:bg-gray-50 disabled:opacity-40"
//       >
//         <ChevronLeft size={14} />
//       </button>

//       {Array.from(
//         { length: totalPages },
//         (_, i) => (
//           <button
//             key={i}
//             onClick={() =>
//               onPageChange(i + 1)
//             }
//             className={`px-3 py-1 rounded-md ${
//               currentPage === i + 1
//                 ? "bg-blue-600 text-white"
//                 : "border"
//             }`}
//           >
//             {i + 1}
//           </button>
//         )
//       )}

//       <button
//         onClick={() =>
//           onPageChange(currentPage + 1)
//         }
//         disabled={
//           currentPage === totalPages
//         }
//         className="p-2 border rounded-md hover:bg-gray-50 disabled:opacity-40"
//       >
//         <ChevronRight size={14} />
//       </button>
//     </div>
//   );
// }

"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function AmenitiesPagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
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
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-1.5 border rounded-md hover:bg-gray-50 disabled:opacity-40 transition"
      >
        <ChevronLeft size={14} />
      </button>

      <div className="hidden sm:flex items-center gap-1">
        {getPageNumbers().map((page, idx) =>
          page < 0 ? (
            <span
              key={`ellipsis-${idx}`}
              className="px-1 text-gray-400 text-xs"
            >
              …
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-2.5 py-1 text-xs rounded-md transition ${
                currentPage === page
                  ? "bg-blue-600 text-white"
                  : "border hover:bg-gray-50 text-gray-600"
              }`}
            >
              {page}
            </button>
          )
        )}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-1.5 border rounded-md hover:bg-gray-50 disabled:opacity-40 transition"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}