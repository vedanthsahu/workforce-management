"use client";

import { Eye, Download, MoreHorizontal, Settings2, Trash2 } from "lucide-react";
import { useLayoutsTable } from "@/features/adminlayouts1/hooks/useLayoutsTable";
import { useLayoutsStore } from "@/store/useLayoutsStore";
import LayoutPagination from "./LayoutPagination";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutSelection, LayoutApiResponse } from "../types/layout.types";
import { useRouter } from "next/navigation";
import { fetchLayoutSeats } from "@/features/managelayout1/services/seatService";
import { deleteLayout } from "@/features/adminlayouts1/services/locationService";
import type { Seat } from "@/features/managelayout1/types/seat.types";

type Props = {
  selection: LayoutSelection;
  selectedLayoutId?: string;
};

// ── Seat color helpers ────────────────────────────────────────────────────────

// Unconfigured seats (desk or room) keep the floor plan's original artwork
// colors — they only start recoloring once an admin has actually configured
// them.
function resolveSeatFill(seat: Seat): string {
  if (seat.status === "INACTIVE") return "#EF4444";
  if (!seat.is_bookable) return "#F59E0B";
  return "#22C55E";
}

// Cabin/conference/meeting room seats are grouped under one svg id containing
// a "CBN"/"CFR"/"MR" segment (e.g. "HYD-PRV-F11-CBN-04", "HYD-PRV-F11-CFR-02",
// "HYD-PRV-F11-MR-01"), not a dedicated field.
const ROOM_SVG_ID_PATTERN = /(^|[-_])(cbn|cfr|mr)([-_]|$)/i;

function isRoomSvgId(svgId: string): boolean {
  return ROOM_SVG_ID_PATTERN.test(svgId);
}

