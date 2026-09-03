"use client";

import { useState } from "react";
import { ChevronRight, ChevronLeft, Plus, Pencil, MoreVertical, CheckCircle2, X } from "lucide-react";
import { INITIAL_CONFIGURATIONS } from "../utils/configurationData";
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

const PAGE_SIZES = [10, 25, 50];

export default function ConfigurationsListPage() {
  const [configurations, setConfigurations] = useState<ConfigurationItem[]>(INITIAL_CONFIGURATIONS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const selectedItem = configurations.find((c) => c.id === selectedId) ?? null;

  const totalPages = Math.max(1, Math.ceil(configurations.length / pageSize));
  const startIndex = (page - 1) * pageSize;
  const paginated = configurations.slice(startIndex, startIndex + pageSize);

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
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-clip p-4 sm:p-6 space-y-4 sm:space-y-6 bg-[#f8fafc]">
      {/* BREADCRUMB */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <span>Settings</span>
        <ChevronRight size={12} />
        <span>Configuration</span>
        <ChevronRight size={12} />
        <span className="text-gray-700 font-medium">All Configurations</span>
      </div>

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">All Configurations</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Manage all application configuration settings from one place.
          </p>
        </div>
        {/* Not wired up yet -- creating new configuration types isn't part of
           this pass, this is just here to match the design. */}
        <button
          type="button"
          disabled
          title="Coming soon"
          className="inline-flex items-center gap-2 h-9 px-4 bg-indigo-600 text-white rounded-xl text-sm font-medium shadow-sm opacity-50 cursor-not-allowed shrink-0 self-start sm:self-auto"
        >
          <Plus size={16} />
          Add Configuration
        </button>
      </div>

      {/* TABLE CARD */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-220 text-xs table-fixed">
            <colgroup>
              <col style={{ width: "24%" }} />
              <col style={{ width: "28%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "6%" }} />
            </colgroup>
            <thead className="text-xs text-blue-600 bg-blue-100 border-b">
              <tr>
                <th className="pl-6 px-3 py-3 text-left font-bold">Configuration Name</th>
                <th className="px-3 py-3 text-left font-bold">Description</th>
                <th className="px-3 py-3 text-left font-bold">Current Value</th>
                <th className="px-3 py-3 text-left font-bold">Last Updated</th>
                <th className="px-3 py-3 text-left font-bold">Updated By</th>
                <th className="px-3 py-3 text-center font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.map((item) => {
                const Icon = item.icon;
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.iconBg}`}>
                          <Icon className={`w-4 h-4 ${item.iconColor}`} />
                        </div>
                        <span className="font-medium text-gray-900">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-600 max-w-0">
                      <span className="block line-clamp-3">{item.description}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1 items-start">
                        {item.valuePills(item.fields).map((pill) => (
                          <span
                            key={pill.label}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${pill.className}`}
                          >
                            {pill.label}: {pill.value}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{formatDateTime(item.lastUpdatedAt)}</td>
                    <td className="px-3 py-3 text-gray-700">{item.lastUpdatedBy}</td>
                    <td className="px-3 py-3">
                      <div className="relative flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedId(item.id)}
                          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
                          title="Edit configuration"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenMenuId((prev) => (prev === item.id ? null : item.id))}
                          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
                        >
                          <MoreVertical size={14} />
                        </button>

                        {openMenuId === item.id && (
                          <div className="absolute right-0 top-8 z-20 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1 text-left">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedId(item.id);
                                setOpenMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <Pencil size={13} className="text-gray-400" />
                              Edit
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* FOOTER */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 border-t text-xs sm:text-sm text-gray-500">
          <span>
            {configurations.length > 0 &&
              `Showing ${startIndex + 1} to ${Math.min(startIndex + pageSize, configurations.length)} of ${configurations.length} entries`}
          </span>
          <div className="flex items-center gap-3 self-center sm:self-auto">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 border rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2.5 py-1 text-xs rounded-md border border-indigo-300 bg-indigo-50 text-indigo-700 font-semibold">
                {page}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 border rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="h-7 px-2 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <ConfigurationDetailPanel item={selectedItem} onClose={() => setSelectedId(null)} onSave={handleSave} />
    </div>
  );
}
