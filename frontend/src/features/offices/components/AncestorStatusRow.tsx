"use client";

import { cn } from "@/lib/utils";

type Props = {
  label: string;
  name: string;
  status: string;
  loading?: boolean;
};

// Read-only context row shown in Building/Floor edit modals: which office
// (or office + building) this record belongs to, and that ancestor's
// current status. It's display-only -- a child can never reactivate its
// own parent from here, only view it (parity with the pill styling used in
// OfficeTable/buildingTable/FloorTable so it reads as the same status
// language across the app).
export default function AncestorStatusRow({ label, name, status, loading }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
      <div className="min-w-0">
        <span className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">{label}</span>
        <p className="text-sm text-gray-700 truncate">{name || "—"}</p>
      </div>
      {loading ? (
        <span className="shrink-0 h-4 w-14 rounded-full bg-gray-200 animate-pulse" />
      ) : (
        <span
          className={cn(
            "shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap",
            status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
          )}
        >
          {status}
        </span>
      )}
    </div>
  );
}
