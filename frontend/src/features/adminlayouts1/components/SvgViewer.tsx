
"use client";

export default function SvgViewer({ url }: { url: string }) {
  return (
    <div className="w-full h-full border rounded-md overflow-hidden">

      <object
        data={url}
        type="image/svg+xml"
        className="w-full h-full"
      >
        <p> SVG Loading....</p>
      </object>

    </div>
  );
}