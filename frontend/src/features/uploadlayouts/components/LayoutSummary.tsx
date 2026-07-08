
"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { XCircle, FileStack, Eye } from "lucide-react";
import SVGPreviewModal from "@/features/uploadlayouts/components/Svgpreviewmodal";
import { LayoutSummaryData, FloorLayoutInfo } from "../types/layout.types";
import { fetchLayoutSeats } from "@/features/managelayout1/services/seatService";
import type { Seat } from "@/features/managelayout1/types/seat.types";

// ── seat coloring (same logic as LayoutPreview / LayoutTable) ─────────────────

function resolveSeatFill(seat: Seat): string {
  if (!seat.is_configured)        return "#D1D5DB";
  if (seat.status === "INACTIVE") return "#EF4444";
  if (!seat.is_bookable)          return "#F59E0B";
  return "#22C55E";
}

function applyColors(svgText: string, seats: Seat[]): string {
  let result = svgText;
  for (const seat of seats) {
    const fill = resolveSeatFill(seat);
    const re   = new RegExp(
      `(<g[^>]*id="${seat.seat_svg_id}"[^>]*>)([\\s\\S]*?)(<\\/g>)`,
      "m",
    );
    result = result.replace(re, (_m, open, inner, close) => {
      const colored = inner
        .replace(/fill="[^"]*"/g,   `fill="${fill}"`)
        .replace(/fill:[^;"}\s]*/g, `fill:${fill}`);
      return `${open}${colored}${close}`;
    });
  }
  return result;
}

const LEGEND = [
  { label: "Bookable",     color: "#22C55E" },
  { label: "Non-bookable", color: "#F59E0B" },
  { label: "Inactive",     color: "#EF4444" },
  { label: "Unconfigured", color: "#D1D5DB" },
] as const;

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
  const hasFloor = !!formData.floor?.id;
  const [showModal,     setShowModal]     = useState(false);
  const [coloredSvg,    setColoredSvg]    = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const handlePreview = async () => {
    const url      = floorLayoutInfo?.layoutFileUrl;
    const layoutId = floorLayoutInfo?.layoutId;
    if (!url) return;
    setPreviewLoading(true);
    try {
      if (layoutId) {
        const [svgRes, { seats }] = await Promise.all([
          fetch(url),
          fetchLayoutSeats(layoutId),
        ]);
        if (!svgRes.ok) throw new Error(`HTTP ${svgRes.status}`);
        const raw   = await svgRes.text();
        const fluid = raw
          .replace(/\bwidth="[^"]*"/,  'width="100%"')
          .replace(/\bheight="[^"]*"/, 'height="100%"');
        setColoredSvg(applyColors(fluid, seats));
      } else {
        const svgRes = await fetch(url);
        if (!svgRes.ok) throw new Error(`HTTP ${svgRes.status}`);
        const raw   = await svgRes.text();
        const fluid = raw
          .replace(/\bwidth="[^"]*"/,  'width="100%"')
          .replace(/\bheight="[^"]*"/, 'height="100%"');
        setColoredSvg(fluid);
      }
      setShowModal(true);
    } catch {
      setColoredSvg(null);
      setShowModal(true); // fall back to svgUrl path in modal
    } finally {
      setPreviewLoading(false);
    }
  };

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
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground shrink-0">Office</span>
              <span className="text-right font-medium wrap-break-word">
                {formData.site?.name || "-"}
              </span>
            </div>

            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground shrink-0">Building</span>
              <span className="text-right font-medium wrap-break-word">
                {formData.building?.name || "-"}
              </span>
            </div>

            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground shrink-0">Floor</span>
              <span className="text-right font-medium wrap-break-word">
                {formData.floor?.name || "-"}
              </span>
            </div>

            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground shrink-0">Layout Name</span>
              <span className="text-right font-medium wrap-break-word">
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
                      onClick={handlePreview}
                      disabled={previewLoading}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {previewLoading
                        ? <span className="w-3 h-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                        : <Eye size={13} />
                      }
                      {previewLoading ? "Loading…" : "Preview Layout"}
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
          svgContent={coloredSvg ?? undefined}
          svgUrl={coloredSvg ? undefined : floorLayoutInfo?.layoutFileUrl}
          badge={
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-xs font-semibold ring-1 ring-emerald-200">
              v{floorLayoutInfo?.layoutVersionNo} · {floorLayoutInfo?.layoutStatus ?? "PUBLISHED"}
            </span>
          }
          legend={
            coloredSvg ? (
              <div className="flex items-center gap-4">
                {LEGEND.map(({ label, color }) => (
                  <span key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    {label}
                  </span>
                ))}
              </div>
            ) : undefined
          }
          onClose={() => { setShowModal(false); setColoredSvg(null); }}
        />
      )}
    </>
  );
}