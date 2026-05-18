"use client";

import { useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { UploadCloud } from "lucide-react";

export default function LayoutForm() {

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);

  // 🔹 Handle file
  const handleFileChange = (selectedFile: File) => {
    if (selectedFile.type !== "image/svg+xml") {
      alert("Only SVG files are allowed");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      alert("File size should be less than 10MB");
      return;
    }

    setFile(selectedFile);
  };

  // 🔹 Drag drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileChange(droppedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <Card className="col-span-2">

      <CardHeader>
        <CardTitle className="text-sm font-semibold">
          Layout Information
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ROW 1 */}
        <div className="grid grid-cols-2 gap-4">

          <div>
            <label className="text-sm font-medium">
              Site <span className="text-red-500">*</span>
            </label>
            <select className="w-full mt-1 h-10 border rounded-md px-3 bg-white">
              <option>BENGALURU (HQ)</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">
              Building <span className="text-red-500">*</span>
            </label>
            <select className="w-full mt-1 h-10 border rounded-md px-3 bg-white">
              <option>Tower 1</option>
            </select>
          </div>

        </div>

        {/* ROW 2 */}
        <div className="grid grid-cols-2 gap-4">

          <div>
            <label className="text-sm font-medium">
              Floor <span className="text-red-500">*</span>
            </label>
            <select className="w-full mt-1 h-10 border rounded-md px-3 bg-white">
              <option>8th Floor</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">
              Layout Name <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full mt-1 h-10 border rounded-md px-3"
              defaultValue="8th Floor Layout"
            />
          </div>

        </div>

        {/* ROW 3 */}
        <div className="grid grid-cols-2 gap-4">

          <div>
            <label className="text-sm font-medium flex items-center gap-1">
              Version Number
              <span className="text-xs text-muted-foreground">ⓘ</span>
            </label>

            <input
              className="w-full mt-1 h-10 border rounded-md px-3 bg-gray-100 cursor-not-allowed"
              value="1.0"
              readOnly
            />

            <p className="text-xs text-muted-foreground mt-1">
              Next version number will be auto-generated
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">
              Layout Type
            </label>

            <select className="w-full mt-1 h-10 border rounded-md px-3 bg-white">
              <option>SVG</option>
            </select>

            <p className="text-xs text-muted-foreground mt-1">
              Only SVG format is supported
            </p>
          </div>

        </div>

        {/* ✅ FILE UPLOAD (FIXED) */}
        <div>
          <label className="text-sm font-medium">
            Upload SVG File <span className="text-red-500">*</span>
          </label>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="mt-2 border-2 border-dashed border-indigo-300 rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer"
          >

            <UploadCloud className="w-8 h-8 text-indigo-500 mb-2" />

            <p className="text-sm">
              Drag and drop your SVG file here
            </p>

            <p className="text-xs text-muted-foreground my-1">
              or
            </p>

            {/* Hidden Input */}
            <input
              type="file"
              accept=".svg"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
            />

            {/* Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 border rounded-md text-sm bg-white hover:bg-gray-50"
            >
              Browse File
            </button>

            {/* File Name */}
            {file && (
              <p className="text-xs text-green-600 mt-2">
                {file.name}
              </p>
            )}

            <p className="text-xs text-muted-foreground mt-2">
              Maximum file size: 10MB | Allowed format: .svg
            </p>

          </div>
        </div>

        {/* DESCRIPTION */}
        <div>
          <label className="text-sm font-medium">
            Description / Notes
          </label>

          <textarea
            className="w-full mt-1 border rounded-md p-3"
            rows={4}
            placeholder="Enter description or notes about this layout (optional)"
          />

          <div className="text-right text-xs text-muted-foreground mt-1">
            0 / 500
          </div>
        </div>

        {/* BUTTONS */}
        <div className="flex justify-end gap-3 pt-4">

          <button className="px-4 py-2 border rounded-md">
            Cancel
          </button>

          <button className="px-4 py-2 bg-indigo-600 text-white rounded-md">
            Save as Draft
          </button>

        </div>

      </CardContent>
    </Card>
  );
}