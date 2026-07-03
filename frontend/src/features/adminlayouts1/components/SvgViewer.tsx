
"use client";

export default function SvgViewer({ url }: { url: string }) {
  return (
    <img
      src={url}
      alt="Floor layout preview"
      className="max-w-full max-h-full object-contain rounded"
    />
  );
}
