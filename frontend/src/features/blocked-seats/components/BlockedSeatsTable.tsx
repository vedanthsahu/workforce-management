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
      {!loading && !!rows.length && (
        <div className="divide-y divide-[#EBEBF5] md:hidden">
          {rows.map((row) => (
            <article key={row.block_id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#1A1A2E]">
                    {row.seat_code}
                  </p>
                  <p className="mt-1 break-words text-xs text-gray-600 [overflow-wrap:anywhere]">
                    {row.site_name}
                  </p>
                  <p className="mt-0.5 break-words text-xs text-gray-400 [overflow-wrap:anywhere]">
                    {row.building_name} · {row.floor_name}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium ${STATUS_STYLES[row.display_status]}`}>
                  {STATUS_LABELS[row.display_status]}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Block period</dt>
                  <dd className="mt-1 text-gray-600">
                    {displayDate(row.blocked_from)} – {displayDate(row.blocked_to)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Type</dt>
                  <dd className="mt-1">
                    <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-medium ${TYPE_STYLES[row.block_type]}`}>
                      {TYPE_LABELS[row.block_type]}
                    </span>
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Reason</dt>
                  <dd className="mt-1 break-words text-gray-600 [overflow-wrap:anywhere]">{row.reason}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Blocked by</dt>
                  <dd className="mt-1 break-words text-gray-600 [overflow-wrap:anywhere]">
                    {row.blocked_by.name ?? "—"}
                  </dd>
                </div>
                <div className="flex items-end justify-end">
                  {row.display_status !== "EXPIRED" && (
                    <button
                      onClick={() => onCancel(row)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    >
                      <Ban size={14} />
                      Unblock
                    </button>
                  )}
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
      <div className="hidden overflow-hidden md:block">
        <table className="w-full table-fixed text-left text-[10px] sm:text-[11px] lg:text-[12.5px]">
          <colgroup>
            <col className="w-[13%]" />
            <col className="w-[20%]" />
            <col className="w-[16%]" />
            <col className="w-[11%]" />
            <col className="w-[17%]" />
            <col className="w-[8%]" />
            <col className="w-[10%]" />
            <col className="w-[5%]" />
          </colgroup>
          <thead className="bg-blue-100/80 text-[11px] font-semibold text-blue-600">
            <tr>
              {headings.map((heading) => (
                <th
                  key={heading}
                  className={
                    heading === "Actions"
                      ? "whitespace-nowrap px-1 py-3 text-center"
                      : "break-words px-2 py-3 [overflow-wrap:anywhere] lg:px-4"
                  }
                >
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
                  <td className="whitespace-nowrap px-2 py-3 align-top font-semibold text-[#1A1A2E] lg:px-4">
                    {row.seat_code}
                  </td>
                  <td className="px-2 py-3 align-top lg:px-4">
                    <span className="block break-words [overflow-wrap:anywhere]">
                      {row.site_name}
                    </span>
                    <span className="mt-0.5 flex min-w-0 flex-wrap items-baseline gap-x-1 text-gray-400">
                      <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                        {row.building_name}
                      </span>
                      <span className="whitespace-nowrap">· {row.floor_name}</span>
                    </span>
                  </td>
                  <td className="break-words px-2 py-3 align-top [overflow-wrap:anywhere] lg:px-4">
                    {displayDate(row.blocked_from)} – {displayDate(row.blocked_to)}
                  </td>
                  <td className="px-1 py-3 align-top lg:px-3">
                    <span className={`inline-block max-w-full break-words rounded-full px-1.5 py-1 text-[9px] font-medium [overflow-wrap:anywhere] lg:px-2.5 lg:text-[11px] ${TYPE_STYLES[row.block_type]}`}>
                      {TYPE_LABELS[row.block_type]}
                    </span>
                  </td>
                  <td className="break-words px-2 py-3 align-top [overflow-wrap:anywhere] lg:px-4">
                    {row.reason}
                  </td>
                  <td className="px-1 py-3 align-top lg:px-3">
                    <span className={`inline-block max-w-full break-words rounded-full px-1.5 py-1 text-[9px] font-medium [overflow-wrap:anywhere] lg:px-2.5 lg:text-[11px] ${STATUS_STYLES[row.display_status]}`}>
                      {STATUS_LABELS[row.display_status]}
                    </span>
                  </td>
                  <td className="break-words px-2 py-3 align-top [overflow-wrap:anywhere] lg:px-4">
                    {row.blocked_by.name ?? "—"}
                  </td>
                  <td className="px-1 py-3 text-center align-top">
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
      </div>
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
      <footer className="flex flex-col gap-3 border-t border-[#EBEBF5] px-4 py-4 text-[11.5px] text-gray-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-[12px]">
        <span>
          Showing {start} to {total ? Math.min(start + rows.length - 1, total) : 0} of {total} entries
        </span>
        {total > pageSize && (
          <div className="flex items-center gap-2 self-center sm:self-auto">
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
