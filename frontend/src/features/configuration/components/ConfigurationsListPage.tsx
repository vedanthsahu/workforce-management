"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Info, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ConfigurationSkeleton } from "./ConfigurationSkeleton";
import {
  CONFIGURATION_SECTIONS,
  INITIAL_CONFIGURATIONS,
} from "../utils/configurationData";
import type {
  ConfigurationField,
  ConfigurationItem,
} from "../types/configuration.types";
import {
  fetchActivityPolicy,
  fetchBlockedSeatPolicy,
  fetchBookingPolicy,
  fetchChatbotPolicy,
  fetchLayoutPolicy,
  updateBusinessRules,
  type BusinessRuleUpdate,
} from "../services/configuration.service";

// Only these items are backed by a real tenant business rule (see
// backend/services/business_rule_service.py). "Max future bookings" /
// "max bookings within N days" concepts were removed from this page
// entirely -- nothing in the booking flow actually enforces either of
// them, they were mock-only placeholders with no server-side counterpart
// (see the Configuration-page audit that found this).
const BACKED_ITEM_IDS = new Set([
  "activity-table-record-count",
  "new-layout-publishing",
  "booking-calendar-employee",
  "visitor-booking",
  "layout-visibility",
  "blocked-seat-policy",
]);

function withFieldValue(
  fields: ConfigurationField[],
  key: string,
  value: number,
): ConfigurationField[] {
  return fields.map((f) => (f.key === key ? { ...f, value } : f));
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

const POSITIVE_VALUE_ERROR = "Value should be greater than 0.";

// Per-field upper bounds, keyed by draftKey(itemId, fieldKey). Fields not
// listed here only need to be > 0. The activity record count is capped at
// 100 because the admin activities API never returns more than 100 rows.
const FIELD_MAX_VALUES: Record<string, number> = {
  "activity-table-record-count:records": 100,
};

const rangeError = (max: number) =>
  `Value should be greater than 0 and less than or equal to ${max}.`;

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
  error,
  readOnly = false,
}: {
  label: string;
  description: string;
  value: number | string;
  unit: string;
  onChange: (raw: string) => void;
  error?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-4 px-2 -mx-2 rounded-lg transition-colors hover:bg-gray-50">
      <div className="min-w-0">
        <p className="text-sm font-normal text-black">
          {label}
          {readOnly && (
            <span className="ml-1.5 text-xs text-gray-400 font-normal">
              (calculated)
            </span>
          )}
        </p>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      <div className="w-48 shrink-0">
        <div className="flex items-center gap-2.5">
          <input
            type="number"
            min={1}
            value={value}
            readOnly={readOnly}
            aria-invalid={!!error}
            onChange={(e) => !readOnly && onChange(e.target.value)}
            className={`w-20 h-10 px-3 text-center text-sm font-semibold rounded-lg border transition-colors ${
              readOnly
                ? "border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed"
                : error
                  ? "border-red-400 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-200"
                  : "border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            }`}
          />
          <span className="text-xs font-medium text-gray-400 w-16">{unit}</span>
        </div>
        {error && (
          <p className="mt-1 text-xs font-medium text-red-600">{error}</p>
        )}
      </div>
    </div>
  );
}

