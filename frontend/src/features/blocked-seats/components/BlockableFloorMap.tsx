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

const RESOURCE_COLORS = {
  available: {
    body: "#d1fae5",
    bodyStroke: "#34d399",
    armrest: "#a7f3d0",
    back: "#059669",
    backStroke: "#047857",
    curve: "#34d399",
    arc: "#6ee7b7",
  },
  conflict: {
    body: "#ffedd5",
    bodyStroke: "#f59e0b",
    armrest: "#fed7aa",
    back: "#c2410c",
    backStroke: "#9a3412",
    curve: "#f59e0b",
    arc: "#fdba74",
  },
  unavailable: {
    body: "#f3f4f6",
    bodyStroke: "#9ca3af",
    armrest: "#e5e7eb",
    back: "#6b7280",
    backStroke: "#4b5563",
    curve: "#9ca3af",
    arc: "#d1d5db",
  },
  selected: {
    body: "#c7d2fe",
    bodyStroke: "#6366f1",
    armrest: "#a5b4fc",
    back: "#4338ca",
    backStroke: "#3730a3",
    curve: "#6366f1",
    arc: "#818cf8",
  },
} as const;

const FALLBACK_FILL = {
  available: "#22c55e",
  conflict: "#f59e0b",
  unavailable: "#9ca3af",
  selected: "#6366f1",
} as const;

const ROOM_SVG_ID_PATTERN = /(^|[-_])(CBN|CFR|MR|TR)([-_]|$)/i;
const SVG_CACHE_LIMIT = 4;
const svgTextCache = new Map<string, string>();

const cacheSvgText = (url: string, text: string) => {
  svgTextCache.delete(url);
  svgTextCache.set(url, text);
  if (svgTextCache.size > SVG_CACHE_LIMIT) {
    const oldestUrl = svgTextCache.keys().next().value;
    if (oldestUrl) svgTextCache.delete(oldestUrl);
  }
};

const isRoomResource = (resource: SeatOption) =>
  /CABIN|CONFERENCE|MEETING|TRAINING|ROOM/i.test(
    resource.resource_type ?? "",
  ) || ROOM_SVG_ID_PATTERN.test(resource.svg_element_id ?? resource.seat_code);

const applyResourceColor = (
  element: SVGElement,
  resource: SeatOption,
  selected: boolean,
) => {
  const state = selected
    ? "selected"
    : resource.hasBlock || resource.isUnavailable
      ? "unavailable"
      : resource.hasBooking
        ? "conflict"
        : "available";
  const colors = RESOURCE_COLORS[state];

  if (isRoomResource(resource)) {
    element.style.filter =
      state === "available"
        ? "none"
        : state === "unavailable"
          ? "grayscale(1) opacity(0.55)"
          : `drop-shadow(0 0 5px ${colors.bodyStroke}) drop-shadow(0 0 9px ${colors.bodyStroke})`;
    return;
  }

  const shapes = [
    ...(element.matches("path, rect, circle, ellipse, polygon")
      ? [element]
      : []),
    ...element.querySelectorAll<SVGElement>(
      "path, rect, circle, ellipse, polygon",
    ),
  ];
  let matchedChairPalette = false;

  // Some uploaded layouts put fill/stroke on the wrapping <g> instead of on
  // each child shape. Resolve that inherited paint before applying a state
  // colour so those seats also visibly react when selected.
  const originalPaint = (
    shape: SVGElement,
    property: "fill" | "stroke",
  ) => {
    const dataKey = property === "fill" ? "originalFill" : "originalStroke";
    const cached = shape.dataset[dataKey];
    if (cached !== undefined) return cached;

    let current: SVGElement | null = shape;
    while (current) {
      const inlineValue =
        property === "fill" ? current.style.fill : current.style.stroke;
      const value = current.getAttribute(property) || inlineValue;
      if (value) {
        const normalized = value.toLowerCase();
        shape.dataset[dataKey] = normalized;
        return normalized;
      }
      if (current === element) break;
      current = current.parentElement as SVGElement | null;
    }

    shape.dataset[dataKey] = "";
    return "";
  };

  shapes.forEach((shape) => {
    const fill = originalPaint(shape, "fill");
    const stroke = originalPaint(shape, "stroke");

    if (fill === "#c8c8c8") {
      shape.style.fill = colors.body;
      matchedChairPalette = true;
    }
    if (fill === "#b0b0b0") {
      shape.style.fill = colors.armrest;
      matchedChairPalette = true;
    }
    if (fill === "#616161") {
      shape.style.fill = colors.back;
      matchedChairPalette = true;
    }
    if (stroke === "#888888") shape.style.stroke = colors.bodyStroke;
    if (stroke === "#424242") shape.style.stroke = colors.backStroke;
    if (stroke === "#707070") shape.style.stroke = colors.curve;
    if (stroke === "#a0a0a0") shape.style.stroke = colors.arc;
  });

  // Match the booking floor map's uploaded-layout fallback. Some production
  // SVGs use a different single chair color, so template-specific color
  // replacement cannot identify individual chair parts. Only regular seat
  // groups reach this branch; room/cabin artwork is protected above.
  if (!matchedChairPalette) {
    shapes.forEach((shape) => {
      const fill = originalPaint(shape, "fill");
      if (!fill || fill.toLowerCase() === "none") return;
      shape.style.fill = FALLBACK_FILL[state];
      shape.style.stroke = "#000000";
      shape.style.strokeWidth = "32";
    });
  }
  element.style.filter = selected
    ? `drop-shadow(0 0 5px ${colors.bodyStroke}) drop-shadow(0 0 9px ${colors.bodyStroke})`
    : "none";
};

