"use client";

import { useEffect, useState } from "react";
import { axiosInstance } from "@/lib/http/axios";

type Props = {
  url?: string;
};

export default function LayoutPreview({ url }: Props) {
  const [svgContent, setSvgContent] = useState("");

  useEffect(() => {
    if (!url) return;

    loadSvg();
  }, [url]);

  const loadSvg = async () => {
    try {
    const res = await axiosInstance.get(url as string, {
        responseType: "text", // ✅ IMPORTANT
      });

      setSvgContent(res.data);
    } catch (err) {
      console.error("SVG load error:", err);
    }
  };

  if (!url) {
    return (
      <div className="h-[500px] flex items-center justify-center text-gray-400">
        No layout found
      </div>
    );
  }

  return (
    <div className="col-span-2 border rounded-md h-[500px] overflow-auto p-2">
      <div
        dangerouslySetInnerHTML={{ __html: svgContent }}
        className="w-full h-full"
      />
    </div>
  );
}