function ChatbotToggleRow({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-4 px-2 -mx-2 rounded-lg transition-colors hover:bg-gray-50">
      <div className="min-w-0">
        <p className="text-sm font-normal text-black">Employee chatbot access</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Show the chatbot floating button when an employee is logged in.
        </p>
      </div>
      <div className="w-48 shrink-0 flex items-center">
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Employee chatbot access"
          onClick={() => onChange(!enabled)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
            enabled ? "bg-indigo-600" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
              enabled ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

export default function ConfigurationsListPage() {
  const [configurations, setConfigurations] = useState<ConfigurationItem[]>(
    INITIAL_CONFIGURATIONS,
  );
  // Keyed by "<itemId>:<fieldKey>" -- only touched fields get an entry, so
  // "is this field dirty" is just "is its key present here", not a value
  // comparison that could false-negative if someone types back to the
  // original number.
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [chatbotEnabled, setChatbotEnabled] = useState(false);
  const [savedChatbotEnabled, setSavedChatbotEnabled] = useState(false);

  // The page scrolls, so an error banner at the top can be off-screen when
  // the user saved from further down -- bring it into view when it appears.
  const errorBannerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (errorMessage) errorBannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [errorMessage]);
  const [loading, setLoading] = useState(true);

  // Replace the hardcoded mock values for backend-backed items with the
  // tenant's real, currently-effective ones as soon as they load. The
  // ConfigurationSkeleton (below) stays up for exactly as long as this
  // real fetch takes, not a fixed/fake delay.
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetchBookingPolicy(),
      fetchLayoutPolicy(),
      fetchBlockedSeatPolicy(),
      fetchActivityPolicy(),
      fetchChatbotPolicy(),
    ])
      .then(([booking, layout, blockedSeat, activity, chatbot]) => {
        if (cancelled) return;
        setChatbotEnabled(chatbot.employee_access_enabled);
        setSavedChatbotEnabled(chatbot.employee_access_enabled);
        setConfigurations((prev) =>
          prev.map((c) => {
            if (c.id === "activity-table-record-count") {
              return {
                ...c,
                fields: withFieldValue(c.fields, "records", activity.record_count),
              };
            }
            if (c.id === "new-layout-publishing") {
              let fields = withFieldValue(c.fields, "days", layout.buffer_days);
              fields = withFieldValue(
                fields,
                "totalDays",
                layout.min_advance_days,
              );
              return { ...c, fields };
            }
            if (c.id === "booking-calendar-employee") {
              return {
                ...c,
                fields: withFieldValue(
                  c.fields,
                  "durationDays",
                  booking.employee_max_advance_days,
                ),
              };
            }
            if (c.id === "visitor-booking") {
              return {
                ...c,
                fields: withFieldValue(
                  c.fields,
                  "durationDays",
                  booking.guest_max_advance_days,
                ),
              };
            }
            if (c.id === "layout-visibility") {
              let fields = withFieldValue(
                c.fields,
                "draftDays",
                layout.visibility_days.draft,
              );
              fields = withFieldValue(
                fields,
                "archivedDays",
                layout.visibility_days.archived,
              );
              fields = withFieldValue(
                fields,
                "discardedDays",
                layout.visibility_days.deleted,
              );
              return { ...c, fields };
            }
            if (c.id === "blocked-seat-policy") {
              let fields = withFieldValue(
                c.fields,
                "upcomingDays",
                blockedSeat.upcoming_days,
              );
              fields = withFieldValue(
                fields,
                "expiringSoonDays",
                blockedSeat.expiring_soon_days,
              );
              fields = withFieldValue(
                fields,
                "expiredWindowDays",
                blockedSeat.expired_window_days,
              );
              fields = withFieldValue(
                fields,
                "maxAdvanceDays",
                blockedSeat.max_advance_days,
              );
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
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
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
        if (key in draft && Number(draft[key]) !== f.value) {
          const label = item.multiField ? (f.cardTitle ?? f.label) : f.label;
          rows.push({
            key,
            label,
            from: f.value,
            to: Number(draft[key]),
            unit: f.unit,
          });
        }
      }
    }
    return rows;
  }, [configurations, draft]);

  const chatbotHasChanges = chatbotEnabled !== savedChatbotEnabled;
  const hasChanges = changedRows.length > 0 || chatbotHasChanges;
  // draftKey -> error message for every field whose current value is invalid.
  const fieldErrors = useMemo(() => {
    const errors = new Map<string, string>();
    for (const item of configurations) {
      for (const field of item.fields) {
        if (field.readOnly) continue;
        const key = draftKey(item.id, field.key);
        const rawValue = key in draft ? draft[key] : String(field.value);
        const value = Number(rawValue);
        const max = FIELD_MAX_VALUES[key];
        const tooLow = rawValue.trim() === "" || !Number.isFinite(value) || value <= 0;
        const tooHigh = max !== undefined && value > max;
        if (tooLow || tooHigh) {
          errors.set(key, max !== undefined ? rangeError(max) : POSITIVE_VALUE_ERROR);
        }
      }
    }
    return errors;
  }, [configurations, draft]);
  const hasInvalidValues = fieldErrors.size > 0;

  const handleFieldChange = (itemId: string, fieldKey: string, raw: string) => {
    const normalized = raw.replace(/^0+(?=\d)/, "");
    setDraft((prev) => ({
      ...prev,
      [draftKey(itemId, fieldKey)]: normalized,
    }));
  };

  const handleDiscard = () => {
    setDraft({});
    setChatbotEnabled(savedChatbotEnabled);
  };

  // Save applies every dirty item in this batch. Unbacked items just apply
  // their draft value locally. Backed items (see BACKED_ITEM_IDS) and the
  // chatbot toggle go into one batch of {id, value} settings and round-trip
  // through a single POST /business-rules -- not one PATCH per card -- and
  // the combined response refreshes every backed card at once (including
  // derived fields like the layout card's "Effective After (Total)", which
  // used to need its own extra fetch after a booking-policy save).
  const confirmApply = async () => {
    if (hasInvalidValues) {
      setErrorMessage(fieldErrors.values().next().value ?? POSITIVE_VALUE_ERROR);
      setShowConfirm(false);
      return;
    }
    setErrorMessage(null);
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const changedItemIds = Array.from(
        new Set(changedRows.map((r) => r.key.split(":")[0])),
      );

      // Apply every changed item's draft value locally first and stamp who
      // touched it. Backed items get their fields overwritten below with
      // the server's confirmed values once the batch save succeeds.
      let nextConfigurations = configurations.map((item) => {
        if (!changedItemIds.includes(item.id)) return item;
        const fields = item.fields.map((f) => {
          const key = draftKey(item.id, f.key);
          return key in draft ? { ...f, value: Number(draft[key]) } : f;
        });
        return { ...item, fields, lastUpdatedAt: now, lastUpdatedBy: "Admin User" };
      });

      const getDraftValue = (itemId: string, fieldKey: string): number =>
        nextConfigurations
          .find((c) => c.id === itemId)
          ?.fields.find((f) => f.key === fieldKey)?.value ?? 0;

      const updates: BusinessRuleUpdate[] = [];
      for (const itemId of changedItemIds) {
        if (!BACKED_ITEM_IDS.has(itemId)) continue;
        if (itemId === "activity-table-record-count") {
          updates.push({
            id: "activity_policy.record_count",
            value: getDraftValue(itemId, "records"),
          });
        } else if (itemId === "new-layout-publishing") {
          updates.push({
            id: "layout_policy.buffer_days",
            value: getDraftValue(itemId, "days"),
          });
        } else if (itemId === "booking-calendar-employee") {
          updates.push({
            id: "booking_policy.employee_max_advance_days",
            value: getDraftValue(itemId, "durationDays"),
          });
        } else if (itemId === "visitor-booking") {
          updates.push({
            id: "booking_policy.guest_max_advance_days",
            value: getDraftValue(itemId, "durationDays"),
          });
        } else if (itemId === "layout-visibility") {
          updates.push(
            { id: "layout_policy.visibility_days.draft", value: getDraftValue(itemId, "draftDays") },
            { id: "layout_policy.visibility_days.archived", value: getDraftValue(itemId, "archivedDays") },
            { id: "layout_policy.visibility_days.deleted", value: getDraftValue(itemId, "discardedDays") },
          );
        } else if (itemId === "blocked-seat-policy") {
          updates.push(
            { id: "blocked_seat_policy.upcoming_days", value: getDraftValue(itemId, "upcomingDays") },
            { id: "blocked_seat_policy.expiring_soon_days", value: getDraftValue(itemId, "expiringSoonDays") },
            { id: "blocked_seat_policy.expired_window_days", value: getDraftValue(itemId, "expiredWindowDays") },
            { id: "blocked_seat_policy.max_advance_days", value: getDraftValue(itemId, "maxAdvanceDays") },
          );
        }
      }
      if (chatbotHasChanges) {
        updates.push({ id: "chatbot_policy.employee_access_enabled", value: chatbotEnabled });
      }

      if (updates.length > 0) {
        const result = await updateBusinessRules(updates);

        nextConfigurations = nextConfigurations.map((c) => {
          if (c.id === "activity-table-record-count") {
            return { ...c, fields: withFieldValue(c.fields, "records", result.activity_policy.record_count) };
          }
          if (c.id === "new-layout-publishing") {
            let fields = withFieldValue(c.fields, "days", result.layout_policy.buffer_days);
            fields = withFieldValue(fields, "totalDays", result.layout_policy.min_advance_days);
            return { ...c, fields };
          }
          if (c.id === "booking-calendar-employee") {
            return { ...c, fields: withFieldValue(c.fields, "durationDays", result.booking_policy.employee_max_advance_days) };
          }
          if (c.id === "visitor-booking") {
            return { ...c, fields: withFieldValue(c.fields, "durationDays", result.booking_policy.guest_max_advance_days) };
          }
          if (c.id === "layout-visibility") {
            let fields = withFieldValue(c.fields, "draftDays", result.layout_policy.visibility_days.draft);
            fields = withFieldValue(fields, "archivedDays", result.layout_policy.visibility_days.archived);
            fields = withFieldValue(fields, "discardedDays", result.layout_policy.visibility_days.deleted);
            return { ...c, fields };
          }
          if (c.id === "blocked-seat-policy") {
            let fields = withFieldValue(c.fields, "upcomingDays", result.blocked_seat_policy.upcoming_days);
            fields = withFieldValue(fields, "expiringSoonDays", result.blocked_seat_policy.expiring_soon_days);
            fields = withFieldValue(fields, "expiredWindowDays", result.blocked_seat_policy.expired_window_days);
            fields = withFieldValue(fields, "maxAdvanceDays", result.blocked_seat_policy.max_advance_days);
            return { ...c, fields };
          }
          return c;
        });

        setChatbotEnabled(result.chatbot_policy.employee_access_enabled);
        setSavedChatbotEnabled(result.chatbot_policy.employee_access_enabled);
      }

      setConfigurations(nextConfigurations);
      setDraft({});
      setShowConfirm(false);
      setSavedMessage("Configuration updated successfully.");
      setTimeout(() => setSavedMessage(null), 4000);
    } catch {
      // Close the confirm dialog in the same update as raising the error so
      // the banner isn't hidden behind the modal.
      setShowConfirm(false);
      setErrorMessage(
        "Failed to save one or more configuration changes. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ConfigurationSkeleton />;
  }

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
            <button
              onClick={() => setSavedMessage(null)}
              className="p-1 rounded hover:bg-green-100/70 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {errorMessage && (
          <div
            ref={errorBannerRef}
            role="alert"
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm font-medium text-red-700"
          >
            <div className="flex items-center gap-2">
              <Info size={16} />
              {errorMessage}
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="p-1 rounded hover:opacity-70"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* HEADER */}
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
            Configuration
          </h1>
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
                    <h2 className="text-lg font-semibold text-gray-900">
                      {section.title}
                    </h2>
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
                        ? (f.cardTitle ?? f.label)
                        : item.fields.length === 1
                          ? item.name
                          : f.label;
                      const description = item.multiField
                        ? (f.cardDescription ?? f.helperText)
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
                          error={fieldErrors.get(key)}
                          readOnly={f.readOnly}
                          onChange={(raw) =>
                            handleFieldChange(item.id, f.key, raw)
                          }
                        />
                      );
                    }),
                  )}
                </div>
              </div>
            );
          })}

          <div className="px-5 sm:px-6 py-5">
            <div className="flex items-start gap-3 mb-1">
              <div className="w-1 self-stretch rounded-full bg-linear-to-b from-indigo-500 to-indigo-300 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Chatbot</h2>
              </div>
            </div>
            <div className="pl-4">
              <ChatbotToggleRow
                enabled={chatbotEnabled}
                onChange={setChatbotEnabled}
              />
            </div>
          </div>
        </div>

        {/* NOTE */}
        <div className="flex items-start gap-4 bg-linear-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl px-5 py-4 shadow-sm">
          <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
            <Info size={15} className="text-indigo-500" />
          </span>
          <div>
            <p className="text-sm font-semibold text-indigo-900">Note</p>
            <p className="text-xs text-indigo-700 mt-1">
              These configuration settings control key application behaviors.
              Changes will be applied across the system based on the defined
              rules.
            </p>
          </div>
        </div>
      </div>

      {/* STICKY SAVE BAR */}
      <div className="sticky bottom-0 left-0 right-0 flex items-center justify-between gap-4 px-5 sm:px-8 py-4 bg-white/95 backdrop-blur border-t border-gray-200">
        <span
          className={`text-xs sm:text-sm ${hasChanges ? "text-black" : "text-gray-500"}`}
        >
          {hasChanges
              ? `${changedRows.length + (chatbotHasChanges ? 1 : 0)} unsaved change${changedRows.length + (chatbotHasChanges ? 1 : 0) > 1 ? "s" : ""}`
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
            disabled={!hasChanges || hasInvalidValues || saving}
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
            <li
              key={row.key}
              className="flex items-center justify-between gap-3"
            >
              <span>{row.label}</span>
              <span className="font-medium text-gray-900">
                {row.from} → {row.to} {row.unit}
              </span>
            </li>
          ))}
          {chatbotHasChanges && (
            <li className="flex items-center justify-between gap-3">
              <span>Employee chatbot access</span>
              <span className="font-medium text-gray-900">
                {savedChatbotEnabled ? "Enabled" : "Disabled"} →{" "}
                {chatbotEnabled ? "Enabled" : "Disabled"}
              </span>
            </li>
          )}
        </ul>
      </ConfirmDialog>
    </div>
  );
}
