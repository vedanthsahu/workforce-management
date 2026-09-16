"use client";

import { useRouter } from "next/navigation";
import { useEffect, useCallback, useState, ReactNode } from "react";
import { Layout } from "../types/layout.types";
import { useScheduledLayoutActions } from "../hooks/useLayoutDetails";

interface LayoutSidebarProps {
  layout: Layout | null;
  selectedLayoutId: string;
  selectedFloorId?: string;
  selectedBuildingId?: string;
  selectedSiteId?: string;
}

// ── icons ─────────────────────────────────────────────────────────────────────

function DownloadIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-indigo-500" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function SeatIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 10V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4" />
      <path d="M3 10h18v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2z" />
      <path d="M7 14v5m10-5v5" />
    </svg>
  );
}

function AmenityIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="w-4 h-4 text-amber-500 flex-shrink-0" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function fileName(url: string): string {
  return url.split("/").pop() ?? url;
}

// ── sub-components ────────────────────────────────────────────────────────────

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-gray-400 w-24 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-xs text-gray-400 flex-shrink-0">:</span>
      <div className="text-xs text-gray-700 font-medium flex-1 min-w-0">{children}</div>
    </div>
  );
}

function StatusBadge({ status, isPublished }: { status: string; isPublished: boolean }) {
  if (isPublished) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        Active
      </span>
    );
  }
  // Checked before the ARCHIVED/Draft fallback -- a SCHEDULED layout has
  // isPublished=false and status="SCHEDULED", so without this case it
  // fell through to "Draft" and was indistinguishable from an actual
  // draft that nobody had scheduled at all.
  if (status === "SCHEDULED") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
        Scheduled
      </span>
    );
  }
  if (status === "ARCHIVED") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200">
        Archived
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      Draft
    </span>
  );
}

// A layout that's already SCHEDULED can still have its effective date
// moved, or be cancelled outright -- both refused by the backend (409)
// once bookings could already exist against the current effective_from
// (see reschedule_floor_layout / delete_floor_layout). First pass: plain
// inline controls, not a full modal -- good enough to unblock admins
// today, worth a nicer dialog later if this gets heavy use.
function ScheduleActionsCard({ layout, onChanged }: { layout: Layout; onChanged: () => void }) {
  const [newDate, setNewDate] = useState(
    layout.effective_from ? layout.effective_from.slice(0, 10) : "",
  );
  const { rescheduling, cancelling, actionError, reschedule, cancelSchedule } =
    useScheduledLayoutActions(layout, onChanged);

  const handleReschedule = () => {
    if (!newDate) return;
    reschedule(newDate);
  };

  const handleCancel = () => {
    if (!window.confirm(
      "Cancel this scheduled layout? The floor's currently published layout will keep running indefinitely instead.",
    )) return;
    cancelSchedule();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Schedule Actions</h3>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">New effective date</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="flex-1 h-9 px-2.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            />
            <button
              type="button"
              onClick={handleReschedule}
              disabled={rescheduling || cancelling || !newDate}
              className="h-9 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              {rescheduling ? "Saving..." : "Update"}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCancel}
          disabled={rescheduling || cancelling}
          className="w-full h-9 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {cancelling ? "Cancelling..." : "Cancel Schedule"}
        </button>

        {actionError && (
          <p className="text-xs text-red-600">{actionError}</p>
        )}
      </div>
    </div>
  );
}

// ── component ─────────────────────────────────────────────────────────────────

// Static routes that never change — safe to prefetch unconditionally
const STATIC_PREFETCH_ROUTES = [
  "/admin/layouts/manage-seats",
  "/admin/amenities",
];

