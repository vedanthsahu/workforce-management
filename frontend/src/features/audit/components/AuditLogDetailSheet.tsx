"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Globe, GripVertical, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getRoleBadgeClass } from "@/features/roles/utils/roles.utils";
import AuditChangesSection from "./AuditChangesSection";
import { AuditLog } from "../types/audit.types";
import { AUDIT_STATUS_STYLES } from "../utils/constants";
import { describeAuditAction, formatAuditDateTime, hasNoChangesData, initialsOf } from "../utils/mapAuditLog";

type Props = {
  open: boolean;
  log: AuditLog | null;
  loading: boolean;
  error: boolean;
  onOpenChange: (open: boolean) => void;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest border-b pb-1.5">{title}</h3>
      {children}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-800 font-medium mt-0.5 wrap-break-word">{value || "—"}</p>
    </div>
  );
}

// Matches the old sm:max-w-md cap this panel used before it became
// resizable, so the default look is unchanged.
const DEFAULT_PANEL_WIDTH = 448;
const MIN_PANEL_WIDTH = 320;

export default function AuditLogDetailSheet({ open, log, loading, error, onOpenChange }: Props) {
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null);

  // Each open starts fresh at the default width -- a resize during one
  // viewing shouldn't carry over to the next row's details.
  useEffect(() => {
    if (open) setPanelWidth(DEFAULT_PANEL_WIDTH);
  }, [open]);

  // Dragging the handle on the panel's left edge resizes it -- it opens
  // from the right, so moving the pointer left (clientX decreasing) should
  // widen it. Capped at half the viewport (per design ask: "left till
  // center of the page") so it can never swallow the whole page.
  const handleDragStart = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragState.current = { startX: e.clientX, startWidth: panelWidth };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (!dragState.current) return;
        const delta = dragState.current.startX - moveEvent.clientX;
        const maxWidth = window.innerWidth * 0.5;
        const next = Math.min(maxWidth, Math.max(MIN_PANEL_WIDTH, dragState.current.startWidth + delta));
        setPanelWidth(next);
      };

      const handlePointerUp = () => {
        dragState.current = null;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [panelWidth]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full flex flex-col p-0"
        style={{ width: `${panelWidth}px`, maxWidth: "100vw" }}
      >
        {/* Drag handle -- left edge, full height. maxWidth:100vw above
           keeps a drag-resized width from overflowing a narrow viewport. */}
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
            <p className="text-sm text-gray-400">Loading event details…</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex-1 flex items-center justify-center px-5 py-5">
            <p className="text-sm text-red-500">Failed to load this event. Please try again.</p>
          </div>
        )}

        {!loading && !error && log && (
          <>
            <SheetHeader className="px-5 pt-5 pb-4 border-b border-gray-200 gap-2">
              <SheetTitle className="text-base font-semibold text-gray-900">Audit Log Details</SheetTitle>
              <span
                className={cn(
                  "inline-flex self-start px-2 py-0.5 text-[10px] rounded-full font-semibold uppercase",
                  AUDIT_STATUS_STYLES[log.status]
                )}
              >
                {log.status}
              </span>
              <p className="text-sm font-semibold text-gray-900">{log.actionLabel}</p>
              <p className="text-xs text-gray-500">{describeAuditAction(log)}</p>
            </SheetHeader>

            <div className="overflow-y-auto flex-1 px-5 py-5 space-y-5">
              {/* Event Time / Source */}
              <div className="grid grid-cols-2 gap-3">
                <InfoField label="Event Time" value={formatAuditDateTime(log.occurredAt)} />
                <InfoField
                  label="Source Channel"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <Globe size={12} className="text-gray-400" />
                      {log.sourceChannel}
                    </span>
                  }
                />
              </div>

              {/* Actor */}
              <Section title="User Information">
                <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 bg-indigo-100 text-indigo-700">
                    {initialsOf(log.actorName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{log.actorName}</p>
                    <p className="text-[11px] text-gray-400 truncate">{log.actorEmail}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] text-gray-400">User ID: {log.actorUserId || "—"}</span>
                    {log.actorRole && (
                      <span
                        className={`inline-flex px-1.5 py-px rounded text-[9px] font-semibold uppercase tracking-wide ring-1 ${getRoleBadgeClass(log.actorRole)}`}
                      >
                        {log.actorRole}
                      </span>
                    )}
                  </div>
                </div>
              </Section>

              {/* Event Info */}
              <Section title="Event Information">
                <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                  <InfoField label="Module" value={log.module} />
                  <InfoField label="Entity Type" value={log.entityType} />
                  <InfoField label="Action" value={log.action} />
                  <InfoField label="Request Method" value={log.requestMethod} />
                  <InfoField label="Request Path" value={log.requestPath} />
                </div>
              </Section>

              {/* Changes — CREATE/UPDATE/DELETE/AUTH/FAILED-aware, driven
                 entirely by old_values/new_values/changed_fields from the
                 backend. Only login/logout genuinely have no before/after
                 field values -- every other AUTH-module event (profile
                 updates, access/role changes, etc.) does, so those still
                 show this section like everything else. */}
              {!hasNoChangesData(log.module, log.action) && <AuditChangesSection log={log} />}

              {/* Additional Info */}
              <Section title="Additional Information">
                <div className="grid grid-cols-1 gap-3">
                  <InfoField label="IP Address" value={log.ipAddress} />
                  <InfoField
                    label="User Agent"
                    value={
                      <span className="inline-flex items-start gap-1.5">
                        <Monitor size={12} className="text-gray-400 mt-0.5 shrink-0" />
                        <span className="break-all">{log.userAgent}</span>
                      </span>
                    }
                  />
                </div>
              </Section>

              {/* Timestamps */}
              <Section title="Timestamps">
                <div className="grid grid-cols-2 gap-3">
                  <InfoField label="Occurred At" value={formatAuditDateTime(log.occurredAt)} />
                  <InfoField label="Created At" value={formatAuditDateTime(log.createdAt)} />
                </div>
              </Section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
