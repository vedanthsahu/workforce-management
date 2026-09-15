"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import type { SeatOption } from "../types/blockedSeats.types";

interface BlockableFloorMapProps {
  layoutUrl: string;
  resources: SeatOption[];
  selectedIds: string[];
  onToggle: (resourceId: string) => void;
}

const escapeSelector = (value: string) =>
  typeof CSS !== "undefined" && CSS.escape ? CSS.escape(value) : value;

export default function BlockableFloorMap({
  layoutUrl,
  resources,
  selectedIds,
  onToggle,
}: BlockableFloorMapProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [svgText, setSvgText] = useState("");
  const [loadError, setLoadError] = useState("");
  const [zoom, setZoom] = useState(1);

  const resourceBySvgId = useMemo(
    () => new Map(resources.map((resource) => [resource.svg_element_id ?? resource.seat_code, resource])),
    [resources],
  );

  useEffect(() => {
    const controller = new AbortController();
    setSvgText("");
    setLoadError("");
    fetch(layoutUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Floor layout could not be loaded.");
        return response.text();
      })
      .then((text) => setSvgText(text))
      .catch((error: unknown) => {
        if ((error as { name?: string }).name !== "AbortError") {
          setLoadError("Floor layout could not be loaded from storage.");
        }
      });
    return () => controller.abort();
  }, [layoutUrl]);

  const renderedSvg = useMemo(() => {
    if (!svgText || typeof DOMParser === "undefined") return "";
    const document = new DOMParser().parseFromString(svgText, "image/svg+xml");
    document.querySelectorAll("script, foreignObject").forEach((node) => node.remove());
    document.querySelectorAll("*").forEach((node) => {
      for (const attribute of Array.from(node.attributes)) {
        if (attribute.name.toLowerCase().startsWith("on")) node.removeAttribute(attribute.name);
      }
    });
    const root = document.documentElement;
    root.setAttribute("width", "100%");
    root.setAttribute("height", "100%");
    root.setAttribute("preserveAspectRatio", "xMidYMid meet");

    for (const resource of resources) {
      const svgId = resource.svg_element_id ?? resource.seat_code;
      const element = root.querySelector(`#${escapeSelector(svgId)}`) as SVGElement | null;
      if (!element) continue;
      const selected = selectedIds.includes(resource.seat_id);
      const disabled = !resource.selectable;
      element.style.cursor = disabled ? "not-allowed" : "pointer";
      element.style.opacity = disabled ? "0.42" : "1";
      if (selected) {
        element.style.filter =
          "drop-shadow(0 0 8px var(--primary)) drop-shadow(0 0 16px var(--primary))";
      } else if (resource.hasBooking) {
        element.style.filter = "sepia(1) saturate(2.4) hue-rotate(350deg)";
      } else if (resource.hasBlock) {
        element.style.filter = "grayscale(1)";
      }
    }
    return new XMLSerializer().serializeToString(root);
  }, [resources, selectedIds, svgText]);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    let element = event.target as Element | null;
    while (element && element !== event.currentTarget) {
      if (element.id && resourceBySvgId.has(element.id)) {
        const resource = resourceBySvgId.get(element.id);
        if (resource?.selectable) onToggle(resource.seat_id);
        return;
      }
      element = element.parentElement;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex flex-wrap gap-3">
          <span><i className="mr-1 inline-block size-2.5 rounded-full bg-emerald-500" />Available</span>
          <span><i className="mr-1 inline-block size-2.5 rounded-full bg-amber-500" />Booking conflict</span>
          <span><i className="mr-1 inline-block size-2.5 rounded-full bg-muted-foreground" />Blocked / unavailable</span>
          <span><i className="mr-1 inline-block size-2.5 rounded-full bg-primary" />Selected</span>
        </div>
        <div className="flex gap-1">
          <button type="button" aria-label="Zoom in" className="rounded-md border border-border bg-background p-2 text-foreground shadow-sm hover:bg-muted" onClick={() => setZoom((value) => Math.min(2.5, value + 0.2))}><ZoomIn size={14} /></button>
          <button type="button" aria-label="Zoom out" className="rounded-md border border-border bg-background p-2 text-foreground shadow-sm hover:bg-muted" onClick={() => setZoom((value) => Math.max(0.6, value - 0.2))}><ZoomOut size={14} /></button>
          <button type="button" aria-label="Fit layout" className="rounded-md border border-border bg-background p-2 text-foreground shadow-sm hover:bg-muted" onClick={() => { setZoom(1); viewportRef.current?.scrollTo({ left: 0, top: 0 }); }}><Maximize2 size={14} /></button>
        </div>
      </div>
      <div ref={viewportRef} className="relative h-[660px] overflow-auto rounded-xl border border-border bg-muted/30">
        {!renderedSvg && !loadError && <p className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">Loading floor layout…</p>}
        {loadError && <p className="absolute inset-0 grid place-items-center text-sm text-red-600">{loadError}</p>}
        {renderedSvg && (
          <div
            className="min-h-[660px] min-w-full p-3 transition-[width,height] duration-150"
            style={{
              width: `${zoom * 100}%`,
              height: `${zoom * 660}px`,
            }}
            onClick={handleClick}
            dangerouslySetInnerHTML={{ __html: renderedSvg }}
          />
        )}
      </div>
      <p className="text-xs text-muted-foreground">Click any available seat, cabin, conference room, or meeting room to select it.</p>
    </div>
  );
}
