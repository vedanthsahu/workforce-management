"use client";

import { useEffect, useState } from "react";
import { X, Info, Minus, Plus } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { ConfigurationField, ConfigurationItem } from "../types/configuration.types";

type Props = {
  item: ConfigurationItem | null;
  /** When set, scopes the panel to editing just this one field (used by
   * Layout Visibility's Draft/Archived/Discarded cards, which each have
   * their own Edit action) instead of every field on the item. */
  fieldKey?: string | null;
  onClose: () => void;
  onSave: (id: string, description: string, fields: ConfigurationField[]) => void;
};

export default function ConfigurationDetailPanel({ item, fieldKey = null, onClose, onSave }: Props) {
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<ConfigurationField[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  // Reset the draft every time a different (or the same, freshly re-opened)
  // configuration/field is opened -- edits from a previous open shouldn't linger.
  useEffect(() => {
    if (!item) return;
    setDescription(item.description);
    setFields(fieldKey ? item.fields.filter((f) => f.key === fieldKey) : item.fields);
    setShowConfirm(false);
  }, [item, fieldKey]);

  if (!item) return null;

  const scopedField = fieldKey ? item.fields.find((f) => f.key === fieldKey) ?? null : null;
  const HeaderIcon = scopedField?.icon ?? item.icon;
  const headerIconBg = scopedField?.iconBg ?? item.iconBg;
  const headerIconColor = scopedField?.iconColor ?? item.iconColor;
  const headerTitle = scopedField ? `${scopedField.cardTitle} Setting` : item.name;

  // Rule preview and save both need every field's current value, so a
  // scoped (single-field) edit is merged back into the item's full field
  // list rather than passed around as just the one edited field.
  const mergedFields = fieldKey ? item.fields.map((f) => (f.key === fieldKey ? fields[0] ?? f : f)) : fields;

  const originalFields = fieldKey ? item.fields.filter((f) => f.key === fieldKey) : item.fields;
  const hasChanged =
    (!fieldKey && description !== item.description) ||
    fields.some((f, i) => f.value !== originalFields[i]?.value);

  const handleFieldChange = (key: string, raw: string) => {
    const parsed = Number(raw);
    setFields((prev) =>
      prev.map((f) => (f.key === key ? { ...f, value: Number.isFinite(parsed) ? Math.max(0, parsed) : 0 } : f))
    );
  };

  const handleStep = (key: string, delta: number) => {
    setFields((prev) => prev.map((f) => (f.key === key ? { ...f, value: Math.max(0, f.value + delta) } : f)));
  };

  // "Save Changes" opens a confirmation step first -- these settings take
  // effect across the live application immediately, so the admin gets one
  // more look at exactly what will change before it's applied.
  const confirmApply = () => {
    // Only fields whose value actually changed get a fresh lastUpdatedAt/By
    // stamp -- for a scoped single-field edit that's the one field; for a
    // full-item edit it's whichever of its fields the admin touched.
    const now = new Date().toISOString();
    const stampedFields = mergedFields.map((f, i) =>
      f.value !== item.fields[i]?.value ? { ...f, lastUpdatedAt: now, lastUpdatedBy: "Admin User" } : f
    );
    onSave(item.id, description, stampedFields);
    setShowConfirm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={onClose} />

      <div className="relative w-full max-w-2xl max-h-[calc(100vh-2rem)] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* HEADER */}
        <div className="flex items-start justify-between gap-3 px-7 py-6 border-b border-gray-100 bg-linear-to-r from-gray-50 to-white shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ring-4 ring-white shadow-md ${headerIconBg}`}>
              <HeaderIcon className={`w-6 h-6 ${headerIconColor}`} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900 truncate">{headerTitle}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{scopedField ? item.name : "Configuration settings"}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto scrollbar-none px-7 py-6 space-y-7">
          {/* Configuration Details -- skipped for a scoped single-field edit
           * since Description belongs to the whole configuration, not to
           * one field. Configuration Name isn't shown here since it's
           * already the modal's header title. */}
          {!scopedField && (
            <section className="space-y-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Configuration Details</h3>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors resize-none"
                />
              </div>
            </section>
          )}

          {/* Configuration Values */}
          <section className={`space-y-3 ${scopedField ? "" : "pt-2 border-t border-gray-100"}`}>
            {!scopedField && (
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 pt-4">Configuration Values</h3>
            )}
            {fields.map((f) => (
              <div key={f.key} className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                <label className="block text-sm font-semibold text-gray-800">{f.label}</label>
                <p className="text-xs text-gray-500 mt-0.5">{f.helperText}</p>
                <div className="flex items-center gap-2.5 mt-3.5">
                  <button
                    type="button"
                    onClick={() => handleStep(f.key, -1)}
                    disabled={f.value <= 0}
                    className="w-10 h-10 shrink-0 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus size={15} />
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={f.value}
                    onChange={(e) => handleFieldChange(f.key, e.target.value)}
                    className="w-full h-10 px-3 text-center text-base font-bold text-gray-900 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => handleStep(f.key, 1)}
                    className="w-10 h-10 shrink-0 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                  >
                    <Plus size={15} />
                  </button>
                  <span className="text-xs font-medium text-gray-400 w-14 shrink-0 text-right">{f.unit}</span>
                </div>
              </div>
            ))}

            <div className="flex items-start gap-2.5 rounded-xl bg-linear-to-r from-indigo-50 to-violet-50 border border-indigo-100 px-4 py-3 text-xs text-indigo-700">
              <Info size={14} className="mt-0.5 shrink-0" />
              <span>{item.describeRule(mergedFields)}</span>
            </div>
          </section>
        </div>

        {/* FOOTER */}
        <div className="flex items-center gap-3 px-7 py-5 border-t border-gray-100 bg-gray-50/60 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!hasChanged}
            onClick={() => setShowConfirm(true)}
            className="flex-1 h-10 rounded-xl bg-linear-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:from-indigo-600 disabled:to-indigo-700 transition-all shadow-sm hover:shadow-md hover:shadow-indigo-200"
          >
            Save Changes
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showConfirm}
        title="Apply these changes?"
        description={
          <>
            This will take effect across the application immediately. {item.describeRule(mergedFields)}
          </>
        }
        confirmLabel="Apply Changes"
        onConfirm={confirmApply}
        onClose={() => setShowConfirm(false)}
      />
    </div>
  );
}
