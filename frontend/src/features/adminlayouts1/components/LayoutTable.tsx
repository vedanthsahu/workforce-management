"use client";

import { Eye, Download, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const { page, rowsPerPage, total, paginated, setPage } =
    useLayoutsTable(layouts);

  // ── Render ──────────────────────────────────────────────────────────────
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
