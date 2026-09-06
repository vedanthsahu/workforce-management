"use client";

import { useState } from "react";
import { ArrowRight, Check, ChevronDown, Copy, PlusCircle, ShieldOff, Trash2 } from "lucide-react";
import { AuditLog } from "../types/audit.types";
import {
  formatEntityLabel,
  formatFieldLabel,
  formatFieldValue,
  getAuditEventCategory,
  updateFieldKeys,
} from "../utils/mapAuditLog";

type Props = {
  log: AuditLog;
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest border-b pb-1.5">{children}</h3>;
}

type BannerTone = "create" | "delete" | "auth" | "failed";

const BANNER_TONE_STYLES: Record<BannerTone, string> = {
  create: "bg-emerald-50 border-emerald-200 text-emerald-700",
  delete: "bg-red-50 border-red-200 text-red-700",
  auth: "bg-gray-50 border-gray-200 text-gray-500",
  failed: "bg-red-50 border-red-200 text-red-700",
};

function Banner({
  icon: Icon,
  tone,
  children,
}: {
  icon: React.ElementType;
  tone: BannerTone;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium ${BANNER_TONE_STYLES[tone]}`}>
      <Icon size={14} className="shrink-0" />
      {children}
    </div>
  );
}

function FieldListRow({ label, value }: { label: string; value: unknown }) {
  const formatted = formatFieldValue(value);
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-gray-100 last:border-b-0">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span
        className={`text-xs font-medium text-right wrap-break-word ${formatted === "Not set" ? "text-gray-400 italic" : "text-gray-800"}`}
      >
        {formatted}
      </span>
    </div>
  );
}

function FieldDiffRow({ label, oldValue, newValue }: { label: string; oldValue: unknown; newValue: unknown }) {
  return (
    <div className="py-2 border-b border-gray-100 last:border-b-0">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-red-500 line-through wrap-break-word">{formatFieldValue(oldValue)}</span>
        <ArrowRight size={12} className="text-gray-300 shrink-0" />
        <span className="text-xs font-semibold text-emerald-700 wrap-break-word">{formatFieldValue(newValue)}</span>
      </div>
    </div>
  );
}

function RawJsonToggle({ oldValues, newValues }: { oldValues: Record<string, unknown> | null; newValues: Record<string, unknown> | null }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify({ old_values: oldValues, new_values: newValues }, null, 2);

  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-gray-600 transition-colors"
      >
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        View raw JSON
      </button>
      {open && (
        <div className="mt-2 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-end px-2 py-1.5 border-b border-gray-200">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(json);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                } catch {
                  // Clipboard access can be denied by the browser — silently ignore.
                }
              }}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title="Copy"
            >
              {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
            </button>
          </div>
          <pre className="px-3 py-2.5 text-[11px] leading-relaxed text-gray-700 overflow-x-auto whitespace-pre">{json}</pre>
        </div>
      )}
    </div>
  );
}

export default function AuditChangesSection({ log }: Props) {
  const category = getAuditEventCategory(log);

  if (category === "NONE") {
    return (
      <div className="space-y-3">
        <SectionTitle>Changes</SectionTitle>
        <p className="text-xs text-gray-400 italic">No change data available for this event.</p>
      </div>
    );
  }

  if (category === "AUTH") {
    return (
      <div className="space-y-3">
        <SectionTitle>Changes</SectionTitle>
        <Banner icon={ShieldOff} tone="auth">
          No data changes were made.
        </Banner>
      </div>
    );
  }

  if (category === "CREATE") {
    const fields = Object.keys(log.newValues ?? {});
    return (
      <div className="space-y-3">
        <SectionTitle>Changes</SectionTitle>
        <Banner icon={PlusCircle} tone="create">
          New {formatEntityLabel(log.entityType, log.module)} created
        </Banner>
        {fields.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl px-3">
            {fields.map((key) => (
              <FieldListRow key={key} label={formatFieldLabel(key)} value={log.newValues?.[key]} />
            ))}
          </div>
        )}
        <RawJsonToggle oldValues={log.oldValues} newValues={log.newValues} />
      </div>
    );
  }

  if (category === "DELETE") {
    const fields = Object.keys(log.oldValues ?? {});
    return (
      <div className="space-y-3">
        <SectionTitle>Changes</SectionTitle>
        <Banner icon={Trash2} tone="delete">
          This {formatEntityLabel(log.entityType, log.module)} was deleted
        </Banner>
        {fields.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl px-3">
            {fields.map((key) => (
              <FieldListRow key={key} label={formatFieldLabel(key)} value={log.oldValues?.[key]} />
            ))}
          </div>
        )}
        <RawJsonToggle oldValues={log.oldValues} newValues={log.newValues} />
      </div>
    );
  }

  if (category === "UPDATE") {
    const keys = updateFieldKeys(log);
    return (
      <div className="space-y-3">
        <SectionTitle>Changes</SectionTitle>
        {keys.length > 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl px-3">
            {keys.map((key) => (
              <FieldDiffRow key={key} label={formatFieldLabel(key)} oldValue={log.oldValues?.[key]} newValue={log.newValues?.[key]} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">No individual field changes were recorded for this update.</p>
        )}
        <RawJsonToggle oldValues={log.oldValues} newValues={log.newValues} />
      </div>
    );
  }

  // FAILED — status/code/reason first, then whatever old/new-values payload
  // (if any) is available, rendered with the same create/update/delete
  // shape-based logic as a successful event would use.
  const hasOld = !!log.oldValues && Object.keys(log.oldValues).length > 0;
  const hasNew = !!log.newValues && Object.keys(log.newValues).length > 0;
  const keys = hasOld && hasNew ? updateFieldKeys(log) : Object.keys((hasNew ? log.newValues : log.oldValues) ?? {});

  return (
    <div className="space-y-3">
      <SectionTitle>Changes</SectionTitle>
      <div className="space-y-2">
        <Banner icon={ShieldOff} tone="failed">
          {log.status} — {formatEntityLabel(log.entityType, log.module)} event ({log.requestMethod})
        </Banner>
        {log.failureCode && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Failure Code</span>
            <span className="inline-flex px-2 py-0.5 text-[10px] rounded-full font-semibold bg-red-100 text-red-700">
              {log.failureCode}
            </span>
          </div>
        )}
        {log.failureReason && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">{log.failureReason}</p>
        )}
      </div>

      {(hasOld || hasNew) && keys.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl px-3">
          {keys.map((key) =>
            hasOld && hasNew ? (
              <FieldDiffRow key={key} label={formatFieldLabel(key)} oldValue={log.oldValues?.[key]} newValue={log.newValues?.[key]} />
            ) : (
              <FieldListRow key={key} label={formatFieldLabel(key)} value={(hasNew ? log.newValues : log.oldValues)?.[key]} />
            )
          )}
        </div>
      )}

      {(hasOld || hasNew) && <RawJsonToggle oldValues={log.oldValues} newValues={log.newValues} />}
    </div>
  );
}
