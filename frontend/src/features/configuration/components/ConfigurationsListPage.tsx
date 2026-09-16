"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Info, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CONFIGURATION_SECTIONS, INITIAL_CONFIGURATIONS } from "../utils/configurationData";
import type { ConfigurationField, ConfigurationItem } from "../types/configuration.types";
import {
  fetchBookingPolicy,
  fetchLayoutPolicy,
  updateBookingPolicy,
  updateLayoutPolicy,
} from "../services/configuration.service";

// Only these items are backed by a real tenant business rule (see
// backend/services/business_rule_service.py). "Max future bookings" /
// "max bookings within N days" concepts were removed from this page
// entirely -- nothing in the booking flow actually enforces either of
// them, they were mock-only placeholders with no server-side counterpart
// (see the Configuration-page audit that found this). Only
// activity-table-record-count remains an unbacked, local-only mock.
const BACKED_ITEM_IDS = new Set([
  "new-layout-publishing",
  "booking-calendar-employee",
  "visitor-booking",
  "layout-visibility",
]);

function withFieldValue(fields: ConfigurationField[], key: string, value: number): ConfigurationField[] {
  return fields.map((f) => (f.key === key ? { ...f, value } : f));
}

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
  readOnly = false,
}: {
  label: string;
  description: string;
  value: number;
  unit: string;
  onChange: (raw: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-4">
      <div className="min-w-0">
        <p className="text-sm font-normal text-black">
          {label}
          {readOnly && <span className="ml-1.5 text-xs text-gray-400 font-normal">(calculated)</span>}
        </p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <input
          type="number"
          min={0}
          value={value}
          readOnly={readOnly}
          onChange={(e) => !readOnly && onChange(e.target.value)}
          className={`w-20 h-10 px-3 text-center text-sm font-semibold rounded-lg border transition-colors ${
            readOnly
              ? "border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed"
              : "border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
          }`}
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Replace the hardcoded mock values for backend-backed items with the
  // tenant's real, currently-effective ones as soon as they load -- until
  // then the page still renders instantly with the mock defaults instead
  // of a blank/loading state.
  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchBookingPolicy(), fetchLayoutPolicy()])
      .then(([booking, layout]) => {
        if (cancelled) return;
        setConfigurations((prev) =>
          prev.map((c) => {
            if (c.id === "new-layout-publishing") {
              let fields = withFieldValue(c.fields, "days", layout.buffer_days);
              fields = withFieldValue(fields, "totalDays", layout.min_advance_days);
              return { ...c, fields };
            }
            if (c.id === "booking-calendar-employee") {
              return { ...c, fields: withFieldValue(c.fields, "durationDays", booking.employee_max_advance_days) };
            }
            if (c.id === "visitor-booking") {
              return { ...c, fields: withFieldValue(c.fields, "durationDays", booking.guest_max_advance_days) };
            }
            if (c.id === "layout-visibility") {
              let fields = withFieldValue(c.fields, "draftDays", layout.visibility_days.draft);
              fields = withFieldValue(fields, "archivedDays", layout.visibility_days.archived);
              fields = withFieldValue(fields, "discardedDays", layout.visibility_days.deleted);
              return { ...c, fields };
            }
            return c;
          }),
        );
      })
      .catch(() => {
        // Real values failed to load -- the mock defaults stay on screen
        // rather than the page breaking; Save still round-trips to the
        // backend and will surface its own error if that's still down.
      });

    return () => {
      cancelled = true;
    };
  }, []);

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

  // Save applies every dirty item in this batch. Backed items (see
  // BACKED_ITEM_IDS) round-trip through the real business-rule API one at a
  // time; unbacked items just apply their draft value locally, matching the
  // previous per-item modal's behavior now folded into one multi-item save.
  const confirmApply = async () => {
    setErrorMessage(null);
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const changedItemIds = Array.from(new Set(changedRows.map((r) => r.key.split(":")[0])));

      let nextConfigurations = configurations;

      for (const itemId of changedItemIds) {
        const item = nextConfigurations.find((c) => c.id === itemId);
        if (!item) continue;

        const fieldsWithDraft = item.fields.map((f) => {
          const key = draftKey(itemId, f.key);
          return key in draft ? { ...f, value: draft[key] } : f;
        });

        let resolvedFields = fieldsWithDraft;

        if (BACKED_ITEM_IDS.has(itemId)) {
          if (itemId === "new-layout-publishing") {
            const days = fieldsWithDraft.find((f) => f.key === "days")?.value;
            const result = await updateLayoutPolicy({ buffer_days: days });
            resolvedFields = withFieldValue(fieldsWithDraft, "days", result.buffer_days);
            resolvedFields = withFieldValue(resolvedFields, "totalDays", result.min_advance_days);
          } else if (itemId === "booking-calendar-employee") {
            const durationDays = fieldsWithDraft.find((f) => f.key === "durationDays")?.value;
            const result = await updateBookingPolicy({ employee_max_advance_days: durationDays });
            resolvedFields = withFieldValue(fieldsWithDraft, "durationDays", result.employee_max_advance_days);
            // The layout card's "Effective After (Total)" is derived from
            // this same window -- refresh it too so it doesn't go stale
            // until that card happens to be opened/saved next. Applied
            // directly to nextConfigurations since that item may not itself
            // be part of this save batch.
            try {
              const layoutResult = await fetchLayoutPolicy();
              nextConfigurations = nextConfigurations.map((c) =>
                c.id === "new-layout-publishing"
                  ? { ...c, fields: withFieldValue(c.fields, "totalDays", layoutResult.min_advance_days) }
                  : c,
              );
            } catch {
              // Non-fatal -- the booking window save itself already succeeded.
            }
          } else if (itemId === "visitor-booking") {
            const durationDays = fieldsWithDraft.find((f) => f.key === "durationDays")?.value;
            const result = await updateBookingPolicy({ guest_max_advance_days: durationDays });
            resolvedFields = withFieldValue(fieldsWithDraft, "durationDays", result.guest_max_advance_days);
          } else if (itemId === "layout-visibility") {
            const draftDays = fieldsWithDraft.find((f) => f.key === "draftDays")?.value;
            const archivedDays = fieldsWithDraft.find((f) => f.key === "archivedDays")?.value;
            const discardedDays = fieldsWithDraft.find((f) => f.key === "discardedDays")?.value;
            const result = await updateLayoutPolicy({
              visibility_days: { draft: draftDays, archived: archivedDays, deleted: discardedDays },
            });
            resolvedFields = withFieldValue(fieldsWithDraft, "draftDays", result.visibility_days.draft);
            resolvedFields = withFieldValue(resolvedFields, "archivedDays", result.visibility_days.archived);
            resolvedFields = withFieldValue(resolvedFields, "discardedDays", result.visibility_days.deleted);
          }
        }

        nextConfigurations = nextConfigurations.map((c) =>
          c.id === itemId
            ? { ...c, fields: resolvedFields, lastUpdatedAt: now, lastUpdatedBy: "Admin User" }
            : c,
        );
      }

      setConfigurations(nextConfigurations);
      setDraft({});
      setShowConfirm(false);
      setSavedMessage("Configuration updated successfully.");
      setTimeout(() => setSavedMessage(null), 4000);
    } catch {
      setErrorMessage("Failed to save one or more configuration changes. Please try again.");
    } finally {
      setSaving(false);
    }
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

        {errorMessage && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm font-medium text-red-700">
            <div className="flex items-center gap-2">
              <Info size={16} />
              {errorMessage}
            </div>
            <button onClick={() => setErrorMessage(null)} className="p-1 rounded hover:opacity-70">
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
                          readOnly={f.readOnly}
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
            disabled={!hasChanges || saving}
            onClick={handleDiscard}
            className={`h-9 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${
              hasChanges ? "text-black" : "text-gray-700"
            }`}
          >
            Discard
          </button>
          <button
            type="button"
            disabled={!hasChanges || saving}
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
        confirmLabel={saving ? "Saving..." : "Apply Changes"}
        loading={saving}
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
