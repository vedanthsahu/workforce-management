"use client";

import { Eye, Download, Settings } from "lucide-react";
import { useLayoutsTable }  from "@/features/adminlayouts1/hooks/useLayoutsTable";
import { useLayoutsStore }  from "@/store/useLayoutsStore";
import LayoutPagination     from "./LayoutPagination";
import { useCallback, useEffect, useState } from "react";
import { LayoutSelection, LayoutApiResponse } from "../types/layout.types";
import { useRouter }        from "next/navigation";
import SvgViewer            from "./SvgViewer";

type Props = {
  selection:         LayoutSelection;
  selectedLayoutId?: string;
};

export default function LayoutTable({ selection, selectedLayoutId }: Props) {
  const { layouts, loading } = useLayoutsStore();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const router = useRouter();

  // Prefetch manage-layout route as soon as layouts are loaded so the
  // settings icon click feels instant.
  useEffect(() => {
    if (layouts.length > 0) {
      router.prefetch("/admin/layouts/manage-layout");
    }
  }, [layouts, router]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleView = useCallback((row: LayoutApiResponse) => {
    setPreviewUrl(row.layout_file_url);
  }, []);

  const handleManage = useCallback((row: LayoutApiResponse) => {
    const params = new URLSearchParams({
      layoutId:   row.layout_id,
      floorId:    row.floor_id,
      buildingId: row.building_id,
      siteId:     row.site_id,
    });
    router.push(`/admin/layouts/manage-layout?${params.toString()}`);
  }, [router]);

  const handleDownloadSvg = useCallback(() => {
    try {
      const svgElement = document.querySelector("svg");
      if (!svgElement) { alert("SVG not found"); return; }
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const blob      = new Blob([svgString], { type: "image/svg+xml" });
      const url       = URL.createObjectURL(blob);
      const link      = document.createElement("a");
      link.href       = url;
      link.download   = "layout.svg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed", err);
    }
  }, []);

  // ── Pagination ───────────────────────────────────────────────────────────
  const { page, rowsPerPage, total, paginated, setPage, setRowsPerPage } =
    useLayoutsTable(layouts);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="bg-white border rounded-xl p-6 shadow-sm">

      <div className="flex flex-wrap items-center justify-between gap-y-2 mb-6">
        <h2 className="text-sm font-semibold">
          Floor Layouts — {selection.buildingName} / {selection.floorName}
        </h2>
        <span className="text-xs bg-gray-100 px-3 py-1 rounded-full">
          {total} Layouts
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-3">Layout Name</th>
              <th>Version</th>
              <th>Status</th>
              <th>Published</th>
              <th>Uploaded By</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b animate-pulse">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="py-4">
                      <div className="h-4 bg-gray-100 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-gray-400">
                  {selection.floorId
                    ? "No layouts found for this floor"
                    : "Select a floor to view layouts"}
                </td>
              </tr>
            ) : (
              paginated.map((row) => (
                <tr
                  key={row.layout_id}
                  className={`hover:bg-gray-50 ${
                    String(row.layout_id) === String(selectedLayoutId)
                      ? "bg-indigo-50" : ""
                  }`}
                >
                  <td className="py-4">{row.layout_name}</td>
                  <td>{row.version_no}</td>
                  <td>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      row.status === "PUBLISHED" ? "bg-green-100 text-green-600"
                      : row.status === "DRAFT"   ? "bg-blue-100 text-blue-600"
                                                 : "bg-gray-100 text-gray-600"
                    }`}>
                      {row.status}
                    </span>
                  </td>
                  <td>{row.is_published ? "Yes" : "No"}</td>
                  <td>{row.uploaded_by_name ?? row.uploaded_by_user_id}</td>
                  <td>
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleView(row)}
                        className="p-2 border rounded-md hover:bg-gray-100"
                      >
                        <Eye className="w-4 h-4 text-indigo-600" />
                      </button>

                      {/* Prefetch on hover too — double guarantee for instant nav */}
                      <button
                        onClick={() => handleManage(row)}
                        onMouseEnter={() => router.prefetch("/admin/layouts/manage-layout")}
                        className="p-2 border rounded-md hover:bg-gray-100"
                      >
                        <Settings className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <LayoutPagination
        total={total}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsChange={(rows) => { setRowsPerPage(rows); setPage(1); }}
      />

      {previewUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-[90vw] sm:w-[70%] md:w-[50%] h-[90vh] md:h-[95%] flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="text-sm font-semibold">Layout Preview</h2>
              <div className="flex items-center gap-2">
                <button onClick={handleDownloadSvg}
                  className="p-2 border rounded-md hover:bg-gray-100">
                  <Download className="w-4 h-4 text-gray-600" />
                </button>
                <button onClick={() => setPreviewUrl(null)}
                  className="p-2 border rounded-md hover:bg-gray-100">
                  ✕
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center">
              <div className="p-4">
                <SvgViewer url={previewUrl} />
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
