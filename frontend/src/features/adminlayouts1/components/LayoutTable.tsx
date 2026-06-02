"use client";

import { Eye, Download, MoreVertical,Settings } from "lucide-react";
import { useLayoutsTable } from "@/features/adminlayouts1/hooks/useLayoutsTable";
import LayoutPagination from "./LayoutPagination";
import { useEffect, useState } from "react";
import { getLayoutsByFloor } from "../services/locationService";
import { LayoutSelection, LayoutApiResponse } from "../types/layout.types";
import { useRouter } from "next/navigation";
import SvgViewer from "./SvgViewer";
import { toast } from "sonner";

type Props = {
  selection: LayoutSelection;
  refreshKey: number;
};

export default function LayoutTable({ selection, refreshKey }: Props) {
  const [data, setData] = useState<LayoutApiResponse[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  

const router = useRouter();


const handleView = (row: any) => {
  setPreviewUrl(row.layout_file_url);
};

const handleDownloadSvg = () => {
  try {
    // 🔥 get SVG element from DOM
    const svgElement = document.querySelector("svg");

    if (!svgElement) {
      alert("SVG not found");
      return;
    }

    // 🔥 convert SVG → string
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);

    // 🔥 create blob
    const blob = new Blob([svgString], {
      type: "image/svg+xml",
    });

    // 🔥 create download link
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "layout.svg";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

  } catch (err) {
    console.error("Download failed", err);
  }
};

// const handleManage = (row: any) => {
//   router.push(`/admin/layouts/manage-layout`);
// };

const handleManage = (row: any) => {
  const params = new URLSearchParams({
    layoutId: row.layout_id,
    floorId: String(row.floor_id),       // include if LayoutApiResponse has it
    buildingId: String(row.building_id), // include if available
    siteId: String(row.site_id),         // include if available
  });
  router.push(`/admin/layouts/manage-layout?${params.toString()}`);
};

  useEffect(() => {
    console.log("FLOOR ID:", selection.floorId);

    if (!selection?.floorId) return;

    loadLayouts();
  }, [selection.floorId, refreshKey]);

  

  const loadLayouts = async () => {
    try {
      const res = await getLayoutsByFloor(selection.floorId); // ✅ dynamic
      console.log("API RESPONSE:", res);
      setData(res);
    } catch (err) {
      console.error(err);
      setData([]);
    }
  };

  const {
    page,
    rowsPerPage,
    total,
    paginated,
    setPage,
    setRowsPerPage,
  } = useLayoutsTable(data);

  return (
    <div className="bg-white border rounded-xl p-6 shadow-sm">

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-sm font-semibold">
          Floor Layouts - {selection.buildingName} / {selection.floorName}
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
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-gray-400">
                  No layouts found , select a layout to view details
                </td>
              </tr>
            ) : (
              paginated.map((row) => (
                <tr key={row.layout_id} className="border-b hover:bg-gray-50">

                  <td className="py-4">{row.layout_name}</td>
                  <td>{row.version_no}</td>

                  <td>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        row.status === "PUBLISHED"
                          ? "bg-green-100 text-green-600"
                          : row.status === "DRAFT"
                          ? "bg-blue-100 text-blue-600"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>

                  <td>{row.is_published ? "Yes" : "No"}</td>

                  <td>{row.uploaded_by_name}</td>
                  <td>
                    <div className="flex justify-center gap-2">

                      <button
                        onClick={() => handleView(row)}
                        className="p-2 border rounded-md hover:bg-gray-100"
                      >
                        <Eye className="w-4 h-4 text-indigo-600" />
                      </button>

                      <button
                        onClick={() => handleManage(row)}
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
        onRowsChange={(rows) => {
          setRowsPerPage(rows);
          setPage(1);
        }}
      />

     {previewUrl && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

    {/* MODAL CONTAINER */}
    <div className="bg-white rounded-xl w-[50%] h-[95%] flex flex-col shadow-xl">

      {/* 🔥 HEADER */}
      <div className="flex items-center justify-between px-4 py-3 border-b">

        <h2 className="text-sm font-semibold">
          Layout Preview
        </h2>

        <div className="flex items-center gap-2">

          {/* DOWNLOAD */}
          <button
            onClick={handleDownloadSvg}
            className="p-2 border rounded-md hover:bg-gray-100"
          >
            <Download className="w-4 h-4 text-gray-600" />
          </button>

          {/* CLOSE */}
          <button
            onClick={() => setPreviewUrl(null)}
            className="p-2 border rounded-md hover:bg-gray-100"
          >
            ✕
          </button>

        </div>
      </div>

      {/* 🔥 SVG AREA */}
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