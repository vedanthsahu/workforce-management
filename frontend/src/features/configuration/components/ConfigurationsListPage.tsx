"use client";

import { useState } from "react";
import { Pencil, CalendarDays, UserRound, Info, CheckCircle2, X } from "lucide-react";
import { CONFIGURATION_SECTIONS, INITIAL_CONFIGURATIONS } from "../utils/configurationData";
import type { ConfigurationField, ConfigurationItem } from "../types/configuration.types";
import ConfigurationDetailPanel from "./ConfigurationDetailPanel";

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

function EditButton({ onClick, className = "" }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-xs font-semibold text-indigo-600 bg-indigo-50/80 border border-indigo-100 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 hover:shadow-md hover:shadow-indigo-200 transition-all duration-200 shrink-0 ${className}`}
    >
      <Pencil size={13} />
      Edit
    </button>
  );
}

function StatBlock({ statLabel, value, unit }: { statLabel: string; value: number; unit: string }) {
  return (
    <div className="bg-linear-to-br from-gray-50 to-gray-100/60 border border-gray-100 rounded-2xl px-5 py-3.5 min-w-30 transition-colors group-hover:border-gray-200">
      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{statLabel}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1 leading-none">{value}</p>
      <p className="text-[11px] text-gray-400 mt-1">{unit}</p>
    </div>
  );
}

function MetaInfo({ lastUpdatedAt, lastUpdatedBy }: { lastUpdatedAt: string; lastUpdatedBy: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5">
        <span className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
          <CalendarDays size={12} className="text-gray-400" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] text-gray-400 leading-tight">Last Updated</p>
          <p className="text-xs font-medium text-gray-600 whitespace-nowrap leading-tight">{formatDateTime(lastUpdatedAt)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5">
        <span className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
          <UserRound size={12} className="text-gray-400" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] text-gray-400 leading-tight">Updated By</p>
          <p className="text-xs font-medium text-gray-600 leading-tight">{lastUpdatedBy}</p>
        </div>
      </div>
    </div>
  );
}

/** Standard single-configuration card: icon+name+description, its stat
 * block(s), Last Updated/Updated By, and an Edit button.
 * - "row" (default, Activity / Layout Management): everything on one wide
 *   row that wraps onto multiple lines on its own if the card is narrow.
 * - "stack" (Employee Booking's two side-by-side cards): heading on top,
 *   the stat block below it, then a closing row with meta info + Edit --
 *   reads better than "row" once the card is only half-width. */
function ItemCard({
  item,
  onEdit,
  layout = "row",
}: {
  item: ConfigurationItem;
  onEdit: () => void;
  layout?: "row" | "stack";
}) {
  const Icon = item.icon;
  const heading = (
    <div className="flex items-start gap-4 min-w-55 flex-1">
      <div
        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ring-4 ring-white shadow-md transition-transform duration-200 group-hover:scale-105 ${item.iconBg}`}
      >
        <Icon className={`w-6 h-6 ${item.iconColor}`} />
      </div>
      <div className="min-w-0">
        <h4 className="font-bold text-gray-900 text-[15px]">{item.name}</h4>
        <p className="text-[13px] text-gray-500 mt-1">{item.description}</p>
      </div>
    </div>
  );
  const stats = (
    <div className="flex flex-wrap gap-4">
      {item.fields.map((f) => (
        <StatBlock key={f.key} statLabel={f.statLabel} value={f.value} unit={f.unit} />
      ))}
    </div>
  );
  const meta = <MetaInfo lastUpdatedAt={item.lastUpdatedAt} lastUpdatedBy={item.lastUpdatedBy} />;

  if (layout === "stack") {
    return (
      <div className="group bg-white border border-gray-200/80 rounded-2xl shadow-sm hover:shadow-lg hover:shadow-gray-200/60 hover:border-gray-300 hover:-translate-y-0.5 transition-all duration-200 p-6 flex flex-col gap-5">
        {heading}
        {stats}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100">
          {meta}
          <EditButton onClick={onEdit} />
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-white border border-gray-200/80 rounded-2xl shadow-sm hover:shadow-lg hover:shadow-gray-200/60 hover:border-gray-300 hover:-translate-y-0.5 transition-all duration-200 p-6 flex flex-wrap items-center gap-6">
      {heading}
      {stats}
      {meta}
      <EditButton onClick={onEdit} className="ml-auto" />
    </div>
  );
}

// Tailwind needs literal class strings to scan -- can't derive "bg-X" from
// the "text-X" values in configurationData.ts at runtime, so the accent bar
// color is looked up from a static map keyed by that same iconColor string.
const ACCENT_BAR_BY_ICON_COLOR: Record<string, string> = {
  "text-amber-600": "bg-amber-200",
  "text-blue-600": "bg-blue-200",
  "text-red-600": "bg-red-200",
  "text-indigo-600": "bg-indigo-200",
  "text-emerald-600": "bg-emerald-200",
  "text-orange-600": "bg-orange-200",
  "text-violet-600": "bg-violet-200",
  "text-gray-600": "bg-gray-200",
};

