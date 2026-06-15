"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { SiteDirectoryEntry } from "../types/siteDirectory.types";

interface SiteDirectoryTableProps {
  initialSites: SiteDirectoryEntry[];
}

// Client Component: receives server-fetched data as props and only
// handles interactivity (search/filter) — no fetching of its own.
export default function SiteDirectoryTable({ initialSites }: SiteDirectoryTableProps) {
  const [search, setSearch] = useState("");

  const filtered = initialSites.filter((site) => {
    const term = search.toLowerCase();
    return (
      site.site_name.toLowerCase().includes(term) ||
      site.city.toLowerCase().includes(term) ||
      site.country.toLowerCase().includes(term)
    );
  });

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
      <div className="p-4 border-b border-gray-100">
        <Input
          placeholder="Search by site, city or country..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
            <th className="px-4 py-2 font-semibold">Site</th>
            <th className="px-4 py-2 font-semibold">City</th>
            <th className="px-4 py-2 font-semibold">Country</th>
            <th className="px-4 py-2 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((site) => (
            <tr key={site.site_id} className="border-b border-gray-50 last:border-0">
              <td className="px-4 py-2 font-medium text-gray-900">{site.site_name}</td>
              <td className="px-4 py-2 text-gray-600">{site.city}</td>
              <td className="px-4 py-2 text-gray-600">{site.country}</td>
              <td className="px-4 py-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    site.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {site.status}
                </span>
              </td>
            </tr>
          ))}

          {filtered.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                No sites found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
