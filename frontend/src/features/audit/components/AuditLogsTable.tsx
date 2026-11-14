"use client";

import { ChevronRight } from "lucide-react";
import {
  formatRoleLabel,
  getRoleBadgeClass,
} from "@/features/roles/utils/roles.utils";
import { AuditLogListItem } from "../types/audit.types";
import {
  AUDIT_STATUS_STYLES,
  AUDIT_TABLE_COL as COL,
} from "../utils/constants";
import {
  affectedResourceLabel,
  auditActivityLabel,
  auditStatusLabel,
  formatAuditDateTime,
  initialsOf,
} from "../utils/mapAuditLog";

type Props = {
  data: AuditLogListItem[];
  selectedId?: string | null;
  onSelect: (log: AuditLogListItem) => void;
};

function ActorCell({ log }: { log: AuditLogListItem }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 bg-indigo-100 text-indigo-700">
        {initialsOf(log.actorName)}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-900 wrap-break-word">
          {log.actorName}
        </p>
        {log.actorRole && (
          <span
            className={`inline-flex px-1.5 py-px mt-0.5 rounded text-[9px] font-semibold uppercase tracking-wide ring-1 ${getRoleBadgeClass(log.actorRole)}`}
          >
            {formatRoleLabel(log.actorRole)}
          </span>
        )}
      </div>
    </div>
  );
}

const COLUMN_COUNT = 6;

export default function AuditLogsTable({ data, selectedId, onSelect }: Props) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className="w-full flex flex-col text-xs border-collapse min-w-225"
        style={{ tableLayout: "fixed" }}
      >
        <thead className="block w-full shrink-0 pr-2 text-xs text-blue-600 bg-blue-50 border-b">
          <tr className="table w-full" style={{ tableLayout: "fixed" }}>
            <th className={`${COL.time} pl-5 pr-3 py-3 text-left font-bold`}>
              Time
            </th>
            <th className={`${COL.actor} px-3 py-3 text-left font-bold`}>
              Performed By
            </th>
            <th className={`${COL.action} px-3 py-3 text-left font-bold`}>
              Activity
            </th>
            <th className={`${COL.entity} px-3 py-3 text-left font-bold`}>
              Affected Resource
            </th>
            <th className={`${COL.status} px-3 py-3 text-left font-bold`}>
              Result
            </th>
            <th className={`${COL.view} pl-3 pr-5 py-3 text-right font-bold`} />
          </tr>
        </thead>
        <tbody
          className="audit-tbody-scroll block w-full max-h-140 divide-y divide-gray-100 overflow-y-auto"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#e2e8f0 transparent",
          }}
        >
          {data.length === 0 && (
            <tr className="table w-full" style={{ tableLayout: "fixed" }}>
              <td
                colSpan={COLUMN_COUNT}
                className="py-16 text-center text-sm text-gray-400"
              >
                No audit activities found.
              </td>
            </tr>
          )}
          {data.map((log) => (
            <tr
              key={log.id}
              className={`table w-full transition-colors ${log.id === selectedId ? "bg-indigo-50/60" : "hover:bg-gray-50"}`}
              style={{ tableLayout: "fixed" }}
            >
              <td
                className={`${COL.time} pl-5 pr-3 py-3 text-gray-700 wrap-break-word`}
              >
                {formatAuditDateTime(log.occurredAt)}
              </td>
              <td className={`${COL.actor} px-3 py-3`}>
                <ActorCell log={log} />
              </td>
              <td
                className={`${COL.action} px-3 py-3 text-gray-800 font-medium wrap-break-word`}
              >
                {auditActivityLabel(log)}
              </td>
              <td
                className={`${COL.entity} px-3 py-3 text-gray-700 wrap-break-word`}
              >
                {affectedResourceLabel(log)}
              </td>
              <td className={`${COL.status} px-3 py-3`}>
                <div className="min-w-0">
                  <span
                    className={`inline-flex px-2 py-0.5 text-[10px] rounded-full font-semibold ${AUDIT_STATUS_STYLES[log.status]}`}
                  >
                    {auditStatusLabel(log.status)}
                  </span>
                  {log.failureSummary && (
                    <p className="mt-1 text-[10px] leading-4 text-gray-500 whitespace-normal [overflow-wrap:anywhere]">
                      {log.failureSummary}
                    </p>
                  )}
                </div>
              </td>
              <td className={`${COL.view} pl-3 pr-5 py-3 text-right`}>
                <button
                  type="button"
                  onClick={() => onSelect(log)}
                  className="inline-flex items-center justify-center p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  title="View activity details"
                  aria-label="View activity details"
                >
                  <ChevronRight size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