const escapeSelector = (value: string) =>
  typeof CSS !== "undefined" && CSS.escape ? CSS.escape(value) : value;

const resourceHoverLabel = (resource: SeatOption) => {
  const name = resource.resource_name?.trim();
  return name && name !== resource.seat_code
    ? `${resource.seat_code} — ${name}`
    : resource.seat_code;
};

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

  useEffect(() => {
    const cachedSvg = svgTextCache.get(layoutUrl);
    if (cachedSvg) {
      setSvgText(cachedSvg);
      setLoadError("");
      return;
    }
    const controller = new AbortController();
    setSvgText("");
    setLoadError("");
    fetch(layoutUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Floor layout could not be loaded.");
        return response.text();
      })
      .then((text) => {
        cacheSvgText(layoutUrl, text);
        setSvgText(text);
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name !== "AbortError") {
          setLoadError("Floor layout could not be loaded from storage.");
        }
      });
    return () => controller.abort();
  }, [layoutUrl]);

  const renderedSvg = useMemo(() => {
    if (!svgText || typeof DOMParser === "undefined") return "";
    const selected = new Set(selectedIds);
    const document = new DOMParser().parseFromString(svgText, "image/svg+xml");
    document
      .querySelectorAll("script, foreignObject")
      .forEach((node) => node.remove());
    document.querySelectorAll("*").forEach((node) => {
      for (const attribute of Array.from(node.attributes)) {
        if (attribute.name.toLowerCase().startsWith("on"))
          node.removeAttribute(attribute.name);
      }
    });
    const root = document.documentElement;
    root.setAttribute("width", "100%");
    root.setAttribute("height", "100%");
    root.setAttribute("preserveAspectRatio", "xMidYMid meet");

    for (const resource of resources) {
      const svgId = resource.svg_element_id ?? resource.seat_code;
      const element = root.querySelector(
        `#${escapeSelector(svgId)}`,
      ) as SVGElement | null;
      if (!element) continue;
      const disabled = !resource.selectable;
      const hoverLabel = resourceHoverLabel(resource);
      const existingTitle = Array.from(element.children).find(
        (child) => child.tagName.toLowerCase() === "title",
      );
      existingTitle?.remove();
      const title = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "title",
      );
      title.textContent = hoverLabel;
      element.prepend(title);
      element.dataset.blockResourceId = resource.seat_id;
      element.setAttribute("aria-label", hoverLabel);
      element.style.cursor = disabled ? "not-allowed" : "pointer";
      element.style.opacity = disabled ? "0.55" : "1";
      applyResourceColor(element, resource, selected.has(resource.seat_id));
    }
    return new XMLSerializer().serializeToString(root);
  }, [resources, selectedIds, svgText]);

  const resourceById = useMemo(
    () => new Map(resources.map((resource) => [resource.seat_id, resource])),
    [resources],
  );
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as Element;
    const resourceElement = target.closest<SVGElement>(
      "[data-block-resource-id]",
    );
    const resourceId = resourceElement?.dataset.blockResourceId;
    if (!resourceId) return;
    const resource = resourceById.get(resourceId);
    if (resource?.selectable) onToggle(resourceId);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-medium text-gray-600">
        <div className="flex flex-wrap gap-3">
          <span>
            <i className="mr-1 inline-block size-2.5 rounded-full bg-emerald-500" />
            Available
          </span>
          <span>
            <i className="mr-1 inline-block size-2.5 rounded-full bg-amber-500" />
            Booking conflict
          </span>
          <span>
            <i className="mr-1 inline-block size-2.5 rounded-full bg-gray-400" />
            Blocked / unavailable
          </span>
          <span>
            <i className="mr-1 inline-block size-2.5 rounded-full bg-indigo-500" />
            Selected
          </span>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Zoom in"
            className="rounded-md border border-border bg-background p-2 text-foreground shadow-sm hover:bg-muted"
            onClick={() => setZoom((value) => Math.min(2.5, value + 0.2))}
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            className="rounded-md border border-border bg-background p-2 text-foreground shadow-sm hover:bg-muted"
            onClick={() => setZoom((value) => Math.max(0.6, value - 0.2))}
          >
            <ZoomOut size={14} />
          </button>
          <button
            type="button"
            aria-label="Fit layout"
            className="rounded-md border border-border bg-background p-2 text-foreground shadow-sm hover:bg-muted"
            onClick={() => {
              setZoom(1);
              viewportRef.current?.scrollTo({ left: 0, top: 0 });
            }}
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>
      <div
        ref={viewportRef}
        className="relative h-[700px] overflow-auto rounded-xl border border-[#EBEBF5] bg-[#F7F8FC]"
      >
        {!renderedSvg && !loadError && (
          <p className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
            Loading floor layout…
          </p>
        )}
        {loadError && (
          <p className="absolute inset-0 grid place-items-center text-sm text-red-600">
            {loadError}
          </p>
        )}
        {renderedSvg && (
          <div
            className="min-h-[700px] min-w-full p-2 transition-[width,height] duration-150"
            style={{
              width: `${zoom * 100}%`,
              height: `${zoom * 700}px`,
            }}
            onClick={handleClick}
            dangerouslySetInnerHTML={{ __html: renderedSvg }}
          />
        )}
      </div>
      <p className="text-[11.5px] text-gray-400 sm:text-[12px]">
        Hover to view a space name. Click any available seat, cabin, conference
        room, or meeting room to select it.
      </p>
    </div>
  );
}
