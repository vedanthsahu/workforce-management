"use client";

type Props = {
  total: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsChange: (rows: number) => void;
};

export default function LayoutPagination({
  total,
  page,
  rowsPerPage,
  onPageChange,
  onRowsChange,
}: Props) {
  const totalPages = Math.ceil(total / rowsPerPage);

  const start = (page - 1) * rowsPerPage + 1;
  const end = Math.min(page * rowsPerPage, total);

  return (
    <div className="flex justify-between items-center mt-6 text-sm">

      {/* LEFT */}
      <div className="flex items-center gap-2">
        <span className="text-gray-500">Rows per page:</span>

        <select
          value={rowsPerPage}
          onChange={(e) => onRowsChange(Number(e.target.value))}
          className="border rounded-md px-2 py-1"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-4">

        <span className="text-gray-500">
          {start}–{end} of {total}
        </span>

        <div className="flex items-center gap-1">

          {/* FIRST */}
          <button
            onClick={() => onPageChange(1)}
            disabled={page === 1}
            className="px-2 disabled:opacity-30"
          >
            {"<<"}
          </button>

          {/* PREV */}
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="px-2 disabled:opacity-30"
          >
            {"<"}
          </button>

          {/* CURRENT */}
          <span className="bg-indigo-600 text-white px-2 py-1 rounded">
            {page}
          </span>

          {/* NEXT */}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="px-2 disabled:opacity-30"
          >
            {">"}
          </button>

          {/* LAST */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={page === totalPages}
            className="px-2 disabled:opacity-30"
          >
            {">>"}
          </button>

        </div>
      </div>

    </div>
  );
}