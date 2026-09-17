"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Info, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CONFIGURATION_SECTIONS, INITIAL_CONFIGURATIONS } from "../utils/configurationData";
import type { ConfigurationItem } from "../types/configuration.types";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function draftKey(itemId: string, fieldKey: string): string {
  return `${itemId}:${fieldKey}`;
}

type ChangedRow = {
  key: string;
  label: string;
  from: number;
  to: number;
  unit: string;
};

/** One editable setting row: label + helper text on the left, a compact
 * number input + unit on the right. Layout Visibility's fields use their
 * own cardTitle/cardDescription (shorter, purpose-built for this row);
 * every other field uses its regular label/helperText. */
function SettingRow({
  label,
  description,
  value,
  unit,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  unit: string;
  onChange: (raw: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-4">
      <div className="min-w-0">
        <p className="text-sm font-normal text-black">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 h-10 px-3 text-center text-sm font-semibold text-gray-900 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        />
        <span className="text-xs font-medium text-gray-400 w-16">{unit}</span>
      </div>
    </div>
  );
}

export default function ConfigurationsListPage() {
  const [configurations, setConfigurations] = useState<ConfigurationItem[]>(INITIAL_CONFIGURATIONS);
  // Keyed by "<itemId>:<fieldKey>" -- only touched fields get an entry, so
  // "is this field dirty" is just "is its key present here", not a value
  // comparison that could false-negative if someone types back to the
  // original number.
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const getItem = (id: string) => configurations.find((c) => c.id === id);

  const changedRows = useMemo<ChangedRow[]>(() => {
    const rows: ChangedRow[] = [];
    for (const item of configurations) {
      for (const f of item.fields) {
        const key = draftKey(item.id, f.key);
        if (key in draft && draft[key] !== f.value) {
          const label = item.multiField ? f.cardTitle ?? f.label : f.label;
          rows.push({ key, label, from: f.value, to: draft[key], unit: f.unit });
        }
      }
    }
    return rows;
  }, [configurations, draft]);

  const hasChanges = changedRows.length > 0;

  const handleFieldChange = (itemId: string, fieldKey: string, raw: string) => {
    const parsed = Number(raw);
    setDraft((prev) => ({
      ...prev,
      [draftKey(itemId, fieldKey)]: Number.isFinite(parsed) ? Math.max(0, parsed) : 0,
    }));
  };

  const handleDiscard = () => setDraft({});

  const confirmApply = () => {
    const now = new Date().toISOString();
    setConfigurations((prev) =>
      prev.map((item) => {
        let itemChanged = false;
        const fields = item.fields.map((f) => {
          const key = draftKey(item.id, f.key);
          if (key in draft && draft[key] !== f.value) {
            itemChanged = true;
            return { ...f, value: draft[key], lastUpdatedAt: now, lastUpdatedBy: "Admin User" };
          }
          return f;
        });
        return itemChanged ? { ...item, fields, lastUpdatedAt: now, lastUpdatedBy: "Admin User" } : item;
      })
    );
    setDraft({});
    setShowConfirm(false);
    setSavedMessage("Configuration updated successfully.");
    setTimeout(() => setSavedMessage(null), 4000);
  };

  const mostRecentUpdate = useMemo(
    () =>
      configurations.reduce((latest, item) =>
        new Date(item.lastUpdatedAt) > new Date(latest.lastUpdatedAt) ? item : latest
      ),
    [configurations]
  );

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-clip bg-[#f8fafc]">
      <div className="p-5 sm:p-8 space-y-6 pb-28">
        {savedMessage && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-green-200 bg-green-50 text-sm font-medium text-green-700">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <CheckCircle2 size={14} className="text-green-600" />
              </span>
              {savedMessage}
            </div>
            <button onClick={() => setSavedMessage(null)} className="p-1 rounded hover:bg-green-100/70 transition-colors">
              <X size={14} />
            </button>
          </div>
        )}

        {/* HEADER */}
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Configuration</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Update your settings, then save your changes.
          </p>
        </div>

        {/* SETTINGS PANEL */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm divide-y divide-gray-100">
          {CONFIGURATION_SECTIONS.map((section) => {
            const items = section.itemIds
              .map(getItem)
              .filter((i): i is ConfigurationItem => !!i);
            if (items.length === 0) return null;

            return (
              <div key={section.id} className="px-5 sm:px-6 py-5">
                <div className="flex items-start gap-3 mb-1">
                  <div className="w-1 self-stretch rounded-full bg-linear-to-b from-indigo-500 to-indigo-300 mt-0.5" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
                  </div>
                </div>

                <div className="pl-4 divide-y divide-gray-100">
                  {items.flatMap((item) =>
                    item.fields.map((f) => {
                      const key = draftKey(item.id, f.key);
                      const value = key in draft ? draft[key] : f.value;
                      // Single-setting items show the item's own name/description
                      // (the original, fuller wording); an item with more than one
                      // field needs each row to carry its own label so the rows
                      // stay distinguishable (Visitor Booking's two fields,
                      // Layout Visibility's Draft/Archived/Discarded cards).
                      const label = item.multiField
                        ? f.cardTitle ?? f.label
                        : item.fields.length === 1
                        ? item.name
                        : f.label;
                      const description = item.multiField
                        ? f.cardDescription ?? f.helperText
                        : item.fields.length === 1
                        ? item.description
                        : f.helperText;

                      return (
                        <SettingRow
                          key={key}
                          label={label}
                          description={description}
                          value={value}
                          unit={f.unit}
                          onChange={(raw) => handleFieldChange(item.id, f.key, raw)}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* NOTE */}
        <div className="flex items-start gap-4 bg-linear-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl px-5 py-4 shadow-sm">
          <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
            <Info size={15} className="text-indigo-500" />
          </span>
          <div>
            <p className="text-sm font-semibold text-indigo-900">Note</p>
            <p className="text-xs text-indigo-700 mt-1">
              These configuration settings control key application behaviors. Changes will be applied across the
              system based on the defined rules.
            </p>
          </div>
        </div>

        {/* UPDATE DETAILS */}
        <div>
          <button
            type="button"
            onClick={() => setDetailsOpen((o) => !o)}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronDown size={14} className={`transition-transform ${detailsOpen ? "" : "-rotate-90"}`} />
            Update details
          </button>
          {detailsOpen && (
            <p className="text-xs text-black mt-1.5 ml-[21px]">
              All settings last updated {formatDateTime(mostRecentUpdate.lastUpdatedAt)} by {mostRecentUpdate.lastUpdatedBy}.
            </p>
          )}
        </div>
      </div>

      {/* STICKY SAVE BAR */}
      <div className="sticky bottom-0 left-0 right-0 flex items-center justify-between gap-4 px-5 sm:px-8 py-4 bg-white/95 backdrop-blur border-t border-gray-200">
        <span className={`text-xs sm:text-sm ${hasChanges ? "text-black" : "text-gray-500"}`}>
          {hasChanges
            ? `${changedRows.length} unsaved change${changedRows.length > 1 ? "s" : ""}`
            : "No unsaved changes"}
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={!hasChanges}
            onClick={handleDiscard}
            className={`h-9 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${
              hasChanges ? "text-black" : "text-gray-700"
            }`}
          >
            Discard
          </button>
          <button
            type="button"
            disabled={!hasChanges}
            onClick={() => setShowConfirm(true)}
            className="h-9 px-4 rounded-xl bg-linear-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:from-indigo-600 disabled:to-indigo-700 transition-all shadow-sm hover:shadow-md hover:shadow-indigo-200"
          >
            Save changes
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showConfirm}
        title="Apply these changes?"
        description="This will take effect across the application immediately."
        confirmLabel="Apply Changes"
        onConfirm={confirmApply}
        onClose={() => setShowConfirm(false)}
      >
        <ul className="space-y-1.5 text-xs text-gray-600">
          {changedRows.map((row) => (
            <li key={row.key} className="flex items-center justify-between gap-3">
              <span>{row.label}</span>
              <span className="font-medium text-gray-900">
                {row.from} → {row.to} {row.unit}
              </span>
            </li>
          ))}
        </ul>
      </ConfirmDialog>
    </div>
  );
}