export default function LayoutSidebar({
  layout,
  selectedLayoutId,
  selectedFloorId = "",
  selectedBuildingId = "",
  selectedSiteId = "",
}: LayoutSidebarProps) {
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);

  const handleDownloadSvg = useCallback(async () => {
    if (!layout?.layout_file_url) return;
    setDownloading(true);
    try {
      const svgRes = await fetch(layout.layout_file_url);
      if (!svgRes.ok) throw new Error(`HTTP ${svgRes.status}`);
      const raw   = await svgRes.text();
      const fluid = raw
        .replace(/\bwidth="[^"]*"/,  'width="100%"')
        .replace(/\bheight="[^"]*"/, 'height="100%"');
      const blob    = new Blob([fluid], { type: "image/svg+xml" });
      const blobUrl = URL.createObjectURL(blob);
      const link    = document.createElement("a");
      link.href     = blobUrl;
      link.download = `${layout.layout_name ?? fileName(layout.layout_file_url)}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed", err);
    } finally {
      setDownloading(false);
    }
  }, [layout]);

  // Build query string once — reused by both prefetch and push
  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (selectedLayoutId) params.set("layoutId", selectedLayoutId);
    if (selectedFloorId) params.set("floorId", selectedFloorId);
    if (selectedBuildingId) params.set("buildingId", selectedBuildingId);
    if (selectedSiteId) params.set("siteId", selectedSiteId);
    return params.toString() ? `?${params.toString()}` : "";
  }, [selectedLayoutId, selectedFloorId, selectedBuildingId, selectedSiteId]);

  // Prefetch all quick action routes on mount.
  // The JS bundles for these pages are downloaded in the background
  // so clicking any action button is instant.
  useEffect(() => {
    STATIC_PREFETCH_ROUTES.forEach((route) => router.prefetch(route));
  }, [router]);

  const quickActions = [
    {
      icon: <SeatIcon />,
      label: "Manage Spaces",
      sub: "Configure seats, cabins and conference rooms",
      color: "text-indigo-600 bg-indigo-50",
      // Static base path — query added at click time. URL/folder name
      // intentionally kept as "manage-seats" (bookmarks, prefetch list,
      // query-param plumbing) — only the visible label changed.
      basePath: "/admin/layouts/manage-seats",
      href: `/admin/layouts/manage-seats${buildQuery()}`,
    },
    {
      icon: <AmenityIcon />,
      label: "Manage Amenities",
      sub: "Manage amenities master data",
      color: "text-violet-600 bg-violet-50",
      basePath: "/admin/amenities",
      href: `/admin/amenities`,
    },
  ];

  if (!layout) {
    return (
      <div className="w-full space-y-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 text-center py-8">
            Select a layout to view details
          </p>
        </div>
      </div>
    );
  }

  const _isDraft = !layout.is_published && layout.status !== "ARCHIVED";
  const isArchived = layout.status === "ARCHIVED";

  return (
    <div className="w-full space-y-4">

      {/* ── Layout Information ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Layout Information</h3>

        <div className="space-y-2.5">
          <InfoRow label="Layout Name">{layout.layout_name ?? "—"}</InfoRow>

          <InfoRow label="Version">
            <span className="flex items-center gap-1.5">
              v{layout.version_no}{" "}
              <StatusBadge status={layout.status} isPublished={layout.is_published} />
            </span>
          </InfoRow>

          {layout.status === "SCHEDULED" && layout.effective_from && (
            <InfoRow label="Effective">{formatDate(layout.effective_from)}</InfoRow>
          )}

          <InfoRow label="Uploaded By">{layout.uploaded_by_name ?? "—"}</InfoRow>

          <InfoRow label="Uploaded On">
            {layout.updated_at ? formatDate(layout.updated_at) : "—"}
          </InfoRow>

          {layout.layout_file_url && (
            <InfoRow label="SVG File">
              <span className="flex items-center gap-1.5 min-w-0">
                <FileIcon />
                <span
                  className="truncate text-indigo-600 max-w-[150px]"
                  title={`${layout.layout_name ?? fileName(layout.layout_file_url)}.svg`}
                >
                  {layout.layout_name ? `${layout.layout_name}.svg` : fileName(layout.layout_file_url)}
                </span>
                <button
                  onClick={handleDownloadSvg}
                  disabled={downloading}
                  className="flex-shrink-0 text-indigo-500 hover:text-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Download file"
                >
                  {downloading
                    ? <span className="w-3.5 h-3.5 block border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                    : <DownloadIcon />
                  }
                </button>
              </span>
            </InfoRow>
          )}
        </div>
      </div>

      {layout.status === "SCHEDULED" && (
        // Full reload rather than router.refresh(): this layout's data is
        // fetched client-side (useFloorLayouts), which refresh() doesn't
        // re-trigger -- a reload is the simplest way to guarantee every
        // consumer of it (this sidebar, the preview, the stat cards) picks
        // up the post-action state instead of going stale silently.
        <ScheduleActionsCard layout={layout} onChanged={() => window.location.reload()} />
      )}

      {/* ── Quick Actions ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>

        <div className="space-y-1">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => router.push(action.href)}
              onMouseEnter={() => router.prefetch(action.basePath)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left group"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${action.color}`}>
                {action.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 group-hover:text-gray-900">
                  {action.label}
                </p>
                <p className="text-[10px] text-gray-400 truncate">{action.sub}</p>
              </div>
              <ChevronRightIcon />
            </button>
          ))}
        </div>
      </div>

      {/* ── Draft warning ──────────────────────────────────────────────── */}
      {/* {isDraft && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex gap-2.5">
          <AlertIcon />
          <div>
            <p className="text-xs font-semibold text-amber-800 mb-0.5">Draft Layout</p>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              Draft layouts are visible only to admins. Once published, it will be available for employee bookings.
            </p>
          </div>
        </div>
      )} */}

      {/* ── Archived warning ───────────────────────────────────────────── */}
      {isArchived && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 flex gap-2.5">
          <AlertIcon />
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-0.5">Archived Layout</p>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              This layout is archived and not available for bookings.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
