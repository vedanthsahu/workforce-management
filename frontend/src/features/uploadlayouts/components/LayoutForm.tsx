"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { UploadCloud, FileCheck2, X } from "lucide-react";
import { layoutService } from "@/features/uploadlayouts/services/layout.service";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import SVGPreviewModal from "@/features/uploadlayouts/components/Svgpreviewmodal";

type Props = {
  formData: any;
  setFormData: (data: any) => void;
  onFloorLayoutInfo?: (info: any) => void;
};

// ─── SVG seat counter ─────────────────────────────────────────────────────────

function extractSeatIds(svgText: string): string[] {
  const ids: string[] = [];
  const regex = /<g\s+id="([^"]+)"/g;
  let match;
  while ((match = regex.exec(svgText)) !== null) {
    if (/^\d+$/.test(match[1])) ids.push(match[1]);
  }
  return ids;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LayoutForm({ formData, setFormData, onFloorLayoutInfo }: Props) {
  const fileInputRef    = useRef<HTMLInputElement | null>(null);
  const [isSubmitting,  setIsSubmitting]  = useState(false);

  const [sites,     setSites]     = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [floors,    setFloors]    = useState<any[]>([]);

  const [seatIds,       setSeatIds]       = useState<string[]>([]);
  const [countingSeats, setCountingSeats] = useState(false);
  const [svgPreview,    setSvgPreview]    = useState<string | null>(null);
  const [showPreview,   setShowPreview]   = useState(false); // ← now controls modal

  const resetForm = () => {
    setFormData({
      site: null, building: null, floor: null,
      layoutName: "", file: null, isSubmitting: false,
    });
    setSeatIds([]);
    setSvgPreview(null);
    setShowPreview(false);
  };

  // ── 1. Load sites on mount ─────────────────────────────────────────────
  useEffect(() => {
    layoutService.getSites().then(setSites);
  }, []);

  // ── 2. Resolve site name once sites list arrives (pre-seed case) ───────
  useEffect(() => {
    if (!sites.length || !formData.site?.id || formData.site.name) return;
    const match = sites.find((s: any) => String(s.site_id ?? s.id) === String(formData.site.id));
    if (match) {
      setFormData((prev: any) => ({
        ...prev,
        site: {
          id:   prev.site.id,
          name: match.site_name ?? match.name ?? "",
          code: match.site_code ?? "",
        },
      }));
    }
  }, [sites]);

  // ── 3. Load buildings whenever selected site changes ──────────────────
  useEffect(() => {
    if (!formData.site?.id) { setBuildings([]); setFloors([]); return; }
    layoutService.getBuildings(formData.site.id).then(setBuildings);
  }, [formData.site?.id]);

  // ── 4. Resolve building name + auto-select once buildings list arrives ─
  useEffect(() => {
    if (!buildings.length || !formData.building?.id) return;
    if (!formData.building.name) {
      const match = buildings.find(
        (b: any) => String(b.building_id ?? b.id) === String(formData.building.id)
      );
      if (match) {
        setFormData((prev: any) => ({
          ...prev,
          building: {
            id:   prev.building.id,
            name: match.building_name ?? match.name ?? "",
            code: match.building_code ?? "",
          },
        }));
      }
    }
  }, [buildings]);

  // ── 5. Load floors whenever selected building changes ────────────────
  useEffect(() => {
    if (!formData.building?.id) { setFloors([]); return; }
    layoutService.getFloors(formData.building.id).then(setFloors);
  }, [formData.building?.id]);

  // ── 6. Resolve floor name once floors list arrives (pre-seed case) ────
  useEffect(() => {
    if (!floors.length || !formData.floor?.id || formData.floor.name) return;
    const match = floors.find(
      (f: any) => String(f.floor_id ?? f.id) === String(formData.floor.id)
    );
    if (match) {
      setFormData((prev: any) => ({
        ...prev,
        floor: {
          id:   prev.floor.id,
          name: match.floor_name ?? match.floor_code ?? match.name ?? "",
          code: match.floor_code ?? "",
        },
      }));
    }
  }, [floors]);

  // ── 7. Auto-generate layout name when site + building + floor are set ──
  useEffect(() => {
    const generate = async () => {
      if (
        !formData.site?.id    ||
        !formData.building?.id ||
        !formData.floor?.id   ||
        !formData.site?.code  ||
        !formData.building?.code ||
        !formData.floor?.code
      ) return;

      try {
        const layouts = await layoutService.getLayoutsByFloor(formData.floor.id);

        let nextVersion = 1;
        if (Array.isArray(layouts) && layouts.length > 0) {
          const versions = layouts.map((l: any) =>
            Number(l.version_no ?? l.layout_version_no ?? 0)
          );
          nextVersion = Math.max(...versions) + 1;
        }

        const sitePart     = formData.site.code.split("-")[0];
        const buildingPart = formData.building.code.split("-").pop();
        const floorPart    = formData.floor.code.split("-").pop();
        const layoutName   = `${sitePart}-${buildingPart}-${floorPart}-v${nextVersion}`;

        setFormData((prev: any) => ({ ...prev, layoutName }));
      } catch (err) {
        console.error("Failed to generate layout name", err);
      }
    };

    generate();
  }, [formData.site?.id, formData.building?.id, formData.floor?.id]);

  // ── Form validation ────────────────────────────────────────────────────
  const isFormValid =
    !!formData.site     &&
    !!formData.building &&
    !!formData.floor    &&
    !!formData.file     &&
    !!formData.layoutName?.trim();

  // ── File handling ──────────────────────────────────────────────────────
  const handleFileChange = async (file: File) => {
    if (file.type !== "image/svg+xml") {
      toast.error("Only SVG files are allowed");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Maximum file size is 10 MB");
      return;
    }
    setFormData((prev: any) => ({ ...prev, file }));
    setSeatIds([]);
    setSvgPreview(null);
    setCountingSeats(true);
    try {
      const text = await file.text();
      const ids  = extractSeatIds(text);
      setSeatIds(ids);

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

  const handleDrop     = (e: React.DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileChange(f); };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  // ── Submit ─────────────────────────────────────────────────────────────
  const router = useRouter();

  const handleSubmit = async () => {
    if (!formData.site || !formData.building || !formData.floor || !formData.file || !formData.layoutName?.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await layoutService.createLayout({
        file:        formData.file,
        site_id:     formData.site.id,
        building_id: formData.building.id,
        floor_id:    formData.floor.id,
        layout_name: formData.layoutName,
        status:      "DRAFT",
        seat_ids:    seatIds,
      });

      toast.success("Layout saved successfully");

      const layoutId = res?.layout_id || res?.id || res?.data?.layout_id;
      if (!layoutId) {
        console.error("layout_id not returned from createLayout response", res);
        resetForm();
        return;
      }

      const params = new URLSearchParams({
        layoutId:   String(layoutId),
        floorId:    String(formData.floor.id),
        buildingId: String(formData.building.id),
        siteId:     String(formData.site.id),
      });
      router.push(`/admin/layouts/manage-layout?${params.toString()}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save layout");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Layout Information</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">

          {/* ROW 1 — Site / Building */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">
                Site <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.site?.id || ""}
                onChange={(e) => {
                  const selectedSite = sites.find(
                    (s) => String(s.site_id) === e.target.value
                  );
                  if (!selectedSite) return;
                  setFormData({
                    ...formData,
                    site: {
                      id:   Number(selectedSite.site_id),
                      name: selectedSite.site_name,
                      code: selectedSite.site_code,
                    },
                    building: null,
                    floor:    null,
                    layoutName: "",
                  });
                  onFloorLayoutInfo?.(null);
                }}
                className="w-full mt-1 h-10 border rounded-md px-3 bg-white"
              >
                <option value="">Select Site</option>
                {sites.map((s) => (
                  <option key={s.site_id} value={s.site_id}>{s.site_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">
                Building <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.building?.id || ""}
                onChange={(e) => {
                  const selectedBuilding = buildings.find(
                    (b) => String(b.building_id) === e.target.value
                  );
                  if (!selectedBuilding) return;
                  setFormData((prev: any) => ({
                    ...prev,
                    building: {
                      id:   Number(selectedBuilding.building_id),
                      name: selectedBuilding.building_name,
                      code: selectedBuilding.building_code,
                    },
                    floor:      null,
                    layoutName: "",
                  }));
                  onFloorLayoutInfo?.(null);
                }}
                className="w-full mt-1 h-10 border rounded-md px-3 bg-white"
              >
                <option value="">Select Building</option>
                {buildings.map((b) => (
                  <option key={b.building_id} value={b.building_id}>{b.building_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ROW 2 — Floor / Layout Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">
                Floor <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.floor?.id || ""}
                onChange={(e) => {
                  const selectedFloor = floors.find(
                    (f) => String(f.floor_id) === e.target.value
                  );
                  if (!selectedFloor) return;
                  setFormData((prev: any) => ({
                    ...prev,
                    floor: {
                      id:   Number(selectedFloor.floor_id),
                      name: selectedFloor.floor_name,
                      code: selectedFloor.floor_code,
                    },
                  }));
                  onFloorLayoutInfo?.({
                    layoutId:          selectedFloor.layout_id,
                    layoutName:        selectedFloor.layout_name,
                    layoutStatus:      selectedFloor.layout_status,
                    layoutIsPublished: selectedFloor.layout_is_published,
                    layoutVersionNo:   selectedFloor.layout_version_no,
                    layoutFileUrl:     selectedFloor.layout_file_url,
                    layoutCount:       selectedFloor.layout_count,
                  });
                }}
                className="w-full mt-1 h-10 border rounded-md px-3 bg-white"
              >
                <option value="">Select Floor</option>
                {floors.map((f) => (
                  <option key={f.floor_id} value={f.floor_id}>
                    {f.floor_name || f.floor_code}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">
                Layout Name <span className="text-red-500">*</span>
              </label>
              <input
                value={formData.layoutName || ""}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, layoutName: e.target.value }))}
                className="w-full mt-1 h-10 border rounded-md px-3 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Auto-generated after floor selection"
              />
            </div>
          </div>

          {/* FILE UPLOAD */}
          <div>
            <label className="text-sm font-medium">
              Upload SVG File <span className="text-red-500">*</span>
            </label>

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => !formData.file && fileInputRef.current?.click()}
              className={`mt-2 border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-colors ${
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
                        setFormData((prev: any) => ({ ...prev, file: null }));
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
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    {/* <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                      className="px-3 py-1.5 text-xs border rounded-md bg-white hover:bg-gray-50 text-gray-600"
                    >
                      Replace file
                    </button> */}

                    {/* ── Preview button → opens modal ── */}
                    {svgPreview && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setShowPreview(true); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-colors"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        Preview Layout
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-8 h-8 text-indigo-500 mb-2" />
                  <p className="text-sm">Drag and drop your SVG file here</p>
                  <p className="text-xs text-muted-foreground my-1">or</p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="px-4 py-2 border rounded-md text-sm bg-white hover:bg-gray-50"
                  >
                    Browse File
                  </button>
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
              onChange={(e) => { if (e.target.files?.[0]) handleFileChange(e.target.files[0]); }}
            />
          </div>

          {/* DESCRIPTION */}
          <div>
            <label className="text-sm font-medium">
              Description{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              className="w-full mt-1 border rounded-md p-3 resize-none"
              rows={4}
              maxLength={500}
              placeholder="Enter description or notes about this layout (optional)"
              value={formData.description || ""}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
            />
            <div className="text-right text-xs text-muted-foreground mt-1">
              {(formData.description || "").length} / 500
            </div>
          </div>

          {/* BUTTONS */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !isFormValid}
              className={`px-4 py-2 rounded-md text-sm transition-colors text-white ${
                isFormValid
                  ? "bg-indigo-600 hover:bg-indigo-700"
                  : "bg-gray-300 cursor-not-allowed opacity-60"
              }`}
            >
              {isSubmitting ? "Saving…" : "Save as Draft"}
            </button>
          </div>

        </CardContent>
      </Card>

      {/* ── SVG Preview Modal (uploaded file) ── */}
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