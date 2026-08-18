"use client";

import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import { AuditLogListItem, AuditSortBy, AuditSortDir } from "../types/audit.types";
import { AUDIT_STATUS_STYLES, methodBadgeStyle, moduleBadgeStyle } from "../utils/constants";
import { formatAuditDateTime, initialsOf } from "../utils/mapAuditLog";

type Props = {
  data: AuditLogListItem[];
  selectedId?: string | null;
  onSelect: (log: AuditLogListItem) => void;
  sortBy: AuditSortBy;
  sortDir: AuditSortDir;
  onToggleSort: (column: AuditSortBy) => void;
};

const ROLE_BADGE_STYLE = "bg-rose-50 text-rose-600 ring-1 ring-rose-200";

function ActorCell({ log }: { log: AuditLogListItem }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 bg-indigo-100 text-indigo-700">
        {initialsOf(log.actorName)}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-900 truncate">{log.actorName}</p>
        {log.actorRole && (
          <span className={`inline-flex px-1.5 py-px mt-0.5 rounded text-[9px] font-semibold uppercase tracking-wide ${ROLE_BADGE_STYLE}`}>
            {log.actorRole}
          </span>
        )}
      </div>
    </div>
  );
}

function SortableHeader({
  label,
  column,
  sortBy,
  sortDir,
  onToggleSort,
  className,
}: {
  label: string;
  column: AuditSortBy;
  sortBy: AuditSortBy;
  sortDir: AuditSortDir;
  onToggleSort: (column: AuditSortBy) => void;
  className?: string;
}) {
  const active = sortBy === column;
  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onToggleSort(column)}
        className="inline-flex items-center gap-1 font-bold hover:text-blue-800 transition-colors"
      >
        {label}
        {active ? (
          sortDir === "asc" ? (
            <ChevronUp size={12} />
          ) : (
            <ChevronDown size={12} />
          )
        ) : (
          <ChevronDown size={12} className="text-blue-300" />
        )}
      </button>
    </th>
  );
}

export default function AuditLogsTable({ data, selectedId, onSelect, sortBy, sortDir, onToggleSort }: Props) {
  if (data.length === 0) {
    return <p className="px-6 py-12 text-center text-gray-400 text-sm">No audit events found.</p>;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-xs" style={{ minWidth: "1100px" }}>
        <thead className="text-xs text-blue-600 bg-blue-50 border-b sticky top-0 z-10">
          <tr>
            <SortableHeader
              label="Time"
              column="occurred_at"
              sortBy={sortBy}
              sortDir={sortDir}
              onToggleSort={onToggleSort}
              className="pl-5 pr-3 py-3 text-left"
            />
            <SortableHeader
              label="Actor"
              column="actor"
              sortBy={sortBy}
              sortDir={sortDir}
              onToggleSort={onToggleSort}
              className="px-3 py-3 text-left"
            />
            <SortableHeader
              label="Action"
              column="action"
              sortBy={sortBy}
              sortDir={sortDir}
              onToggleSort={onToggleSort}
              className="px-3 py-3 text-left"
            />
            <SortableHeader
              label="Module"
              column="module"
              sortBy={sortBy}
              sortDir={sortDir}
              onToggleSort={onToggleSort}
              className="px-3 py-3 text-left"
            />
            <th className="px-3 py-3 text-left font-bold">Entity</th>
            <th className="px-3 py-3 text-left font-bold">Entity ID</th>
            <SortableHeader
              label="Status"
              column="status"
              sortBy={sortBy}
              sortDir={sortDir}
              onToggleSort={onToggleSort}
              className="px-3 py-3 text-center"
            />
            <th className="px-3 py-3 text-center font-bold">Method</th>
            <th className="px-3 py-3 text-center font-bold">Source</th>
            <th className="pl-3 pr-5 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((log) => {
            const isSelected = log.id === selectedId;
            return (
              <tr
                key={log.id}
                onClick={() => onSelect(log)}
                className={`cursor-pointer ${isSelected ? "bg-indigo-50/60" : "hover:bg-gray-50"}`}
              >
                <td className="pl-5 pr-3 py-3 text-gray-700 whitespace-nowrap">{formatAuditDateTime(log.occurredAt)}</td>
                <td className="px-3 py-3">
                  <ActorCell log={log} />
                </td>
                <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{log.action}</td>
                <td className="px-3 py-3">
                  <span className={`inline-flex px-2 py-0.5 text-[10px] rounded-full font-semibold uppercase ${moduleBadgeStyle(log.module)}`}>
                    {log.module}
                  </span>
                </td>
                <td className="px-3 py-3 text-gray-700">{log.entityType || "—"}</td>
                <td className="px-3 py-3 text-gray-700">{log.entityId || "—"}</td>
                <td className="px-3 py-3 text-center">
                  <span
                    className={`inline-flex px-2 py-0.5 text-[10px] rounded-full font-semibold uppercase ${AUDIT_STATUS_STYLES[log.status]}`}
                  >
                    {log.status}
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className={`inline-flex px-2 py-0.5 text-[10px] rounded-full font-semibold uppercase ${methodBadgeStyle(log.requestMethod)}`}>
                    {log.requestMethod}
                  </span>
                </td>
                <td className="px-3 py-3 text-center text-gray-500">{log.sourceChannel}</td>
                <td className="pl-3 pr-5 py-3 text-right">
                  <ChevronRight size={14} className="text-gray-300" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
