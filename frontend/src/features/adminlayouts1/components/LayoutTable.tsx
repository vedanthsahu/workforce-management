"use client";

import { Eye, Download, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLayoutsTable }  from "@/features/adminlayouts1/hooks/useLayoutsTable";
import { useLayoutsStore }  from "@/store/useLayoutsStore";
import LayoutPagination     from "./LayoutPagination";
import { useCallback, useEffect, useState } from "react";
import { LayoutSelection, LayoutApiResponse } from "../types/layout.types";
import { useRouter }        from "next/navigation";
import { fetchLayoutSeats } from "@/features/managelayout1/services/seatService";
import type { Seat }        from "@/features/managelayout1/types/seat.types";

type Props = {
  selection:         LayoutSelection;
  selectedLayoutId?: string;
};

// ── Seat color helpers (same rules as LayoutPreview.tsx) ─────────────────────

function resolveSeatFill(seat: Seat): string {
  if (!seat.is_configured)        return "#D1D5DB"; // unconfigured — gray
  if (seat.status === "INACTIVE") return "#EF4444"; // inactive     — red
  if (!seat.is_bookable)          return "#F59E0B"; // non-bookable — amber
  return "#22C55E";                                 // bookable     — green
}

function applyColors(svgText: string, seats: Seat[]): string {
  let result = svgText;
  for (const seat of seats) {
    const fill = resolveSeatFill(seat);
    const re   = new RegExp(
      `(<g[^>]*\\bid="${seat.seat_svg_id}"[^>]*>)([\\s\\S]*?)(<\\/g>)`,
      "m",
    );
    result = result.replace(re, (_m, open, inner, close) => {
      const colored = inner
        .replace(/fill="[^"]*"/g,      `fill="${fill}"`)
        .replace(/fill:[^;"}\s]*/g,    `fill:${fill}`);
      return `${open}${colored}${close}`;
    });
  }
  return result;
}

// ── Legend ───────────────────────────────────────────────────────────────────

const LEGEND = [
  { label: "Bookable",     color: "#22C55E" },
  { label: "Non-bookable", color: "#F59E0B" },
  { label: "Inactive",     color: "#EF4444" },
  { label: "Unconfigured", color: "#D1D5DB" },
] as const;

// ── Component ────────────────────────────────────────────────────────────────

export default function LayoutTable({ selection, selectedLayoutId }: Props) {
  const { layouts, loading } = useLayoutsStore();
  const router = useRouter();

  const [previewLayout,   setPreviewLayout]   = useState<LayoutApiResponse | null>(null);
  const [coloredSvg,      setColoredSvg]      = useState<string | null>(null);
  const [previewLoading,  setPreviewLoading]  = useState(false);
  const [previewError,    setPreviewError]    = useState(false);
  const [downloading,     setDownloading]     = useState(false);

  useEffect(() => {
    if (layouts.length > 0) router.prefetch("/admin/layouts/manage-layout");
  }, [layouts, router]);

  // ── Open preview ─────────────────────────────────────────────────────────
  // Fetch SVG text + seat data in parallel, then apply seat colors to the SVG.
  const handleView = useCallback(async (row: LayoutApiResponse) => {
    setPreviewLayout(row);
    setColoredSvg(null);
    setPreviewError(false);
    setPreviewLoading(true);
    try {
      const [svgRes, { seats }] = await Promise.all([
        fetch(row.layout_file_url),
        fetchLayoutSeats(row.layout_id),
      ]);
      if (!svgRes.ok) throw new Error(`SVG fetch ${svgRes.status}`);
      const raw   = await svgRes.text();
      // Make SVG fluid so it fills the modal container
      const fluid = raw
        .replace(/\bwidth="[^"]*"/,  'width="100%"')
        .replace(/\bheight="[^"]*"/, 'height="100%"');
      setColoredSvg(applyColors(fluid, seats));
    } catch (err) {
      console.error("[LayoutTable] preview load failed", err);
      setPreviewError(true);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const handleClose = useCallback(() => {
    setPreviewLayout(null);
    setColoredSvg(null);
    setPreviewError(false);
  }, []);

  // ── Download ─────────────────────────────────────────────────────────────
  // The colored SVG string is already in memory — no extra S3 fetch needed.
  const handleDownloadSvg = useCallback(async () => {
    if (!coloredSvg || !previewLayout) return;
    setDownloading(true);
    try {
      const blob    = new Blob([coloredSvg], { type: "image/svg+xml" });
      const blobUrl = URL.createObjectURL(blob);
      const link    = document.createElement("a");
      link.href     = blobUrl;
      link.download = `${previewLayout.layout_name ?? "layout"}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("[LayoutTable] download failed", err);
    } finally {
      setDownloading(false);
    }
  }, [coloredSvg, previewLayout]);

  // ── Navigate to manage-layout ────────────────────────────────────────────
  const handleManage = useCallback((row: LayoutApiResponse) => {
    const params = new URLSearchParams({
      layoutId:   row.layout_id,
      floorId:    row.floor_id,
      buildingId: row.building_id,
      siteId:     row.site_id,
    });
    router.push(`/admin/layouts/manage-layout?${params.toString()}`);
  }, [router]);

  const { page, rowsPerPage, total, paginated, setPage } = useLayoutsTable(layouts);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">

      {/* HEADER */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h2 className="text-base font-semibold text-gray-800">
          Floor Layouts — {selection.buildingName} / {selection.floorName}
        </h2>
        <span className="text-xs bg-gray-100 px-3 py-1 rounded-full text-gray-600">
          {total} Layouts
        </span>
      </div>

      {/* TABLE */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-xs" style={{ minWidth: "700px" }}>
          <colgroup>
            <col style={{ width: "220px" }} />
            <col style={{ width: "80px" }} />
            <col style={{ width: "110px" }} />
            <col style={{ width: "90px" }} />
            <col style={{ width: "160px" }} />
            <col style={{ width: "90px" }} />
          </colgroup>
          <thead className="text-xs text-blue-600 bg-blue-100 border-b sticky top-0 z-10">
            <tr>
              <th className="px-3 py-3 font-medium text-left">Layout Name</th>
              <th className="px-3 py-3 font-medium text-center">Version</th>
              <th className="px-3 py-3 font-medium text-center">Status</th>
              <th className="px-3 py-3 font-medium text-center">Published</th>
              <th className="px-3 py-3 font-medium text-left">Uploaded By</th>
              <th className="px-3 py-3 font-medium text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-3 py-3">
                      <div className="h-3 bg-gray-100 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400">
                  {selection.floorId
                    ? "No layouts found for this floor"
                    : "Select a floor to view layouts"}
                </td>
              </tr>
            ) : (
              paginated.map((row) => (
                <tr
                  key={row.layout_id}
                  className={`transition-colors ${
                    String(row.layout_id) === String(selectedLayoutId)
                      ? "bg-indigo-50" : "hover:bg-gray-50"
                  }`}
                >
                  <td className="px-3 py-3 font-medium">{row.layout_name}</td>
                  <td className="px-3 py-3 text-center">{row.version_no}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                      row.status === "PUBLISHED" ? "bg-green-100 text-green-600"
                      : row.status === "DRAFT"   ? "bg-blue-100 text-blue-600"
                                                 : "bg-gray-100 text-gray-600"
                    }`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">{row.is_published ? "Yes" : "No"}</td>
                  <td className="px-3 py-3">{row.uploaded_by_name ?? row.uploaded_by_user_id}</td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex justify-center gap-1.5">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleView(row)}>
                        <Eye className="w-3.5 h-3.5 text-indigo-600" />
                      </Button>
                      <Button
                        variant="outline" size="icon" className="h-7 w-7"
                        onClick={() => handleManage(row)}
                        onMouseEnter={() => router.prefetch("/admin/layouts/manage-layout")}
                      >
                        <Settings className="w-3.5 h-3.5 text-gray-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-between px-6 py-4 border-t text-sm text-gray-500">
        <span>
          {total > 0 &&
            `Showing ${(page - 1) * rowsPerPage + 1} to ${Math.min(
              page * rowsPerPage,
              total
            )} of ${total} entries`}
        </span>
        <LayoutPagination
          currentPage={page}
          totalPages={Math.ceil(total / rowsPerPage)}
          onPageChange={setPage}
        />
      </div>

      {/* PREVIEW MODAL */}
      {previewLayout && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-[90vw] sm:w-[70%] md:w-[55%] h-[90vh] md:h-[95%] flex flex-col shadow-xl">

            {/* Modal header */}
            <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
              <h2 className="text-sm font-semibold text-gray-800">
                {previewLayout.layout_name ?? "Layout Preview"}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadSvg}
                  disabled={downloading || !coloredSvg}
                  className="p-2 border rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Download SVG with seat colors"
                >
                  {downloading
                    ? <span className="w-4 h-4 block border-2 border-gray-400 border-t-gray-600 rounded-full animate-spin" />
                    : <Download className="w-4 h-4 text-gray-600" />
                  }
                </button>
                <button
                  onClick={handleClose}
                  className="p-2 border rounded-md hover:bg-gray-100 text-gray-500"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-hidden bg-gray-100 flex items-center justify-center p-4 min-h-0">
              {previewLoading && (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                  <p className="text-xs text-gray-400">Loading floor plan…</p>
                </div>
              )}
              {!previewLoading && previewError && (
                <p className="text-sm text-gray-400">Failed to load preview. Please try again.</p>
              )}
              {!previewLoading && coloredSvg && (
                <div
                  className="w-full h-full"
                  dangerouslySetInnerHTML={{ __html: coloredSvg }}
                />
              )}
            </div>

            {/* Legend */}
            {!previewLoading && coloredSvg && (
              <div className="flex items-center gap-4 px-4 py-2.5 border-t flex-shrink-0">
                {LEGEND.map(({ label, color }) => (
                  <span key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    {label}
                  </span>
                ))}
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