// Escapes regex metacharacters so seat ids containing them (e.g. "F9.1",
// "Group (2)") can be safely interpolated into a RegExp instead of being
// misinterpreted as pattern syntax.
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function recolorGroup(svgText: string, id: string, fill: string): string {
  // "g" flag: some exported floor plans reuse the same <g id="..."> more than
  // once (e.g. a duplicated furniture block that wasn't re-keyed). Without
  // it, String.replace only recolors the first occurrence, leaving whichever
  // copy actually renders on screen untouched.
  const re = new RegExp(`(<g[^>]*\\bid="${escapeRegExp(id)}"[^>]*>)([\\s\\S]*?)(<\\/g>)`, "gm");
  return svgText.replace(re, (_m, open, inner, close) => {
    // fill="none" (and fill:none) are deliberately transparent — outlines,
    // cutouts, gaps between an icon's parts. Overwriting those too flattens
    // the whole group into one solid-color block, erasing the icon's shape
    // instead of just recoloring its visible parts.
    const colored = inner
      .replace(/fill="(?!none")[^"]*"/g, `fill="${fill}"`)
      .replace(/fill:(?!none)[^;"}\s]*/g, `fill:${fill}`);
    return `${open}${colored}${close}`;
  });
}

function applyColors(svgText: string, seats: Seat[]): string {
  let result = svgText;
  for (const seat of seats) {
    const id = seat.seat_svg_id;

    // Cabins/conference/meeting rooms are never recolored on the admin
    // side — they always keep the floor plan's original artwork colors.
    if (isRoomSvgId(id)) continue;

    // Unconfigured — leave the original artwork colors until an admin
    // actually configures it.
    if (!seat.is_configured) continue;

    result = recolorGroup(result, id, resolveSeatFill(seat));
  }
  return result;
}

const LEGEND = [
  { label: "Bookable", color: "#22C55E" },
  { label: "Non-bookable", color: "#F59E0B" },
  { label: "Inactive", color: "#EF4444" },
  { label: "Unconfigured", color: "#D1D5DB" },
] as const;

// ── Status dot config ─────────────────────────────────────────────────────────

function statusConfig(status: string, isPublished: boolean, isDiscarded: boolean) {
  if (isDiscarded) return { dot: "bg-red-400", text: "Discarded" };
  if (isPublished && status === "PUBLISHED") return { dot: "bg-green-500", text: "Published" };
  if (status === "DRAFT") return { dot: "bg-blue-500", text: "Draft" };
  if (status === "ARCHIVED") return { dot: "bg-gray-600", text: "Archived" };
  return { dot: "bg-gray-400", text: status };
}

// ── Auto-hide (by status age) ─────────────────────────────────────────────────
// Non-published layouts fall out of this list on their own once they've sat
// untouched (by updated_at) past their status's threshold — otherwise old
// drafts/archived rows accumulate forever. Published layouts are exempt and
// never auto-hide.
const HIDE_AFTER_DAYS: Partial<Record<string, number>> = {
  DRAFT: 15,
  ARCHIVED: 30,
  DELETED: 5,
};

function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

function hideThresholdDays(row: LayoutApiResponse): number | null {
  if (row.status === "PUBLISHED") return null;
  return HIDE_AFTER_DAYS[row.status] ?? null;
}

function isAutoHidden(row: LayoutApiResponse): boolean {
  const threshold = hideThresholdDays(row);
  if (threshold === null) return false;
  const reference = row.updated_at ?? row.created_at;
  if (!reference) return false;
  return daysSince(reference) >= threshold;
}

function hideCountdownLabel(row: LayoutApiResponse): string | null {
  const threshold = hideThresholdDays(row);
  if (threshold === null) return null;
  const reference = row.updated_at ?? row.created_at;
  if (!reference) return null;
  const daysLeft = Math.ceil(threshold - daysSince(reference));
  if (daysLeft <= 0) return null;
  return `Available for ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
}

function formatDetailDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === today.toDateString()) return `Today, ${time}`;
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  return `${date}, ${time}`;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function LayoutTable({ selection, selectedLayoutId }: Props) {
  const { layouts, loading, fetchLayouts, invalidateFloor } = useLayoutsStore();
  const router = useRouter();

  // ── Preview state ─────────────────────────────────────────────────────────
  const [previewLayout, setPreviewLayout] = useState<LayoutApiResponse | null>(null);
  const [coloredSvg, setColoredSvg] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // ── 3-dot menu state ──────────────────────────────────────────────────────
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // ── Discard confirmation state ────────────────────────────────────────────
  const [discardTarget, setDiscardTarget] = useState<LayoutApiResponse | null>(null);
  const [discarding, setDiscarding] = useState(false);
  const [discardError, setDiscardError] = useState<string | null>(null);
  const [discardedIds, setDiscardedIds] = useState<Set<string>>(new Set());

  // Close dropdown on outside click
  useEffect(() => {
    if (!openMenuId) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openMenuId]);

  useEffect(() => {
    if (layouts.length > 0) router.prefetch("/admin/layouts/manage-layout");
  }, [layouts, router]);

  // ── Preview ───────────────────────────────────────────────────────────────
  const handleView = useCallback(async (row: LayoutApiResponse) => {
    setOpenMenuId(null);
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
      const raw = await svgRes.text();
      const fluid = raw
        .replace(/\bwidth="[^"]*"/, 'width="100%"')
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

  // ── Download ──────────────────────────────────────────────────────────────
  const handleDownloadSvg = useCallback(async () => {
    if (!coloredSvg || !previewLayout) return;
    setDownloading(true);
    try {
      const blob = new Blob([coloredSvg], { type: "image/svg+xml" });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
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

  // ── Manage Layout ─────────────────────────────────────────────────────────
  const handleManage = useCallback((row: LayoutApiResponse) => {
    setOpenMenuId(null);
    const params = new URLSearchParams({
      layoutId: row.layout_id,
      floorId: row.floor_id,
      buildingId: row.building_id,
      siteId: row.site_id,
    });
    router.push(`/admin/layouts/manage-layout?${params.toString()}`);
  }, [router]);

  // ── Discard ───────────────────────────────────────────────────────────────
  const handleDiscardClick = useCallback((row: LayoutApiResponse) => {
    setOpenMenuId(null);
    setDiscardTarget(row);
    setDiscardError(null);
  }, []);

  const handleDiscardConfirm = useCallback(async () => {
    if (!discardTarget) return;
    setDiscarding(true);
    setDiscardError(null);
    try {
      await deleteLayout(discardTarget.layout_id);
      // Immediately mask the row while the list refetches
      setDiscardedIds((prev) => new Set([...prev, discardTarget.layout_id]));
      setDiscardTarget(null);
      invalidateFloor(discardTarget.floor_id);
      await fetchLayouts(discardTarget.floor_id);
      // Clean up mask — row is gone from list now
      setDiscardedIds((prev) => {
        const next = new Set(prev);
        next.delete(discardTarget.layout_id);
        return next;
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string }; message?: string; detail?: string } } })
          ?.response?.data?.error?.message ||
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to discard layout. Please try again.";
      setDiscardError(msg);
    } finally {
      setDiscarding(false);
    }
  }, [discardTarget, invalidateFloor, fetchLayouts]);

  const visibleLayouts = useMemo(() => layouts.filter((row) => !isAutoHidden(row)), [layouts]);
  const { page, rowsPerPage, total, paginated, setPage } = useLayoutsTable(visibleLayouts);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">

      {/* HEADER */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h2 className="text-sm sm:text-base font-semibold text-gray-800">
          Floor Layouts — {selection.buildingName} / {selection.floorName}
        </h2>
        <span className="text-xs bg-gray-100 px-3 py-1 rounded-full text-gray-600">
          {total} Versions
        </span>
      </div>

      {/* TABLE */}
      <div className="w-full">
        <table className="w-full text-xs table-fixed">
          <colgroup>
            <col style={{ width: "16%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "22%" }} />
            <col style={{ width: "22%" }} />
            <col style={{ width: "9%" }} />
          </colgroup>
          <thead className="text-xs text-blue-600 bg-blue-100 border-b">
            <tr>
              <th className="pl-5 px-3 py-3 font-bold text-left">Layout Name</th>
              <th className="pl-7 px-3 py-3 font-bold text-left">Status</th>
              <th className="px-3 py-3 font-bold text-left">Created Details</th>
              <th className="px-3 py-3 font-bold text-left">Last Updated Details</th>
              <th className="px-3 py-3 font-bold text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-3 py-3">
                      <div className="h-3 bg-gray-100 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-gray-400">
                  {selection.floorId
                    ? "No layouts found for this floor"
                    : "Select a floor to view layouts"}
                </td>
              </tr>
            ) : (
              paginated.map((row, rowIndex) => {
                const isDiscarded = discardedIds.has(row.layout_id) || row.status === "DELETED";
                const isDraft = row.status === "DRAFT";
                const isNearBottom = rowIndex >= paginated.length - 3;

                return (
                  <tr
                    key={row.layout_id}
                    className={`transition-colors ${String(row.layout_id) === String(selectedLayoutId)
                      ? "bg-indigo-50"
                      : "hover:bg-gray-50"
                      }`}
                  >
                    <td className="px-3 py-3 font-medium text-gray-900">
                      {row.layout_name}
                    </td>
                    <td className="px-3 py-3">
                      {(() => {
                        const { dot, text } = statusConfig(row.status, row.is_published, isDiscarded);
                        // Suppress only for rows optimistically masked right after
                        // a Discard click (about to vanish on refetch, not aging
                        // out) — an actual DELETED-status row still counts down.
                        const countdown = discardedIds.has(row.layout_id) ? null : hideCountdownLabel(row);
                        return (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                              <span className="text-xs text-gray-700 whitespace-nowrap">{text}</span>
                            </span>
                            {countdown && (
                              <span className="text-[10px] text-amber-500 whitespace-nowrap">{countdown}</span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium text-gray-800">
                          {row.uploaded_by_name ?? "—"}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {row.created_at ? formatDetailDate(row.created_at) : "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {(() => {
                        const isPublished = row.status === "PUBLISHED" && row.is_published;
                        // A published row's "last updated" must reflect
                        // whichever happened more recently: the original
                        // publish, or a later edit made through the
                        // bulk-configuration endpoint. That endpoint stamps
                        // updated_at/updated_by on every save but never
                        // touches published_at/published_by — activate is
                        // no longer called at all when republishing an
                        // already-published layout's edits (see
                        // dev-notes/frontend/CHANGELOG.md, 2026-08-12 17:00),
                        // so published_at alone would go stale after any
                        // post-publish edit.
                        const updatedTime = row.updated_at ? new Date(row.updated_at).getTime() : null;
                        const publishedTime = row.published_at ? new Date(row.published_at).getTime() : null;
                        const useUpdated =
                          !isPublished ||
                          (updatedTime !== null && (publishedTime === null || updatedTime > publishedTime));
                        // If the row has never actually been updated/published
                        // (e.g. a fresh DRAFT no one has touched yet), fall
                        // back to the same Created info shown in the column to
                        // its left rather than showing a bare dash — there's
                        // real info to show, it's just the same as "created."
                        // Gate the fallback on the NAME being present, not the
                        // date: updated_at defaults to the row's creation time
                        // at insert (so it's never actually null), while
                        // updated_by_user_id/name stay genuinely null until a
                        // real edit happens — checking the date here would
                        // never trigger the fallback at all.
                        const primaryName = useUpdated ? row.updated_by_name : row.published_by_name;
                        const primaryDate = useUpdated ? row.updated_at : row.published_at;
                        const name = primaryName ?? row.uploaded_by_name ?? "—";
                        const date = primaryName ? primaryDate : row.created_at;
                        return (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium text-gray-800">{name}</span>
                            <span className="text-[11px] text-gray-400">
                              {date ? formatDetailDate(date) : "—"}
                            </span>
                          </div>
                        );
                      })()}
                    </td>

                    {/* ── 3-dot menu ── */}
                    <td className="px-3 py-3 text-center">
                      {isDiscarded ? (
                        <span className="text-gray-300">—</span>
                      ) : (
                        <div className="relative flex justify-center" ref={openMenuId === row.layout_id ? menuRef : undefined}>
                          <button
                            onClick={() => setOpenMenuId(openMenuId === row.layout_id ? null : row.layout_id)}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {openMenuId === row.layout_id && (
                            <div className={`absolute right-0 z-30 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 text-left ${isNearBottom ? "bottom-8" : "top-8"}`}>
                              {/* View Layout */}
                              <button
                                onClick={() => handleView(row)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                                View Layout
                              </button>

                              {/* Manage Layout */}
                              <button
                                onClick={() => handleManage(row)}
                                onMouseEnter={() => router.prefetch("/admin/layouts/manage-layout")}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <Settings2 className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                                Manage Layout
                              </button>

                              {/* Discard — DRAFT only */}
                              {isDraft && (
                                <>
                                  <div className="my-1 border-t border-gray-100" />
                                  <button
                                    onClick={() => handleDiscardClick(row)}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                                    Discard
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-between px-6 py-4 border-t text-xs sm:text-sm text-gray-500">
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

      {/* ── PREVIEW MODAL ── */}
      {previewLayout && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-[90vw] sm:w-[70%] md:w-[55%] h-[90vh] md:h-[95%] flex flex-col shadow-xl">
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
                <button onClick={handleClose} className="p-2 border rounded-md hover:bg-gray-100 text-gray-500">
                  ✕
                </button>
              </div>
            </div>
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
                <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: coloredSvg }} />
              )}
            </div>
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

      {/* ── DISCARD CONFIRMATION MODAL ── */}
      {discardTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-sm mx-4 shadow-xl p-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Discard Layout</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Are you sure you want to discard{" "}
                  <span className="font-medium text-gray-700">{discardTarget.layout_name}</span>?
                  This action cannot be undone.
                </p>
              </div>
            </div>

            {discardError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {discardError}
              </p>
            )}

            <div className="flex justify-end gap-2.5 pt-1">
              <button
                onClick={() => { setDiscardTarget(null); setDiscardError(null); }}
                disabled={discarding}
                className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDiscardConfirm}
                disabled={discarding}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {discarding && (
                  <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                )}
                {discarding ? "Discarding…" : "Yes, Discard"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
