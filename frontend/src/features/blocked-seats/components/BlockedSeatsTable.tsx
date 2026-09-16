import { Ban, ChevronLeft, ChevronRight } from "lucide-react";
import type { BlockedSeat } from "../types/blockedSeats.types";
import {
  STATUS_LABELS,
  STATUS_STYLES,
  TYPE_LABELS,
  TYPE_STYLES,
} from "../utils/constants";

const displayDate = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));

interface Props {
  title: string;
  rows: BlockedSeat[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onCancel: (row: BlockedSeat) => void;
}

export default function BlockedSeatsTable({
  title,
  rows,
  total,
  page,
  totalPages,
  loading,
  onPageChange,
  onCancel,
}: Props) {
  const headings = [
    "Seat",
    "Location",
    "Block Period",
    "Type",
    "Reason",
    "Status",
    "Blocked By",
    "Actions",
  ];
  const pageSize = 10;
  const start = total ? (page - 1) * pageSize + 1 : 0;

  return (
    <section className="overflow-hidden rounded-xl border border-[#EBEBF5] bg-white text-gray-900">
      <h2 className="border-b border-[#EBEBF5] px-4 py-4 text-[14px] font-bold text-[#1A1A2E] sm:px-6 sm:text-[15px]">
        {title} ({total})
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px] text-left text-[12px] sm:text-[12.5px]">
          <thead className="bg-blue-100/80 text-[11px] font-semibold text-blue-600">
            <tr>
              {headings.map((heading) => (
                <th key={heading} className="px-4 py-3">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EBEBF5]">
            {!loading &&
              rows.map((row) => (
                <tr
                  key={row.block_id}
                  className="text-gray-500 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-semibold text-[#1A1A2E]">
                    {row.seat_code}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {row.site_name} · {row.building_name} · {row.floor_name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {displayDate(row.blocked_from)} – {displayDate(row.blocked_to)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${TYPE_STYLES[row.block_type]}`}>
                      {TYPE_LABELS[row.block_type]}
                    </span>
                  </td>
                  <td className="max-w-[190px] px-4 py-3">{row.reason}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLES[row.display_status]}`}>
                      {STATUS_LABELS[row.display_status]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {row.blocked_by.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {row.display_status === "EXPIRED" ? (
                      <span className="text-muted-foreground/50">—</span>
                    ) : (
                      <button
                        onClick={() => onCancel(row)}
                        title="Unblock seat"
                        aria-label={`Unblock seat ${row.seat_code}`}
                        className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Ban size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {loading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Loading blocked seats…
          </p>
        ) : (
          !rows.length && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No blocked seats match the selected criteria.
            </p>
          )
        )}
      </div>
      <footer className="flex items-center justify-between border-t border-[#EBEBF5] px-4 py-4 text-[11.5px] text-gray-500 sm:px-6 sm:text-[12px]">
        <span>
          Showing {start} to {total ? Math.min(start + rows.length - 1, total) : 0} of {total} entries
        </span>
        {total > pageSize && (
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft size={15} />
            </button>
            <button className="h-8 min-w-8 rounded-lg border border-indigo-600 bg-indigo-50 font-semibold text-indigo-600">
              {page}
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </footer>
    </section>
  );
}
