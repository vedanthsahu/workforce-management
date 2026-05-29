"use client";

import { useRouter } from "next/navigation";
import { Layout } from "../types/layout.types";

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

function BlockedIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
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
    month:  "short",
    day:    "numeric",
    year:   "numeric",
    hour:   "numeric",
    minute: "2-digit",
  });
}

function fileName(url: string): string {
  return url.split("/").pop() ?? url;
}

// ── info row ──────────────────────────────────────────────────────────────────

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-gray-400 w-24 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-xs text-gray-400 flex-shrink-0">:</span>
      <div className="text-xs text-gray-700 font-medium flex-1 min-w-0">{children}</div>
    </div>
  );
}

// ── status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status, isPublished }: { status: string; isPublished: boolean }) {
  if (isPublished) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        Active
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

// ── component ─────────────────────────────────────────────────────────────────

export default function LayoutSidebar({
  layout,
  selectedLayoutId,
  selectedFloorId    = "",
  selectedBuildingId = "",
  selectedSiteId     = "",
}: LayoutSidebarProps) {
  const router = useRouter();

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (selectedLayoutId)   params.set("layoutId",   selectedLayoutId);
    if (selectedFloorId)    params.set("floorId",    selectedFloorId);
    if (selectedBuildingId) params.set("buildingId", selectedBuildingId);
    if (selectedSiteId)     params.set("siteId",     selectedSiteId);
    return params.toString() ? `?${params.toString()}` : "";
  };

  const quickActions = [
    {
      icon:  <SeatIcon />,
      label: "Manage Seats",
      sub:   "Configure seat details and settings",
      color: "text-indigo-600 bg-indigo-50",
      href:  `/admin/layouts/manage-seats${buildQuery()}`,
    },
    {
      icon:  <AmenityIcon />,
      label: "Manage Amenities",
      sub:   "Manage amenities master data",
      color: "text-violet-600 bg-violet-50",
      href:  `/admin/amenities`,
    },
    // {
    //   icon:  <BlockedIcon />,
    //   label: "Manage Blocked Areas",
    //   sub:   "View and manage blocked areas",
    //   color: "text-rose-600 bg-rose-50",
    //   href:  `/admin/layouts/blocked-areas${buildQuery()}`,
    // },
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

  const isDraft    = !layout.is_published && layout.status !== "ARCHIVED";
  const isArchived = layout.status === "ARCHIVED";

  return (
    <div className="w-full space-y-4">

      {/* ── Layout Information ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Layout Information</h3>

        <div className="space-y-2.5">
          <InfoRow label="Layout Name">
            {layout.layout_name ?? "—"}
          </InfoRow>

          <InfoRow label="Version">
            <span className="flex items-center gap-1.5">
              v{layout.version_no}{" "}
              <StatusBadge status={layout.status} isPublished={layout.is_published} />
            </span>
          </InfoRow>

          <InfoRow label="Uploaded By">
            {layout.uploaded_by_name ?? "—"}
          </InfoRow>

          <InfoRow label="Uploaded On">
            {layout.updated_at ? formatDate(layout.updated_at) : "—"}
          </InfoRow>

          {layout.layout_file_url && (
            <InfoRow label="SVG File">
              <span className="flex items-center gap-1.5 min-w-0">
                <FileIcon />
                <span
                  className="truncate text-indigo-600 max-w-[150px]"
                  title={fileName(layout.layout_file_url)}
                >
                  {fileName(layout.layout_file_url)}
                </span>
                <a
                  href={layout.layout_file_url}
                  download
                  onClick={(e) => e.stopPropagation()}
                  className="flex-shrink-0 text-indigo-500 hover:text-indigo-700"
                  title="Download file"
                >
                  <DownloadIcon />
                </a>
              </span>
            </InfoRow>
          )}
        </div>
      </div>

      {/* ── Quick Actions ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>

        <div className="space-y-1">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => router.push(action.href)}
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
      {isDraft && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex gap-2.5">
          <AlertIcon />
          <div>
            <p className="text-xs font-semibold text-amber-800 mb-0.5">Draft Layout</p>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              Draft layouts are visible only to admins. Once published, it will be available for employee bookings.
            </p>
          </div>
        </div>
      )}

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