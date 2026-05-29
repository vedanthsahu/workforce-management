"use client";

import { useLayoutSvg } from "../hooks/useLayoutDetails";
import { Layout } from "../types/layout.types";

interface LayoutSvgCanvasProps {
  layout: Layout | null;
  zoom: number;
}

// check if URL is an SVG
function isSvgUrl(url: string) {
  return url.toLowerCase().includes(".svg");
}

export default function LayoutSvgCanvas({ layout, zoom }: LayoutSvgCanvasProps) {
  const fileUrl = layout?.layout_file_url ?? null;
  const isHttps = fileUrl?.startsWith("https://");
  const isSvg = fileUrl ? isSvgUrl(fileUrl) : false;

  const { svgContent, loading, error } = useLayoutSvg(
    isHttps && isSvg ? fileUrl : null   // only fetch if SVG over https
  );

  // ── empty state ────────────────────────────────────────────────────────────
  if (!layout) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
        Select a location and layout version to preview
      </div>
    );
  }

  // ── no valid URL ───────────────────────────────────────────────────────────
  if (!fileUrl || !isHttps) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
        SVG Layout Preview (Coming Soon)
      </div>
    );
  }

  // ── PNG / JPG / non-SVG image — render directly ────────────────────────────
  if (!isSvg) {
    return (
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <img
          src={fileUrl}
          alt="Floor layout"
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top center",
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
          }}
        />
      </div>
    );
  }

  // ── SVG loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
        Loading layout…
      </div>
    );
  }

  // ── SVG fetch error ────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400 text-sm">
        <span>Unable to load SVG preview</span>
        
          href={fileUrl}
          target="_blank"
          rel="noreferrer"
          className="text-indigo-500 underline text-xs"
        <a>
          Open file directly ↗
        </a>
      </div>
    );
  }

  // ── SVG inline render ──────────────────────────────────────────────────────
  return (
    <div
      style={{
        transform: `scale(${zoom / 100})`,
        transformOrigin: "top left",
        width: `${(100 * 100) / zoom}%`,
        height: `${(100 * 100) / zoom}%`,
      }}
      dangerouslySetInnerHTML={{ __html: svgContent ?? "" }}
    />
  );
}