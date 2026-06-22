// "use client";

// import { useState } from "react";
// import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
// import { XCircle, FileStack, Eye } from "lucide-react";
// import SVGPreviewModal from "@/features/uploadlayouts/components/Svgpreviewmodal";
// import { LayoutSummaryData, FloorLayoutInfo } from "../types/layout.types";

// type Props = {
//   formData: LayoutSummaryData;
//   floorLayoutInfo?: FloorLayoutInfo | null;
// };

// export default function LayoutSummary({ formData, floorLayoutInfo }: Props) {
//   const hasFloor      = !!formData.floor?.id;
//   const [showModal, setShowModal] = useState(false);

//   return (
//     <>
//       <div className="space-y-4">

//         {/* ── Layout Summary (Preview) ───────────────────────────────── */}
//         <Card>
//           <CardHeader className="pb-3">
//             <CardTitle className="text-sm font-semibold">
//               Layout Summary (Preview)
//             </CardTitle>
//           </CardHeader>

//           <CardContent className="space-y-3 text-sm">
//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Site</span>
//               <span className="text-right font-medium truncate max-w-[180px]">
//                 {formData.site?.name || "-"}
//               </span>
//             </div>

//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Building</span>
//               <span className="text-right font-medium truncate max-w-[180px]">
//                 {formData.building?.name || "-"}
//               </span>
//             </div>

//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Floor</span>
//               <span className="text-right font-medium truncate max-w-[180px]">
//                 {formData.floor?.name || "-"}
//               </span>
//             </div>

//             <div className="flex justify-between">
//               <span className="text-muted-foreground">Layout Name</span>
//               <span className="text-right font-medium truncate max-w-[180px]">
//                 {formData.layoutName || "-"}
//               </span>
//             </div>

//             <div className="flex justify-between items-center">
//               <span className="text-muted-foreground">Status</span>
//               <span className="text-yellow-600 bg-yellow-100 px-2 py-1 rounded-md text-xs font-semibold">
//                 DRAFT
//               </span>
//             </div>
//           </CardContent>
//         </Card>

//         {/* ── Current Published Layout ───────────────────────────────── */}
//         <Card>
//           <CardHeader className="pb-3">
//             <CardTitle className="text-sm font-semibold">
//               Current Published Layout
//             </CardTitle>
//           </CardHeader>

//           <CardContent className="space-y-3 text-sm">

//             {!hasFloor && (
//               <div className="flex flex-col items-center justify-center py-4 text-center gap-2">
//                 <FileStack className="w-7 h-7 text-gray-300" />
//                 <p className="text-xs text-muted-foreground">
//                   Select a floor to see its current published layout.
//                 </p>
//               </div>
//             )}

//             {hasFloor && !floorLayoutInfo?.layoutIsPublished && (
//               <div className="flex flex-col items-center justify-center py-4 text-center gap-2">
//                 <XCircle className="w-7 h-7 text-gray-300" />
//                 <p className="text-[13px] font-medium text-gray-600">No published layout</p>
//                 <p className="text-xs text-muted-foreground">
//                   This floor doesn't have a published layout yet.
//                 </p>
//               </div>
//             )}

//             {hasFloor && floorLayoutInfo?.layoutIsPublished && (
//               <>
//                 <div className="flex justify-between items-start gap-2">
//                   <span className="text-muted-foreground shrink-0">Layout Name</span>
//                   <span className="text-right font-medium max-w-[180px]">
//                     {floorLayoutInfo.layoutName || "—"}
//                   </span>
//                 </div>

//                 <div className="flex justify-between">
//                   <span className="text-muted-foreground">Version</span>
//                   <span className="font-medium">v{floorLayoutInfo.layoutVersionNo ?? "—"}</span>
//                 </div>

//                 <div className="flex justify-between">
//                   <span className="text-muted-foreground">Total Versions</span>
//                   <span className="font-medium">{floorLayoutInfo.layoutCount ?? "—"}</span>
//                 </div>

//                 <div className="flex justify-between items-center">
//                   <span className="text-muted-foreground">Status</span>
//                   <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-xs font-semibold ring-1 ring-emerald-200">
//                     {floorLayoutInfo.layoutStatus ?? "PUBLISHED"}
//                   </span>
//                 </div>

