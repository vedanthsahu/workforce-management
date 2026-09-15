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
  const start = total ? (page - 1) * 20 + 1 : 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
      <h2 className="border-b border-border px-4 py-4 text-sm font-semibold text-foreground sm:px-6 sm:text-base">
        {title}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px] text-left text-xs">
          <thead className="bg-muted/50 text-[11px] font-semibold text-muted-foreground">
            <tr>
              {headings.map((heading) => (
                <th key={heading} className="px-4 py-3">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {!loading &&
              rows.map((row) => (
                <tr
                  key={row.block_id}
                  className="text-muted-foreground hover:bg-muted/30"
                >
                  <td className="px-4 py-3 font-semibold text-foreground">
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
      <footer className="flex items-center justify-between border-t border-border px-4 py-4 text-xs text-muted-foreground sm:px-6">
        <span>
          Showing {start}
          {total ? `–${Math.min(start + rows.length - 1, total)}` : ""} of {total}
        </span>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-muted disabled:opacity-40"
          >
            <ChevronLeft size={15} />
          </button>
          <button className="h-8 min-w-8 rounded-md border border-primary bg-primary/10 font-semibold text-primary">
            {page}
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-muted disabled:opacity-40"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </footer>
    </section>
  );
}
