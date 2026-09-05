"use client";

import { useState } from "react";
import { ChevronRight, Pencil, CalendarDays, UserRound, Info, CheckCircle2, X } from "lucide-react";
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
      className={`inline-flex items-center gap-1.5 h-9 px-4 border border-indigo-200 text-indigo-600 rounded-lg text-xs font-semibold hover:bg-indigo-50 transition-colors shrink-0 ${className}`}
    >
      <Pencil size={13} />
      Edit
    </button>
  );
}

function StatBlock({ statLabel, value, unit }: { statLabel: string; value: number; unit: string }) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 min-w-[110px]">
      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide whitespace-nowrap">{statLabel}</p>
      <p className="text-lg font-bold text-gray-900 mt-0.5">{value}</p>
      <p className="text-[10px] text-gray-400">{unit}</p>
    </div>
  );
}

function MetaInfo({ lastUpdatedAt, lastUpdatedBy }: { lastUpdatedAt: string; lastUpdatedBy: string }) {
  return (
    <div className="flex flex-col gap-1.5 text-xs">
      <div className="flex items-center gap-1.5">
        <CalendarDays size={13} className="text-gray-400 shrink-0" />
        <div>
          <p className="text-[10px] text-gray-400">Last Updated</p>
          <p className="font-medium text-gray-600 whitespace-nowrap">{formatDateTime(lastUpdatedAt)}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <UserRound size={13} className="text-gray-400 shrink-0" />
        <div>
          <p className="text-[10px] text-gray-400">Updated By</p>
          <p className="font-medium text-gray-600">{lastUpdatedBy}</p>
        </div>
      </div>
    </div>
  );
}

/** Standard single-configuration card: icon+name+description, its stat
 * block(s), Last Updated/Updated By, and an Edit button -- wraps onto
 * multiple lines on its own when the card is narrow (e.g. two side by side
 * in Employee Booking) instead of needing separate mobile/desktop layouts. */
function ItemCard({ item, onEdit }: { item: ConfigurationItem; onEdit: () => void }) {
  const Icon = item.icon;
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 flex flex-wrap items-center gap-5">
      <div className="flex items-start gap-3 min-w-[220px] flex-1">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${item.iconBg}`}>
          <Icon className={`w-5 h-5 ${item.iconColor}`} />
        </div>
        <div className="min-w-0">
          <h4 className="font-semibold text-gray-900 text-sm">{item.name}</h4>
          <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {item.fields.map((f) => (
          <StatBlock key={f.key} statLabel={f.statLabel} value={f.value} unit={f.unit} />
        ))}
      </div>

      <MetaInfo lastUpdatedAt={item.lastUpdatedAt} lastUpdatedBy={item.lastUpdatedBy} />

      <EditButton onClick={onEdit} className="ml-auto" />
    </div>
  );
}

/** Layout Visibility is the one exception: a single configuration whose
 * three fields (Draft/Archived/Discarded) each get their own mini card with
 * their own icon and blurb, sharing one Edit action at the section header
 * instead of a per-field one. */
function LayoutVisibilityCards({ item }: { item: ConfigurationItem }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {item.fields.map((f) => {
        const FieldIcon = f.icon;
        return (
          <div key={f.key} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              {FieldIcon && (
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${f.iconBg}`}>
                  <FieldIcon className={`w-4.5 h-4.5 ${f.iconColor}`} />
                </div>
              )}
              <h4 className="font-semibold text-gray-900 text-sm">{f.cardTitle}</h4>
            </div>
            <p className="text-xs text-gray-500">{f.cardDescription}</p>
            <div>
              <span className="text-xl font-bold text-gray-900">{f.value}</span>
              <span className="text-xs text-gray-400 ml-1">{f.unit}</span>
            </div>
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
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
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
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const selectedItem = configurations.find((c) => c.id === selectedId) ?? null;
  const getItem = (id: string) => configurations.find((c) => c.id === id);

  const handleSave = (id: string, description: string, fields: ConfigurationField[]) => {
    const nowIso = new Date().toISOString();
    setConfigurations((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, description, fields, lastUpdatedAt: nowIso, lastUpdatedBy: "Admin User" }
          : c
      )
    );
    setSelectedId(null);
    setSavedMessage("Configuration updated successfully.");
    setTimeout(() => setSavedMessage(null), 4000);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-clip p-4 sm:p-6 space-y-5 sm:space-y-6 bg-[#f8fafc]">
     

      {savedMessage && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-green-200 bg-green-50 text-sm font-medium text-green-700">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            {savedMessage}
          </div>
          <button onClick={() => setSavedMessage(null)} className="p-1 rounded hover:opacity-70">
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
          <Section
            key={section.id}
            title={section.title}
            subtitle={section.subtitle}
            onEdit={isMultiField ? () => setSelectedId(items[0].id) : undefined}
          >
            {isMultiField ? (
              <LayoutVisibilityCards item={items[0]} />
            ) : items.length > 1 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((item) => (
                  <ItemCard key={item.id} item={item} onEdit={() => setSelectedId(item.id)} />
                ))}
              </div>
            ) : (
              <ItemCard item={items[0]} onEdit={() => setSelectedId(items[0].id)} />
            )}
          </Section>
        );
      })}

      {/* NOTE */}
      <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
        <Info size={16} className="text-indigo-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-indigo-900">Note</p>
          <p className="text-xs text-indigo-700 mt-0.5">
            These configuration settings control key application behaviors. Changes will be applied across the
            system based on the defined rules.
          </p>
        </div>
      </div>

      <ConfigurationDetailPanel item={selectedItem} onClose={() => setSelectedId(null)} onSave={handleSave} />
    </div>
  );
}
