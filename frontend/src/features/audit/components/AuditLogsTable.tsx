"use client";

import { ChevronRight } from "lucide-react";
import { getRoleBadgeClass } from "@/features/roles/utils/roles.utils";
import { AuditLogListItem } from "../types/audit.types";
import { AUDIT_STATUS_STYLES, methodBadgeStyle, moduleBadgeStyle } from "../utils/constants";
import { formatAuditDateTime, initialsOf } from "../utils/mapAuditLog";

type Props = {
  data: AuditLogListItem[];
  selectedId?: string | null;
  onSelect: (log: AuditLogListItem) => void;
};

// Shared per-column widths -- declared once so the header row and every body
// row stay in lockstep (each row is its own independent "table" layout
// context once thead/tbody go display:block, so widths can't be set via a
// single <colgroup> the way a normal table would).
const COL = {
  actor: "w-[15%]",
  time: "w-[11%]",
  action: "w-[15%]",
  module: "w-[10%]",
  entity: "w-[10%]",
  status: "w-[9%]",
  method: "w-[9%]",
  source: "w-[8%]",
  view: "w-[6%]",
};

function ActorCell({ log }: { log: AuditLogListItem }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 bg-indigo-100 text-indigo-700">
        {initialsOf(log.actorName)}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-900 wrap-break-word">{log.actorName}</p>
        {log.actorRole && (
          <span
            className={`inline-flex px-1.5 py-px mt-0.5 rounded text-[9px] font-semibold uppercase tracking-wide ring-1 ${getRoleBadgeClass(log.actorRole)}`}
          >
            {log.actorRole}
          </span>
        )}
      </div>
    </div>
  );
}

export default function AuditLogsTable({ data, selectedId, onSelect }: Props) {
  if (data.length === 0) {
    return <p className="px-6 py-12 text-center text-gray-400 text-sm">No audit events found.</p>;
  }

  return (
    <>
      <style>{`
        .audit-tbody-scroll::-webkit-scrollbar { width: 8px; }
        .audit-tbody-scroll::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 9999px; }
        .audit-tbody-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <div className="w-full overflow-x-auto">
        <table className="w-full flex flex-col text-xs border-collapse" style={{ tableLayout: "fixed" }}>
          {/* pr-2 reserves the same 8px the tbody's scrollbar takes, so header and body columns line up */}
          <thead className="block w-full shrink-0 pr-2 text-xs text-blue-600 bg-blue-50 border-b">
            <tr className="table w-full" style={{ tableLayout: "fixed" }}>
              <th className={`${COL.actor} pl-12 pr-3 py-3 text-left font-bold`}>User Name</th>
              <th className={`${COL.time} px-6 py-3 text-left font-bold`}>Time</th>
              <th className={`${COL.action} px-6 py-3 text-left font-bold`}>Action</th>
              <th className={`${COL.module} px-4 py-3 text-left font-bold`}>Module</th>
              <th className={`${COL.entity} px-4 py-3 text-left font-bold`}>Entity</th>
              <th className={`${COL.status} px-3 py-3 text-center font-bold`}>Status</th>
              <th className={`${COL.method} px-3 py-3 text-center font-bold`}>Method</th>
              <th className={`${COL.source} px-3 py-3 text-center font-bold`}>Source</th>
              <th className={`${COL.view} pl-3 pr-5 py-3 text-right font-bold`} />
            </tr>
          </thead>
          {/* Capped at 10 rows tall (56px each) -- fewer rows (e.g. the last
             page, or a narrow filter result) just shrink to fit instead of
             leaving blank space below them; a full page of exactly 10 still
             fits with no scrollbar; only a larger page size (25/50/100)
             pushes past the cap and scrolls internally. */}
          <tbody
            className="audit-tbody-scroll block w-full max-h-140 divide-y divide-gray-100 overflow-y-auto"
            style={{ scrollbarWidth: "thin", scrollbarColor: "#e2e8f0 transparent" }}
          >
            {data.map((log) => {
              const isSelected = log.id === selectedId;
              return (
                <tr
                  key={log.id}
                  className={`table w-full ${isSelected ? "bg-indigo-50/60" : ""}`}
                  style={{ tableLayout: "fixed" }}
                >
                  <td className={`${COL.actor} pl-5 pr-3 py-3`}>
                    <ActorCell log={log} />
                  </td>
                  <td className={`${COL.time} px-3 py-3 text-gray-700 wrap-break-word`}>{formatAuditDateTime(log.occurredAt)}</td>
                  <td className={`${COL.action} px-3 py-3 text-gray-700 wrap-break-word`}>{log.action}</td>
                  <td className={`${COL.module} px-3 py-3`}>
                    <span className={`inline-flex px-2 py-0.5 text-[10px] rounded-full font-semibold uppercase ${moduleBadgeStyle(log.module)}`}>
                      {log.module}
                    </span>
                  </td>
                  <td className={`${COL.entity} px-3 py-3 text-gray-700 wrap-break-word`}>{log.entityType || "—"}</td>
                  <td className={`${COL.status} px-3 py-3 text-center`}>
                    <span
                      className={`inline-flex px-2 py-0.5 text-[10px] rounded-full font-semibold uppercase ${AUDIT_STATUS_STYLES[log.status]}`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className={`${COL.method} px-3 py-3 text-center`}>
                    <span className={`inline-flex px-2 py-0.5 text-[10px] rounded-full font-semibold uppercase ${methodBadgeStyle(log.requestMethod)}`}>
                      {log.requestMethod}
                    </span>
                  </td>
                  <td className={`${COL.source} px-3 py-3 text-center text-gray-500 wrap-break-word`}>{log.sourceChannel}</td>
                  <td className={`${COL.view} pl-3 pr-5 py-3 text-right`}>
                    <button
                      type="button"
                      onClick={() => onSelect(log)}
                      className="inline-flex items-center justify-center p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                      title="View details"
                      aria-label="View details"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