/** Layout Visibility is the one exception: a single configuration whose
 * three fields (Draft/Archived/Discarded) each get their own mini card with
 * their own icon, blurb, and its own Edit action -- stacked one below the
 * other rather than side by side. */
function LayoutVisibilityCards({ item, onEditField }: { item: ConfigurationItem; onEditField: (fieldKey: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      {item.fields.map((f) => {
        const FieldIcon = f.icon;
        const accentBar = (f.iconColor && ACCENT_BAR_BY_ICON_COLOR[f.iconColor]) || "bg-gray-300";
        return (
          <div
            key={f.key}
            className="group relative overflow-hidden bg-white border border-gray-200/80 rounded-2xl shadow-sm hover:shadow-lg hover:shadow-gray-200/60 hover:border-gray-300 hover:-translate-y-0.5 transition-all duration-200 p-6 flex flex-wrap items-center gap-5"
          >
            <div className={`absolute top-0 left-0 right-0 h-1 ${accentBar}`} />
            <div className="flex items-start gap-3.5 min-w-55 flex-1">
              {FieldIcon && (
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ring-4 ring-white shadow-md transition-transform duration-200 group-hover:scale-105 ${f.iconBg}`}
                >
                  <FieldIcon className={`w-5 h-5 ${f.iconColor}`} />
                </div>
              )}
              <div className="min-w-0">
                <h4 className="font-bold text-gray-900 text-[15px]">{f.cardTitle}</h4>
                <p className="text-[13px] text-gray-500 mt-1">{f.cardDescription}</p>
              </div>
            </div>
            <div>
              <span className="text-2xl font-bold text-gray-900">{f.value}</span>
              <span className="text-xs text-gray-400 ml-1">{f.unit}</span>
            </div>
            <MetaInfo lastUpdatedAt={f.lastUpdatedAt ?? item.lastUpdatedAt} lastUpdatedBy={f.lastUpdatedBy ?? item.lastUpdatedBy} />
            <EditButton onClick={() => onEditField(f.key)} className="ml-auto" />
          </div>
        );
      })}
    </div>
  );
}

function Section({
  title,
  subtitle,
  onEdit,
  children,
}: {
  title: string;
  subtitle: string;
  onEdit?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-1 self-stretch rounded-full bg-linear-to-b from-indigo-500 to-indigo-300 mt-0.5" />
          <div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          </div>
        </div>
        {onEdit && <EditButton onClick={onEdit} />}
      </div>
      {children}
    </section>
  );
}

export default function ConfigurationsListPage() {
  const [configurations, setConfigurations] = useState<ConfigurationItem[]>(INITIAL_CONFIGURATIONS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const selectedItem = configurations.find((c) => c.id === selectedId) ?? null;
  const getItem = (id: string) => configurations.find((c) => c.id === id);

  const closePanel = () => {
    setSelectedId(null);
    setEditingFieldKey(null);
  };

  const handleSave = (id: string, description: string, fields: ConfigurationField[]) => {
    const nowIso = new Date().toISOString();
    setConfigurations((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, description, fields, lastUpdatedAt: nowIso, lastUpdatedBy: "Admin User" }
          : c
      )
    );
    closePanel();
    setSavedMessage("Configuration updated successfully.");
    setTimeout(() => setSavedMessage(null), 4000);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-clip p-5 sm:p-8 space-y-8 sm:space-y-10 bg-linear-to-b from-slate-50 via-[#f8fafc] to-slate-50">
      {savedMessage && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-green-200 bg-linear-to-r from-green-50 to-emerald-50 text-sm font-medium text-green-700 shadow-sm animate-in fade-in slide-in-from-top-1 duration-300">
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
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">All Configurations</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Manage application configuration settings. Update values as per your organization&apos;s requirements.
        </p>
      </div>

      {/* SECTIONS */}
      {CONFIGURATION_SECTIONS.map((section) => {
        const items = section.itemIds.map(getItem).filter((i): i is ConfigurationItem => !!i);
        if (items.length === 0) return null;
        const isMultiField = items.length === 1 && items[0].multiField;

        return (
          <Section key={section.id} title={section.title} subtitle={section.subtitle}>
            {isMultiField ? (
              <LayoutVisibilityCards
                item={items[0]}
                onEditField={(fieldKey) => {
                  setSelectedId(items[0].id);
                  setEditingFieldKey(fieldKey);
                }}
              />
            ) : items.length > 1 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {items.map((item) => (
                  <ItemCard key={item.id} item={item} onEdit={() => setSelectedId(item.id)} layout="stack" />
                ))}
              </div>
            ) : (
              <ItemCard item={items[0]} onEdit={() => setSelectedId(items[0].id)} />
            )}
          </Section>
        );
      })}

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

      <ConfigurationDetailPanel
        item={selectedItem}
        fieldKey={editingFieldKey}
        onClose={closePanel}
        onSave={handleSave}
      />
    </div>
  );
}