//                 {/* ── Preview button ── */}
//                 {floorLayoutInfo.layoutFileUrl && (
//                   <div className="pt-1">
//                     <button
//                       type="button"
//                       onClick={() => setShowModal(true)}
//                       className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-colors"
//                     >
//                       <Eye size={13} />
//                       Preview Layout
//                     </button>
//                   </div>
//                 )}
//               </>
//             )}

//           </CardContent>
//         </Card>

//       </div>

//       {/* ── Modal ── */}
//       {showModal && (
//         <SVGPreviewModal
//           title={floorLayoutInfo?.layoutName ?? "Published Layout"}
//           svgUrl={floorLayoutInfo?.layoutFileUrl}
//           badge={
//             <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-xs font-semibold ring-1 ring-emerald-200">
//               v{floorLayoutInfo?.layoutVersionNo} · {floorLayoutInfo?.layoutStatus ?? "PUBLISHED"}
//             </span>
//           }
//           onClose={() => setShowModal(false)}
//         />
//       )}
//     </>
//   );
// }
"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { XCircle, FileStack, Eye } from "lucide-react";
import SVGPreviewModal from "@/features/uploadlayouts/components/Svgpreviewmodal";
import { LayoutSummaryData, FloorLayoutInfo } from "../types/layout.types";

type Props = {
  formData: LayoutSummaryData;
  floorLayoutInfo?: FloorLayoutInfo | null;
};

function formatLastUpdated(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function LayoutSummary({ formData, floorLayoutInfo }: Props) {
  const hasFloor      = !!formData.floor?.id;
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="space-y-4">

        {/* ── Layout Summary (Preview) ───────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Layout Summary (Preview)
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Site</span>
              <span className="text-right font-medium truncate max-w-[180px]">
                {formData.site?.name || "-"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Building</span>
              <span className="text-right font-medium truncate max-w-[180px]">
                {formData.building?.name || "-"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Floor</span>
              <span className="text-right font-medium truncate max-w-[180px]">
                {formData.floor?.name || "-"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Layout Name</span>
              <span className="text-right font-medium truncate max-w-[180px]">
                {formData.layoutName || "-"}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Status</span>
              <span className="text-yellow-600 bg-yellow-100 px-2 py-1 rounded-md text-xs font-semibold">
                DRAFT
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ── Current Published Layout ───────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Current Published Layout
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 text-sm">

            {!hasFloor && (
              <div className="flex flex-col items-center justify-center py-4 text-center gap-2">
                <FileStack className="w-7 h-7 text-gray-300" />
                <p className="text-xs text-muted-foreground">
                  Select a floor to see its current published layout.
                </p>
              </div>
            )}

            {hasFloor && !floorLayoutInfo?.layoutIsPublished && (
              <div className="flex flex-col items-center justify-center py-4 text-center gap-2">
                <XCircle className="w-7 h-7 text-gray-300" />
                <p className="text-[13px] font-medium text-gray-600">No published layout</p>
                <p className="text-xs text-muted-foreground">
                  This floor doesn't have a published layout yet.
                </p>
              </div>
            )}

            {hasFloor && floorLayoutInfo?.layoutIsPublished && (
              <>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-muted-foreground shrink-0">Layout Name</span>
                  <span className="text-right font-medium max-w-[180px]">
                    {floorLayoutInfo.layoutName || "—"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Version</span>
                  <span className="font-medium">v{floorLayoutInfo.layoutVersionNo ?? "—"}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Published By</span>
                  <span className="font-medium">{floorLayoutInfo.publishedByName ?? "—"}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span className="font-medium">
                    {formatLastUpdated(floorLayoutInfo.layoutLastUpdated)}
                  </span>
                </div>

                {/* ── Preview button ── */}
                {floorLayoutInfo.layoutFileUrl && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowModal(true)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-colors"
                    >
                      <Eye size={13} />
                      Preview Layout
                    </button>
                  </div>
                )}
              </>
            )}

          </CardContent>
        </Card>

      </div>

      {/* ── Modal ── */}
      {showModal && (
        <SVGPreviewModal
          title={floorLayoutInfo?.layoutName ?? "Published Layout"}
          svgUrl={floorLayoutInfo?.layoutFileUrl}
          badge={
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-xs font-semibold ring-1 ring-emerald-200">
              v{floorLayoutInfo?.layoutVersionNo} · {floorLayoutInfo?.layoutStatus ?? "PUBLISHED"}
            </span>
          }
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}