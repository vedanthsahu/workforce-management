"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GripVertical, Info, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  formatRoleLabel,
  getRoleBadgeClass,
} from "@/features/roles/utils/roles.utils";
import AuditChangesSection from "./AuditChangesSection";
import { AuditLog } from "../types/audit.types";
import {
  AUDIT_DETAIL_DEFAULT_PANEL_WIDTH as DEFAULT_PANEL_WIDTH,
  AUDIT_DETAIL_MIN_PANEL_WIDTH as MIN_PANEL_WIDTH,
} from "../utils/constants";
import {
  affectedResourceLabel,
  auditActivityLabel,
  auditCategoryLabel,
  auditStatusLabel,
  formatAuditDateTime,
  hasNoChangesData,
  initialsOf,
} from "../utils/mapAuditLog";

type Props = {
  open: boolean;
  log: AuditLog | null;
  loading: boolean;
  error: boolean;
  onOpenChange: (open: boolean) => void;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest border-b pb-1.5">
        {title}
      </h3>
      {children}
    </section>
  );
}

function InfoField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-sm text-gray-800 font-medium mt-0.5 whitespace-normal [overflow-wrap:anywhere]">
        {value || "—"}
      </p>
    </div>
  );
}

export default function AuditLogDetailSheet({
  open,
  log,
  loading,
  error,
  onOpenChange,
}: Props) {
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    if (open) {
      setPanelWidth(DEFAULT_PANEL_WIDTH);
    }
  }, [open]);

  const handleDragStart = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragState.current = { startX: e.clientX, startWidth: panelWidth };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      const move = (event: PointerEvent) => {
        if (!dragState.current) return;
        setPanelWidth(
          Math.min(
            window.innerWidth * 0.5,
            Math.max(
              MIN_PANEL_WIDTH,
              dragState.current.startWidth +
                dragState.current.startX -
                event.clientX,
            ),
          ),
        );
      };
      const up = () => {
        dragState.current = null;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [panelWidth],
  );

  const target = log?.targetEmail || log?.targetUserId;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full flex flex-col p-0"
        style={{ width: `${panelWidth}px`, maxWidth: "100vw" }}
      >
        <div
          onPointerDown={handleDragStart}
          onDoubleClick={() => setPanelWidth(DEFAULT_PANEL_WIDTH)}
          title="Drag to resize, double-click to reset"
          className="absolute left-0 top-0 bottom-0 w-2.5 -translate-x-1/2 cursor-col-resize group flex items-center justify-center z-10"
        >
          <div className="w-px h-full bg-transparent group-hover:bg-indigo-300 transition-colors" />
          <GripVertical
            size={14}
            className="absolute text-gray-300 group-hover:text-indigo-500 bg-white rounded-sm border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </div>

        {loading && (
          <div className="flex-1 flex items-center justify-center px-5 py-5">
            <p className="text-sm text-gray-400">Loading activity details…</p>
          </div>
        )}
        {!loading && error && (
          <div className="flex-1 flex items-center justify-center px-5 py-5">
            <p className="text-sm text-red-500">
              Failed to load this activity. Please try again.
            </p>
          </div>
        )}

        {!loading && !error && log && (
          <>
            <SheetHeader className="px-5 pt-5 pb-4 border-b border-gray-200 gap-2">
              <SheetTitle className="text-base font-semibold text-gray-900">
                Activity Details
              </SheetTitle>
              <p className="text-sm font-semibold text-gray-900 pr-6">
                {log.actorName} — {auditActivityLabel(log)}
              </p>
              <p className="text-xs text-gray-500">
                {target
                  ? `Affected person: ${String(target)}`
                  : affectedResourceLabel(log)}
              </p>
            </SheetHeader>

            <div className="overflow-y-auto flex-1 px-5 py-5 space-y-5">
              <div
                className={cn(
                  "flex items-start gap-2.5 px-3 py-3 rounded-xl border",
                  log.status === "SUCCESS"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : log.status === "DENIED"
                      ? "bg-amber-50 border-amber-200 text-amber-700"
                      : "bg-red-50 border-red-200 text-red-700",
                )}
              >
                <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">
                    {auditStatusLabel(log.status)}
                  </p>
                  {log.failureSummary && (
                    <p className="text-xs mt-0.5">{log.failureSummary}</p>
                  )}
                </div>
              </div>

              <InfoField
                label="Event Time"
                value={formatAuditDateTime(log.occurredAt)}
              />

              {(log.correlationId || log.requestId) && (
                <Section title="Request Reference">
                  <div className="grid grid-cols-1 gap-3">
                    {log.correlationId && (
                      <InfoField label="Correlation ID" value={log.correlationId} />
                    )}
                    {log.requestId && (
                      <InfoField label="Request ID" value={log.requestId} />
                    )}
                  </div>
                </Section>
              )}

              <Section title="Performed By">
                <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 bg-indigo-100 text-indigo-700">
                    {initialsOf(log.actorName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {log.actorName}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate">
                      {log.actorEmail}
                    </p>
                  </div>
                  {log.actorRole && (
                    <span
                      className={`inline-flex px-1.5 py-px rounded text-[9px] font-semibold uppercase tracking-wide ring-1 ${getRoleBadgeClass(log.actorRole)}`}
                    >
                      {formatRoleLabel(log.actorRole)}
                    </span>
                  )}
                </div>
              </Section>

              <Section title="Business Details">
                <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                  <InfoField label="Activity" value={auditActivityLabel(log)} />
                  <InfoField
                    label="Affected Resource"
                    value={affectedResourceLabel(log)}
                  />
                  {target != null && (
                    <InfoField label="Affected Person" value={String(target)} />
                  )}
                  <InfoField
                    label="Activity Category"
                    value={auditCategoryLabel(log.module)}
                  />
                </div>
              </Section>

              {!hasNoChangesData(log.module, log.action) && (
                <AuditChangesSection log={log} />
              )}
              {log.status !== "SUCCESS" && (
                <div className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600">
                  <Info size={14} className="shrink-0 mt-0.5" />
                  <span>No data was changed by this activity.</span>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
