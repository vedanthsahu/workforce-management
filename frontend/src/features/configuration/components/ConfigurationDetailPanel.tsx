"use client";

import { useEffect, useState } from "react";
import { X, Info, CalendarDays } from "lucide-react";
import type { ConfigurationField, ConfigurationItem } from "../types/configuration.types";

type Props = {
  item: ConfigurationItem | null;
  onClose: () => void;
  onSave: (id: string, description: string, fields: ConfigurationField[]) => void;
};

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

export default function ConfigurationDetailPanel({ item, onClose, onSave }: Props) {
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<ConfigurationField[]>([]);

  // Reset the draft every time a different (or the same, freshly re-opened)
  // configuration is opened -- edits from a previous open shouldn't linger.
  useEffect(() => {
    if (!item) return;
    setDescription(item.description);
    setFields(item.fields);
  }, [item]);

  if (!item) return null;

  const Icon = item.icon;
  const hasChanged =
    description !== item.description ||
    fields.some((f, i) => f.value !== item.fields[i]?.value);

  const handleFieldChange = (key: string, raw: string) => {
    const parsed = Number(raw);
    setFields((prev) =>
      prev.map((f) => (f.key === key ? { ...f, value: Number.isFinite(parsed) ? Math.max(0, parsed) : 0 } : f))
    );
  };

  const handleSave = () => {
    onSave(item.id, description, fields);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col">
        {/* HEADER */}
        <div className="flex items-start justify-between gap-3 px-6 py-5 border-b shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${item.iconBg}`}>
              <Icon className={`w-4.5 h-4.5 ${item.iconColor}`} />
            </div>
            <h2 className="text-base font-semibold text-gray-900 truncate">{item.name} Configuration</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Configuration Details */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Configuration Details</h3>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Configuration Name</label>
              <input
                value={item.name}
                readOnly
                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors resize-none"
              />
            </div>
          </section>

          {/* Configuration Values */}
          <section className="space-y-4 pt-2 border-t">
            <h3 className="text-sm font-semibold text-gray-900 pt-4">Configuration Values</h3>
            {fields.map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">{f.label}</label>
                <input
                  type="number"
                  min={0}
                  value={f.value}
                  onChange={(e) => handleFieldChange(f.key, e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors"
                />
                <p className="text-xs text-gray-400 mt-1">{f.helperText}</p>
              </div>
            ))}

            <div className="flex items-start gap-2.5 rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2.5 text-xs text-indigo-700">
              <Info size={14} className="mt-0.5 shrink-0" />
              <span>{item.describeRule(fields)}</span>
            </div>
          </section>

          {/* Metadata */}
          <section className="space-y-4 pt-2 border-t">
            <h3 className="text-sm font-semibold text-gray-900 pt-4">Metadata</h3>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Last Updated</label>
              <div className="relative">
                <input
                  value={formatDateTime(item.lastUpdatedAt)}
                  readOnly
                  className="w-full h-10 pl-3 pr-9 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                />
                <CalendarDays size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Last Updated By</label>
              <input
                value={item.lastUpdatedBy}
                readOnly
                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
              />
            </div>
          </section>
        </div>

        {/* FOOTER */}
        <div className="flex items-center gap-3 px-6 py-4 border-t shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!hasChanged}
            onClick={handleSave}
            className="flex-1 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
