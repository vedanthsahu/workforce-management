"use client";

import { useEffect, useRef, useState } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

type Props = {
  title:      string;
  svgContent?: string | null;   // already-loaded SVG markup
  svgUrl?:     string | null;   // URL to fetch SVG from
  badge?:      React.ReactNode;
  legend?:     React.ReactNode; // optional legend strip in footer
  onClose:    () => void;
};

export default function SVGPreviewModal({ title, svgContent, svgUrl, badge, legend, onClose }: Props) {
  const overlayRef           = useRef<HTMLDivElement>(null);
  const [svg,    setSvg]     = useState<string | null>(svgContent ?? null);
  const [error,  setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(!svgContent && !!svgUrl);
  const [scale,  setScale]   = useState(1);

  // Fetch SVG from URL if not already supplied
  useEffect(() => {
    if (svgContent) { setSvg(svgContent); return; }
    if (!svgUrl)    return;

    setLoading(true);
    fetch(svgUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        // make fluid
        const fluid = text
          .replace(/\bwidth="[^"]*"/, 'width="100%"')
          .replace(/\bheight="[^"]*"/, 'height="100%"');
        setSvg(fluid);
      })
      .catch(() => setError("Failed to load the layout file. Please try again."))
      .finally(() => setLoading(false));
  }, [svgUrl, svgContent]);

  // Close on backdrop click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const zoomIn    = () => setScale((s) => Math.min(s + 0.25, 3));
  const zoomOut   = () => setScale((s) => Math.max(s - 0.25, 0.25));
  const zoomReset = () => setScale(1);

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <div className="relative bg-white rounded-xl shadow-2xl flex flex-col w-full max-w-4xl max-h-[90vh] overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
            {badge}
          </div>

          <div className="flex items-center gap-1">
            {/* Zoom controls — only show when SVG is ready */}
            {svg && (
              <>
                <button
                  onClick={zoomOut}
                  disabled={scale <= 0.25}
                  title="Zoom out"
                  className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-40 text-gray-500 transition-colors"
                >
                  <ZoomOut size={15} />
                </button>
                <span className="text-xs text-gray-500 w-10 text-center tabular-nums select-none">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={zoomIn}
                  disabled={scale >= 3}
                  title="Zoom in"
                  className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-40 text-gray-500 transition-colors"
                >
                  <ZoomIn size={15} />
                </button>
                <button
                  onClick={zoomReset}
                  title="Reset zoom"
                  className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors mr-1"
                >
                  <RotateCcw size={14} />
                </button>
              </>
            )}

            <button
              onClick={onClose}
              title="Close"
              className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-auto bg-gray-50 p-4">

          {loading && (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
              <div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
              <p className="text-sm">Loading layout…</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center h-64 gap-2 text-gray-400">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {svg && !loading && (
            <div className="overflow-auto w-full h-full flex items-start justify-center">
              <div
                style={{ transform: `scale(${scale})`, transformOrigin: "top center", transition: "transform 0.15s ease" }}
                className="w-full"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-3 border-t shrink-0 flex items-center justify-between gap-4">
          <div>{legend}</div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md border hover:bg-gray-50 text-gray-600 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}