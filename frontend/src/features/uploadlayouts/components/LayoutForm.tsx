"use client";
 
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, FileCheck2, X } from "lucide-react";
import { layoutService } from "../services/layout.service";
import SVGPreviewModal from "./Svgpreviewmodal";
import { Building, Floor, FloorLayoutInfo, LayoutFormState, Site } from "../types/layout.types";
 
interface LayoutFormProps {
  formData: LayoutFormState;
  setFormData: (data: LayoutFormState | ((prev: LayoutFormState) => LayoutFormState)) => void;
  onFloorLayoutInfo?: (info: FloorLayoutInfo | null) => void;
}
 
function extractSeatIds(svgText: string): string[] {
  const ids: string[] = [];
  const seatIdPattern = /^\d+$|^[A-Z]+-.*-\d+$/;
  const regex = /<g\s+id="([^"]+)"/g;
  let match;
  while ((match = regex.exec(svgText)) !== null) {
    if (seatIdPattern.test(match[1])) ids.push(match[1]);
  }
  return ids;
}
 
export default function LayoutForm({ formData, setFormData, onFloorLayoutInfo }: LayoutFormProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
 
  const [seatIds, setSeatIds] = useState<string[]>([]);
  const [countingSeats, setCountingSeats] = useState(false);
  const [svgPreview, setSvgPreview] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({ site: null, building: null, floor: null, layoutName: "", file: null });
    setSeatIds([]);
    setSvgPreview(null);
    setShowPreview(false);
  };
 
  // Load sites on mount
  useEffect(() => {
    layoutService.getSites().then(setSites);
  }, []);
 
  // Resolve site name once sites list arrives (pre-seed case)
  useEffect(() => {
    if (!sites.length || !formData.site || formData.site.name) return;
    const siteId = formData.site.id;
    const match = sites.find((s) => String(s.site_id) === String(siteId));
    if (match) {
      setFormData((prev) => ({
        ...prev,
        site: { id: siteId, name: match.site_name, code: match.site_code ?? "" },
      }));
    }
  }, [sites]);
 
  // Load buildings whenever selected site changes
  useEffect(() => {
    if (!formData.site) {
      setBuildings([]);
      setFloors([]);
      return;
    }
    layoutService.getBuildings(formData.site.id).then(setBuildings);
  }, [formData.site?.id]);
 
  // Resolve building name once buildings list arrives (pre-seed case)
  useEffect(() => {
    if (!buildings.length || !formData.building || formData.building.name) return;
    const buildingId = formData.building.id;
    const match = buildings.find((b) => String(b.building_id) === String(buildingId));
    if (match) {
      setFormData((prev) => ({
        ...prev,
        building: { id: buildingId, name: match.building_name, code: match.building_code ?? "" },
      }));
    }
  }, [buildings]);
 
  // Load floors whenever selected building changes
  useEffect(() => {
    if (!formData.building) {
      setFloors([]);
      return;
    }
    layoutService.getFloors(formData.building.id).then(setFloors);
  }, [formData.building?.id]);
 
  // Resolve floor name once floors list arrives (pre-seed case)
  useEffect(() => {
    if (!floors.length || !formData.floor || formData.floor.name) return;
    const floorId = formData.floor.id;
    const match = floors.find((f) => String(f.floor_id) === String(floorId));
    if (match) {
      setFormData((prev) => ({
        ...prev,
        floor: {
          id: floorId,
          name: match.floor_name ?? match.floor_code ?? "",
          code: match.floor_code ?? "",
        },
      }));
      onFloorLayoutInfo?.({
        layoutId: match.layout_id,
        layoutName: match.layout_name,
        layoutStatus: match.layout_status,
        layoutIsPublished: match.layout_is_published,
        layoutVersionNo: match.layout_version_no,
        layoutFileUrl: match.layout_file_url,
        layoutCount: match.layout_count,
        publishedByName: match.published_by_name,
        layoutLastUpdated: match.layout_last_updated,
      });
    }
  }, [floors]);
 
  // Auto-generate layout name once site, building and floor codes are known
  useEffect(() => {
    const generate = async () => {
      if (
        !formData.site?.id ||
        !formData.building?.id ||
        !formData.floor?.id ||
        !formData.site?.code ||
        !formData.building?.code ||
        !formData.floor?.code
      ) {
        return;
      }
 
      try {
        const layouts = await layoutService.getLayoutsByFloor(formData.floor.id);
 
        let nextVersion = 1;
        if (Array.isArray(layouts) && layouts.length > 0) {
          const versions = layouts.map((l: { version_no?: number; layout_version_no?: number }) =>
            Number(l.version_no ?? l.layout_version_no ?? 0)
          );
          nextVersion = Math.max(...versions) + 1;
        }
 
        const sitePart = formData.site.code.split("-")[0];
        const buildingPart = formData.building.code.split("-").pop();
        const floorPart = formData.floor.code.split("-").pop();
        const layoutName = `${sitePart}-${buildingPart}-${floorPart}-v${nextVersion}`;
 
        setFormData((prev) => ({ ...prev, layoutName }));
      } catch (err) {
        console.error("Failed to generate layout name", err);
      }
    };
 
    generate();
  }, [
    formData.site?.id,
    formData.building?.id,
    formData.floor?.id,
    formData.site?.code,
    formData.building?.code,
    formData.floor?.code,
  ]);

  const noSeatsDetected = !!formData.file && !countingSeats && seatIds.length === 0;

  const isFormValid =
    !!formData.site &&
    !!formData.building &&
    !!formData.floor &&
    !!formData.file &&
    !!formData.layoutName.trim() &&
    !noSeatsDetected;

  const handleFileChange = async (file: File) => {
    setFileError(null);
    setFileError(null);
    if (file.type !== "image/svg+xml") {
      setFileError("Only SVG files are allowed.");
      setFileError("Only SVG files are allowed.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileError("Maximum file size is 10 MB.");
      setFileError("Maximum file size is 10 MB.");
      return;
    }
    setFormData((prev) => ({ ...prev, file }));
    setSeatIds([]);
    setSvgPreview(null);
    setCountingSeats(true);
    try {
      const text = await file.text();
      setSeatIds(extractSeatIds(text));
 
      // Make SVG fluid and store for preview
      const fluid = text
        .replace(/\bwidth="[^"]*"/, 'width="100%"')
        .replace(/\bheight="[^"]*"/, 'height="100%"');
      setSvgPreview(fluid);
    } catch (err) {
      console.warn("[LayoutForm] Could not extract seat IDs:", err);
    } finally {
      setCountingSeats(false);
    }
  };
 
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileChange(file);
  };
 
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
 
  const handleSubmit = async () => {
    if (!formData.site || !formData.building || !formData.floor || !formData.file || !formData.layoutName.trim()) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const res = await layoutService.createLayout({
        file: formData.file,
        site_id: formData.site.id,
        building_id: formData.building.id,
        floor_id: formData.floor.id,
        layout_name: formData.layoutName,
        status: "DRAFT",
        seat_ids: seatIds,
      });

      const layoutId = res?.layout_id || res?.id || res?.data?.layout_id;
      if (!layoutId) {
        console.error("layout_id not returned from createLayout response", res);
        resetForm();
        return;
      }
 
      const params = new URLSearchParams({
        layoutId: String(layoutId),
        floorId: String(formData.floor.id),
        buildingId: String(formData.building.id),
        siteId: String(formData.site.id),
      });
      router.push(`/admin/layouts/manage-layout?${params.toString()}`);
    } catch (err: any) {
      console.error("[LayoutForm] Upload error:", err?.response?.data || err.message);
      setSubmitError(err?.response?.data?.message || "Failed to save layout. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
 
  return (
    <>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Layout Information</CardTitle>
        </CardHeader>
 
        <CardContent className="space-y-6">
          {/* ROW 1 — Site / Building */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>
                Site <span className="text-red-500">*</span>
              </Label>
              <select
                value={formData.site ? String(formData.site.id) : ""}
                onChange={(e) => {
                  const value = e.target.value;
                  if (!value) return;
                  const site = sites.find((s) => String(s.site_id) === value);
                  if (!site) return;
                  setFormData((prev) => ({
                    ...prev,
                    site: { id: site.site_id, name: site.site_name, code: site.site_code ?? "" },
                    building: null,
                    floor: null,
                    layoutName: "",
                  }));
                  onFloorLayoutInfo?.(null);
                }}
                className="w-full h-10 px-4 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled hidden>Select a site</option>
                {sites.map((s) => (
                  <option key={s.site_id} value={String(s.site_id)}>
                    {s.site_name}
                  </option>
                ))}
              </select>
            </div>
 
            <div className="space-y-1.5">
              <Label>
                Building <span className="text-red-500">*</span>
              </Label>
              <select
                value={formData.building ? String(formData.building.id) : ""}
                onChange={(e) => {
                  const value = e.target.value;
                  if (!value) return;
                  const building = buildings.find((b) => String(b.building_id) === value);
                  if (!building) return;
                  setFormData((prev) => ({
                    ...prev,
                    building: {
                      id: building.building_id,
                      name: building.building_name,
                      code: building.building_code ?? "",
                    },
                    floor: null,
                    layoutName: "",
                  }));
                  onFloorLayoutInfo?.(null);
                }}
                className="w-full h-10 px-4 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled hidden>Select a building</option>
                {buildings.map((b) => (
                  <option key={b.building_id} value={String(b.building_id)}>
                    {b.building_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
 
          {/* ROW 2 — Floor / Layout Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>
                Floor <span className="text-red-500">*</span>
              </Label>
              <select
                value={formData.floor ? String(formData.floor.id) : ""}
                onChange={(e) => {
                  const value = e.target.value;
                  if (!value) return;
                  const floor = floors.find((f) => String(f.floor_id) === value);
                  if (!floor) return;
                  setFormData((prev) => ({
                    ...prev,
                    floor: {
                      id: floor.floor_id,
                      name: floor.floor_name ?? floor.floor_code ?? "",
                      code: floor.floor_code ?? "",
                    },
                  }));
                  // onFloorLayoutInfo?.({
                  //   layoutId: floor.layout_id,
                  //   layoutName: floor.layout_name,
                  //   layoutStatus: floor.layout_status,
                  //   layoutIsPublished: floor.layout_is_published,
                  //   layoutVersionNo: floor.layout_version_no,
                  //   layoutFileUrl: floor.layout_file_url,
                  //   layoutCount: floor.layout_count,
                  // });
                  onFloorLayoutInfo?.({
                    layoutId: floor.layout_id,
                    layoutName: floor.layout_name,
                    layoutStatus: floor.layout_status,
                    layoutIsPublished: floor.layout_is_published,
                    layoutVersionNo: floor.layout_version_no,
                    layoutFileUrl: floor.layout_file_url,
                    layoutCount: floor.layout_count,
                    publishedByName: floor.published_by_name,
                    layoutLastUpdated: floor.layout_last_updated,
                  });
                }}
                className="w-full h-10 px-4 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled hidden>Select a floor</option>
                {floors.map((f) => (
                  <option key={f.floor_id} value={String(f.floor_id)}>
                    {f.floor_name || f.floor_code}
                  </option>
                ))}
              </select>
            </div>
 
            <div className="space-y-1.5">
              <Label>
                Layout Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.layoutName}
                onChange={(e) => setFormData((prev) => ({ ...prev, layoutName: e.target.value }))}
                placeholder="Auto-generated after floor selection"
              />
            </div>
          </div>
 
          {/* FILE UPLOAD */}
          <div className="space-y-1.5">
            <Label>
              Upload SVG File <span className="text-red-500">*</span>
            </Label>
 
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => !formData.file && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-colors ${
                formData.file
                  ? "border-emerald-300 bg-emerald-50/40 cursor-default"
                  : "border-indigo-300 hover:border-indigo-400 cursor-pointer"
              }`}
            >
              {formData.file ? (
                <div className="flex flex-col items-center gap-2 w-full">
                  <FileCheck2 className="w-8 h-8 text-emerald-500" />
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-emerald-700 truncate max-w-[240px]">
                      {formData.file.name}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormData((prev) => ({ ...prev, file: null }));
                        setSeatIds([]);
                        setSvgPreview(null);
                        setShowPreview(false);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                      title="Remove file"
                    >
                      <X size={15} />
                    </button>
                  </div>
 
                  <div className="flex items-center gap-1.5 text-xs">
                    {countingSeats ? (
                      <span className="flex items-center gap-1.5 text-gray-400">
                        <span className="w-3 h-3 border border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
                        Counting seats…
                      </span>
                    ) : seatIds.length > 0 ? (
                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full font-medium">
                        {seatIds.length} seat{seatIds.length !== 1 ? "s" : ""} detected
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-600 border border-red-200 rounded-full text-xs font-medium">
                        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        No seats detected
                      </span>
                    )}
                  </div>
 
                  <div className="flex items-center gap-2 mt-1">
 
                    {svgPreview && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPreview(true);
                        }}
                        className="border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 hover:text-indigo-700"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        Preview Layout
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-8 h-8 text-indigo-500 mb-2" />
                  <p className="text-sm">Drag and drop your SVG file here</p>
                  <p className="text-xs text-muted-foreground my-1">or</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    Browse File
                  </Button>
                  <p className="text-xs text-muted-foreground mt-3">
                    Maximum file size: 10 MB · Allowed format: .svg
                  </p>
                </>
              )}
            </div>
 
            <input
              type="file"
              accept=".svg"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileChange(e.target.files[0]);
              }}
            />

            {fileError && (
              <p className="flex items-center gap-1.5 text-xs text-red-600 mt-1">
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {fileError}
              </p>
            )}
          </div>
 
          {/* DESCRIPTION */}
          <div className="space-y-1.5">
            <Label>
              Description{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <textarea
              className="w-full border rounded-md p-3 resize-none text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              rows={4}
              maxLength={500}
              placeholder="Enter description or notes about this layout (optional)"
              value={formData.description || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            />
            <div className="text-right text-xs text-muted-foreground">
              {(formData.description || "").length} / 500
            </div>
          </div>
 
          {/* BUTTONS */}
          {submitError && (
            <p className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {submitError}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" onClick={handleSubmit} disabled={isSubmitting || !isFormValid}>
              {isSubmitting ? "Saving…" : "Save as Draft"}
            </Button>
          </div>
        </CardContent>
      </Card>
 
      {/* SVG PREVIEW MODAL (uploaded file) */}
      {showPreview && svgPreview && (
        <SVGPreviewModal
          title={formData.file?.name ?? "Layout Preview"}
          svgContent={svgPreview}
          badge={
            seatIds.length > 0 ? (
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-medium">
                {seatIds.length} seat{seatIds.length !== 1 ? "s" : ""}
              </span>
            ) : undefined
          }
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
}