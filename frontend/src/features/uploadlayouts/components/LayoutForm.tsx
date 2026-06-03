// // // // // // "use client";

// // // // // // import { useEffect, useRef, useState } from "react";
// // // // // // import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
// // // // // // import { UploadCloud, FileCheck2, X } from "lucide-react";
// // // // // // import { layoutService } from "@/features/uploadlayouts/services/layout.service";
// // // // // // import { toast } from "sonner";
// // // // // // import { useRouter } from "next/navigation";

// // // // // // type Props = {
// // // // // //   formData: any;
// // // // // //   setFormData: (data: any) => void;
// // // // // // };

// // // // // // // ─── SVG seat counter (mirrors LayoutPreview's extractSeatIds logic) ──────────
// // // // // // // Seats in the SVG are <g id="..."> elements — the same ids that LayoutPreview
// // // // // // // registers as clickable seats. We read the raw text and count all <g id="...">
// // // // // // // occurrences to get the total seat count before uploading.

// // // // // // function extractSeatIds(svgText: string): string[] {
// // // // // //   const ids: string[] = [];
// // // // // //   const regex = /<g\s+id="([^"]+)"/g;
// // // // // //   let match;
// // // // // //   while ((match = regex.exec(svgText)) !== null) {
// // // // // //     // Only count seats whose id is a plain integer e.g. <g id="1">
// // // // // //     if (/^\d+$/.test(match[1])) ids.push(match[1]);
// // // // // //   }
// // // // // //   return ids;
// // // // // // }

// // // // // // async function countSeatsInSvgFile(file: File): Promise<number> {
// // // // // //   const text = await file.text();
// // // // // //   const ids  = extractSeatIds(text);

// // // // // //   // Log every id found so you can inspect them in the console
// // // // // //   console.group(`[LayoutForm] SVG seat scan — "${file.name}"`);
// // // // // //   console.log(`Total <g id="..."> elements found: ${ids.length}`);
// // // // // //   console.log("IDs:", ids);
// // // // // //   console.groupEnd();

// // // // // //   return ids.length;
// // // // // // }

// // // // // // // ─── Component ────────────────────────────────────────────────────────────────

// // // // // // export default function LayoutForm({ formData, setFormData }: Props) {
// // // // // //   const fileInputRef   = useRef<HTMLInputElement | null>(null);
// // // // // //   const [isSubmitting, setIsSubmitting] = useState(false);

// // // // // //   const [sites,     setSites]     = useState<any[]>([]);
// // // // // //   const [buildings, setBuildings] = useState<any[]>([]);
// // // // // //   const [floors,    setFloors]    = useState<any[]>([]);

// // // // // //   // Seat count derived from the selected SVG file
// // // // // //   // const [seatCount,        setSeatCount]        = useState<number | null>(null);
// // // // // //   const [seatIds, setSeatIds] = useState<string[]>([]);
// // // // // //   const [countingSeats,    setCountingSeats]    = useState(false);

// // // // // //   // const resetForm = () => {
// // // // // //   //   setFormData({
// // // // // //   //     site:         null,
// // // // // //   //     building:     null,
// // // // // //   //     floor:        null,
// // // // // //   //     layoutName:   "",
// // // // // //   //     file:         null,
// // // // // //   //     isSubmitting: false,
// // // // // //   //   });
// // // // // //   //   setSeatCount(null);
// // // // // //   // };
// // // // // //   const resetForm = () => {
// // // // // //   setFormData({
// // // // // //     site: null, building: null, floor: null,
// // // // // //     layoutName: "", file: null, isSubmitting: false,
// // // // // //   });
// // // // // //   setSeatIds([]);   // was setSeatCount(null)
// // // // // // };

// // // // // //   // Load sites
// // // // // //   useEffect(() => {
// // // // // //     layoutService.getSites().then(setSites);
// // // // // //   }, []);

// // // // // //   // Load buildings
// // // // // //   useEffect(() => {
// // // // // //     if (formData.site?.id) {
// // // // // //       layoutService.getBuildings(formData.site.id).then(setBuildings);
// // // // // //     } else {
// // // // // //       setBuildings([]);
// // // // // //     }
// // // // // //   }, [formData.site]);

// // // // // //   // Load floors
// // // // // //   useEffect(() => {
// // // // // //     if (formData.building?.id) {
// // // // // //       layoutService.getFloors(formData.building.id).then(setFloors);
// // // // // //     } else {
// // // // // //       setFloors([]);
// // // // // //     }
// // // // // //   }, [formData.building]);

// // // // // //   // ── Form handling ────────────────────────────────────────────────────────
// // // // // // const isFormValid =
// // // // // //   !!formData.site &&
// // // // // //   !!formData.building &&
// // // // // //   !!formData.floor &&
// // // // // //   !!formData.file &&
// // // // // //   !!formData.layoutName?.trim();

// // // // // //   const handleFileChange = async (file: File) => {
// // // // // //   if (file.type !== "image/svg+xml") {
// // // // // //      toast.error("Only SVG files are allowed");
// // // // // //     return;
// // // // // //   }
// // // // // //   if (file.size > 10 * 1024 * 1024) {
// // // // // //      toast.error("Maximum file size is 10 MB");
// // // // // //     return;
// // // // // //   }

// // // // // //   setFormData({ ...formData, file });
// // // // // //   setSeatIds([]);

// // // // // //   setCountingSeats(true);
// // // // // //   try {
// // // // // //     const text = await file.text();
// // // // // //     const ids = extractSeatIds(text);      // reuse your existing function
// // // // // //     setSeatIds(ids);
// // // // // //     console.log(`[LayoutForm] ${ids.length} seat IDs:`, ids);
// // // // // //   } catch (err) {
// // // // // //     console.warn("[LayoutForm] Could not extract seat IDs:", err);
// // // // // //   } finally {
// // // // // //     setCountingSeats(false);
// // // // // //   }
// // // // // // };

// // // // // //   const handleDrop = (e: React.DragEvent) => {
// // // // // //     e.preventDefault();
// // // // // //     const dropped = e.dataTransfer.files[0];
// // // // // //     if (dropped) handleFileChange(dropped);
// // // // // //   };

// // // // // //   const handleDragOver = (e: React.DragEvent) => e.preventDefault();

// // // // // //   // ── Submit ───────────────────────────────────────────────────────────────

// // // // // //   // const handleSubmit = async () => {
// // // // // //   //   if (!formData.site || !formData.building || !formData.floor) {
// // // // // //   //     // toast.error("Please select Site, Building and Floor");
// // // // // //   //     return;
// // // // // //   //   }
// // // // // //   //   if (!formData.file) {
// // // // // //   //     // toast.error("Upload an SVG file");
// // // // // //   //     return;
// // // // // //   //   }
// // // // // //   //   if (!formData.layoutName.trim()) {
// // // // // //   //     // toast.error("Enter a layout name");
// // // // // //   //     return;
// // // // // //   //   }

// // // // // //   //   setIsSubmitting(true);
// // // // // //   //   try {
// // // // // //   //     // TODO: include seat_count in the payload once the API supports it.
// // // // // //   //     // For now it is logged to the console (see countSeatsInSvgFile above)
// // // // // //   //     // and kept as a comment below so it's ready to wire up:
// // // // // //   //     //
// // // // // //   //     // seat_count: seatCount ?? 0,

// // // // // //   //     const res = await layoutService.createLayout({
// // // // // //   //       file:        formData.file,
// // // // // //   //       site_id:     formData.site.id,
// // // // // //   //       building_id: formData.building.id,
// // // // // //   //       floor_id:    formData.floor.id,
// // // // // //   //       layout_name: formData.layoutName,
// // // // // //   //       status:      "DRAFT",
// // // // // //   //       seat_ids:    seatIds, 
// // // // // //   //       // seat_count: seatCount ?? 0,   ← uncomment when API is ready
// // // // // //   //     });

// // // // // //   //     console.log("[LayoutForm] Upload success:", res);

// // // // // //   //     toast.success("Layout saved successfully");
// // // // // //   //     resetForm();
// // // // // //   //   } catch (err: any) {
// // // // // //   //     console.error("[LayoutForm] Upload error:", err?.response?.data || err.message);
// // // // // //   //     toast.error(err?.response?.data?.message || "Failed to save layout");
// // // // // //   //   } finally {
// // // // // //   //     setIsSubmitting(false);
// // // // // //   //   }
// // // // // //   // };

// // // // // //   const router = useRouter();

// // // // // // const handleSubmit = async () => {
// // // // // //   if (!formData.site || !formData.building || !formData.floor) {
// // // // // //     return;
// // // // // //   }

// // // // // //   if (!formData.file) {
// // // // // //     return;
// // // // // //   }

// // // // // //   if (!formData.layoutName.trim()) {
// // // // // //     return;
// // // // // //   }

// // // // // //   setIsSubmitting(true);

// // // // // //   try {
// // // // // //     const res = await layoutService.createLayout({
// // // // // //       file: formData.file,
// // // // // //       site_id: formData.site.id,
// // // // // //       building_id: formData.building.id,
// // // // // //       floor_id: formData.floor.id,
// // // // // //       layout_name: formData.layoutName,
// // // // // //       status: "DRAFT",
// // // // // //       seat_ids: seatIds,
// // // // // //     });

// // // // // //     console.log("[LayoutForm] Upload success:", res);

// // // // // //     toast.success("Layout saved successfully");

// // // // // //     const layoutId =
// // // // // //       res?.layout_id ||
// // // // // //       res?.id ||
// // // // // //       res?.data?.layout_id;

// // // // // //     if (!layoutId) {
// // // // // //       console.error(
// // // // // //         "layout_id not returned from createLayout response",
// // // // // //         res
// // // // // //       );
// // // // // //       resetForm();
// // // // // //       return;
// // // // // //     }

// // // // // //     const params = new URLSearchParams({
// // // // // //       layoutId: String(layoutId),
// // // // // //       floorId: String(formData.floor.id),
// // // // // //       buildingId: String(formData.building.id),
// // // // // //       siteId: String(formData.site.id),
// // // // // //     });

// // // // // //     router.push(
// // // // // //       `/admin/layouts/manage-layout?${params.toString()}`
// // // // // //     );

// // // // // //   } catch (err: any) {
// // // // // //     console.error(
// // // // // //       "[LayoutForm] Upload error:",
// // // // // //       err?.response?.data || err.message
// // // // // //     );

// // // // // //     toast.error(
// // // // // //       err?.response?.data?.message ||
// // // // // //       "Failed to save layout"
// // // // // //     );
// // // // // //   } finally {
// // // // // //     setIsSubmitting(false);
// // // // // //   }
// // // // // // };

// // // // // //   // ── Render ───────────────────────────────────────────────────────────────

// // // // // //   return (
// // // // // //     <Card className="col-span-2">
// // // // // //       <CardHeader>
// // // // // //         <CardTitle className="text-sm font-semibold">Layout Information</CardTitle>
// // // // // //       </CardHeader>

// // // // // //       <CardContent className="space-y-6">

// // // // // //         {/* ROW 1 — Site / Building */}
// // // // // //         <div className="grid grid-cols-2 gap-4">
// // // // // //           <div>
// // // // // //             <label className="text-sm font-medium">
// // // // // //               Site <span className="text-red-500">*</span>
// // // // // //             </label>
// // // // // //             <select
// // // // // //               value={formData.site?.id || ""}
// // // // // //               onChange={(e) =>
// // // // // //                 setFormData({
// // // // // //                   ...formData,
// // // // // //                   site: {
// // // // // //                     id:   Number(e.target.value),
// // // // // //                     name: e.target.options[e.target.selectedIndex].text,
// // // // // //                   },
// // // // // //                   building: null,
// // // // // //                   floor:    null,
// // // // // //                 })
// // // // // //               }
// // // // // //               className="w-full mt-1 h-10 border rounded-md px-3 bg-white"
// // // // // //             >
// // // // // //               <option value="">Select Site</option>
// // // // // //               {sites.map((s) => (
// // // // // //                 <option key={s.site_id} value={s.site_id}>{s.site_name}</option>
// // // // // //               ))}
// // // // // //             </select>
// // // // // //           </div>

// // // // // //           <div>
// // // // // //             <label className="text-sm font-medium">
// // // // // //               Building <span className="text-red-500">*</span>
// // // // // //             </label>
// // // // // //             <select
// // // // // //               value={formData.building?.id || ""}
// // // // // //               onChange={(e) =>
// // // // // //                 setFormData({
// // // // // //                   ...formData,
// // // // // //                   building: {
// // // // // //                     id:   Number(e.target.value),
// // // // // //                     name: e.target.options[e.target.selectedIndex].text,
// // // // // //                   },
// // // // // //                   floor: null,
// // // // // //                 })
// // // // // //               }
// // // // // //               className="w-full mt-1 h-10 border rounded-md px-3 bg-white"
// // // // // //             >
// // // // // //               <option value="">Select Building</option>
// // // // // //               {buildings.map((b) => (
// // // // // //                 <option key={b.building_id} value={b.building_id}>{b.building_name}</option>
// // // // // //               ))}
// // // // // //             </select>
// // // // // //           </div>
// // // // // //         </div>

// // // // // //         {/* ROW 2 — Floor / Layout Name */}
// // // // // //         <div className="grid grid-cols-2 gap-4">
// // // // // //           <div>
// // // // // //             <label className="text-sm font-medium">
// // // // // //               Floor <span className="text-red-500">*</span>
// // // // // //             </label>
// // // // // //             <select
// // // // // //               value={formData.floor?.id || ""}
// // // // // //               onChange={(e) =>
// // // // // //                 setFormData({
// // // // // //                   ...formData,
// // // // // //                   floor: {
// // // // // //                     id:   Number(e.target.value),
// // // // // //                     name: e.target.options[e.target.selectedIndex].text,
// // // // // //                   },
// // // // // //                 })
// // // // // //               }
// // // // // //               className="w-full mt-1 h-10 border rounded-md px-3 bg-white"
// // // // // //             >
// // // // // //               <option value="">Select Floor</option>
// // // // // //               {floors.map((f) => (
// // // // // //                 <option key={f.floor_id} value={f.floor_id}>
// // // // // //                   {f.floor_name || f.floor_code}
// // // // // //                 </option>
// // // // // //               ))}
// // // // // //             </select>
// // // // // //           </div>

// // // // // //           <div>
// // // // // //             <label className="text-sm font-medium">
// // // // // //               Layout Name <span className="text-red-500">*</span>
// // // // // //             </label>
// // // // // //             <input
// // // // // //               value={formData.layoutName || ""}
// // // // // //               onChange={(e) => setFormData({ ...formData, layoutName: e.target.value })}
// // // // // //               className="w-full mt-1 h-10 border rounded-md px-3"
// // // // // //               placeholder="e.g. 8th Floor Layout"
// // // // // //             />
// // // // // //           </div>
// // // // // //         </div>

// // // // // //         {/* FILE UPLOAD */}
// // // // // //         <div>
// // // // // //           <label className="text-sm font-medium">
// // // // // //             Upload SVG File <span className="text-red-500">*</span>
// // // // // //           </label>

// // // // // //           {/* Drop zone */}
// // // // // //           <div
// // // // // //             onDrop={handleDrop}
// // // // // //             onDragOver={handleDragOver}
// // // // // //             onClick={() => !formData.file && fileInputRef.current?.click()}
// // // // // //             className={`mt-2 border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-colors ${
// // // // // //               formData.file
// // // // // //                 ? "border-emerald-300 bg-emerald-50/40 cursor-default"
// // // // // //                 : "border-indigo-300 hover:border-indigo-400 cursor-pointer"
// // // // // //             }`}
// // // // // //           >
// // // // // //             {formData.file ? (
// // // // // //               /* ── File selected state ── */
// // // // // //               <div className="flex flex-col items-center gap-2 w-full">
// // // // // //                 <FileCheck2 className="w-8 h-8 text-emerald-500" />

// // // // // //                 <div className="flex items-center gap-2">
// // // // // //                   <p className="text-sm font-medium text-emerald-700 truncate max-w-[240px]">
// // // // // //                     {formData.file.name}
// // // // // //                   </p>
// // // // // //                   <button
// // // // // //                     type="button"
// // // // // //                     onClick={(e) => {
// // // // // //                       e.stopPropagation();
// // // // // //                       setFormData({ ...formData, file: null });
// // // // // //                       // setSeatCount(null);
// // // // // //                       setSeatIds([])
// // // // // //                       if (fileInputRef.current) fileInputRef.current.value = "";
// // // // // //                     }}
// // // // // //                     className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
// // // // // //                     title="Remove file"
// // // // // //                   >
// // // // // //                     <X size={15} />
// // // // // //                   </button>
// // // // // //                 </div>

// // // // // //                 {/* Seat count badge */}
// // // // // //                 <div className="flex items-center gap-1.5 text-xs">
// // // // // //                   {/* {countingSeats ? (
// // // // // //                     <span className="flex items-center gap-1.5 text-gray-400">
// // // // // //                       <span className="w-3 h-3 border border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
// // // // // //                       Counting seats…
// // // // // //                     </span>
// // // // // //                   ) : seatCount !== null ? (
// // // // // //                     <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full font-medium">
// // // // // //                       {seatCount} seat{seatCount !== 1 ? "s" : ""} detected
// // // // // //                     </span>
// // // // // //                   ) : null} */}
// // // // // //                   {countingSeats ? (
// // // // // //                     <span className="flex items-center gap-1.5 text-gray-400">
// // // // // //                       <span className="w-3 h-3 border border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
// // // // // //                       Counting seats…
// // // // // //                     </span>
// // // // // //                   ) : seatIds.length > 0 ? (
// // // // // //                     <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full font-medium">
// // // // // //                       {seatIds.length} seat{seatIds.length !== 1 ? "s" : ""} detected
// // // // // //                     </span>
// // // // // //                   ) : null}
// // // // // //                 </div>

// // // // // //                 <button
// // // // // //                   type="button"
// // // // // //                   onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
// // // // // //                   className="mt-1 px-3 py-1.5 text-xs border rounded-md bg-white hover:bg-gray-50 text-gray-600"
// // // // // //                 >
// // // // // //                   Replace file
// // // // // //                 </button>
// // // // // //               </div>
// // // // // //             ) : (
// // // // // //               /* ── Empty state ── */
// // // // // //               <>
// // // // // //                 <UploadCloud className="w-8 h-8 text-indigo-500 mb-2" />
// // // // // //                 <p className="text-sm">Drag and drop your SVG file here</p>
// // // // // //                 <p className="text-xs text-muted-foreground my-1">or</p>
// // // // // //                 <button
// // // // // //                   type="button"
// // // // // //                   onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
// // // // // //                   className="px-4 py-2 border rounded-md text-sm bg-white hover:bg-gray-50"
// // // // // //                 >
// // // // // //                   Browse File
// // // // // //                 </button>
// // // // // //                 <p className="text-xs text-muted-foreground mt-3">
// // // // // //                   Maximum file size: 10 MB · Allowed format: .svg
// // // // // //                 </p>
// // // // // //               </>
// // // // // //             )}
// // // // // //           </div>

// // // // // //           <input
// // // // // //             type="file"
// // // // // //             accept=".svg"
// // // // // //             ref={fileInputRef}
// // // // // //             className="hidden"
// // // // // //             onChange={(e) => {
// // // // // //               if (e.target.files?.[0]) handleFileChange(e.target.files[0]);
// // // // // //             }}
// // // // // //           />
// // // // // //         </div>

// // // // // //         {/* DESCRIPTION */}
// // // // // //         <div>
// // // // // //           <label className="text-sm font-medium">
// // // // // //             Description{" "}
// // // // // //             <span className="text-muted-foreground font-normal">(optional)</span>
// // // // // //           </label>
// // // // // //           <textarea
// // // // // //             className="w-full mt-1 border rounded-md p-3 resize-none"
// // // // // //             rows={4}
// // // // // //             maxLength={500}
// // // // // //             placeholder="Enter description or notes about this layout (optional)"
// // // // // //             value={formData.description || ""}
// // // // // //             onChange={(e) => setFormData({ ...formData, description: e.target.value })}
// // // // // //           />
// // // // // //           <div className="text-right text-xs text-muted-foreground mt-1">
// // // // // //             {(formData.description || "").length} / 500
// // // // // //           </div>
// // // // // //         </div>

// // // // // //         {/* BUTTONS */}
// // // // // //         <div className="flex justify-end gap-3 pt-2">
// // // // // //           {/* <button
// // // // // //             type="button"
// // // // // //             onClick={resetForm}
// // // // // //             className="px-4 py-2 border rounded-md text-sm hover:bg-gray-50 transition-colors"
// // // // // //           >
// // // // // //             Cancel
// // // // // //           </button> */}
// // // // // //           {/* <button
// // // // // //             type="button"
// // // // // //             onClick={handleSubmit}
// // // // // //             disabled={isSubmitting}
// // // // // //             className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm disabled:opacity-60 hover:bg-indigo-700 transition-colors"
// // // // // //           >
// // // // // //             {isSubmitting ? "Saving…" : "Save as Draft"}
// // // // // //           </button> */}

// // // // // //           {/* <button
// // // // // //   type="button"
// // // // // //   onClick={handleSubmit}
// // // // // //   disabled={isSubmitting || !isFormValid}
// // // // // //   className={`px-4 py-2 rounded-md text-sm transition-colors text-white
// // // // // //     ${
// // // // // //       isFormValid
// // // // // //         ? "bg-indigo-600 hover:bg-indigo-700"
// // // // // //         : "bg-gray-300 cursor-not-allowed opacity-60"
// // // // // //     }`}
// // // // // // >
// // // // // //   {isSubmitting ? "Saving…" : "Save as Draft"}
// // // // // // </button>*/}
// // // // // //  <button 
// // // // // //   type="button"
// // // // // //   onClick={handleSubmit}
// // // // // //   disabled={isSubmitting || !isFormValid}
// // // // // //   className={`px-4 py-2 rounded-md text-sm transition-colors text-white
// // // // // //     ${
// // // // // //       isFormValid
// // // // // //         ? "bg-indigo-600 hover:bg-indigo-700"
// // // // // //         : "bg-gray-300 cursor-not-allowed opacity-60"
// // // // // //     }`}
// // // // // // >
// // // // // //   {isSubmitting ? "Saving…" : "Save as Draft"}
// // // // // // </button>
// // // // // //         </div>

// // // // // //       </CardContent>
// // // // // //     </Card>
// // // // // //   );
// // // // // // }

// // // // // "use client";

// // // // // import { useEffect, useRef, useState } from "react";
// // // // // import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
// // // // // import { UploadCloud, FileCheck2, X } from "lucide-react";
// // // // // import { layoutService } from "@/features/uploadlayouts/services/layout.service";
// // // // // import { toast } from "sonner";
// // // // // import { useRouter } from "next/navigation";

// // // // // type Props = {
// // // // //   formData: any;
// // // // //   setFormData: (data: any) => void;
// // // // // };

// // // // // // ─── SVG seat counter ─────────────────────────────────────────────────────────

// // // // // function extractSeatIds(svgText: string): string[] {
// // // // //   const ids: string[] = [];
// // // // //   const regex = /<g\s+id="([^"]+)"/g;
// // // // //   let match;
// // // // //   while ((match = regex.exec(svgText)) !== null) {
// // // // //     if (/^\d+$/.test(match[1])) ids.push(match[1]);
// // // // //   }
// // // // //   return ids;
// // // // // }

// // // // // // ─── Component ────────────────────────────────────────────────────────────────

// // // // // export default function LayoutForm({ formData, setFormData }: Props) {
// // // // //   const fileInputRef   = useRef<HTMLInputElement | null>(null);
// // // // //   const [isSubmitting, setIsSubmitting] = useState(false);

// // // // //   const [sites,     setSites]     = useState<any[]>([]);
// // // // //   const [buildings, setBuildings] = useState<any[]>([]);
// // // // //   const [floors,    setFloors]    = useState<any[]>([]);

// // // // //   const [seatIds,       setSeatIds]       = useState<string[]>([]);
// // // // //   const [countingSeats, setCountingSeats] = useState(false);

// // // // //   const resetForm = () => {
// // // // //     setFormData({
// // // // //       site: null, building: null, floor: null,
// // // // //       layoutName: "", file: null, isSubmitting: false,
// // // // //     });
// // // // //     setSeatIds([]);
// // // // //   };

// // // // //   // ── Load sites (once) ──────────────────────────────────────────────────
// // // // //   useEffect(() => {
// // // // //     layoutService.getSites().then(setSites);
// // // // //   }, []);

// // // // //   // ── Load buildings; if a site was pre-seeded, resolve its name too ─────
// // // // //   useEffect(() => {
// // // // //     if (!formData.site?.id) { setBuildings([]); return; }

// // // // //     layoutService.getBuildings(formData.site.id).then((data) => {
// // // // //       setBuildings(data);

// // // // //       // Name is empty when pre-seeded from URL — resolve it from the list
// // // // //       if (!formData.site.name) {
// // // // //         const match = data.find((b: any) =>
// // // // //           String(b.site_id ?? b.id) === String(formData.site.id)
// // // // //         );
// // // // //         // Buildings response doesn't carry the site name, so we resolve it
// // // // //         // from the sites list once sites are loaded (handled in sites effect below)
// // // // //       }
// // // // //     });
// // // // //   }, [formData.site?.id]);

// // // // //   // ── Resolve site name once sites list is available ─────────────────────
// // // // //   useEffect(() => {
// // // // //     if (!sites.length || !formData.site?.id || formData.site.name) return;
// // // // //     const match = sites.find((s: any) =>
// // // // //       String(s.site_id ?? s.id) === String(formData.site.id)
// // // // //     );
// // // // //     if (match) {
// // // // //       setFormData({
// // // // //         ...formData,
// // // // //         site: { id: formData.site.id, name: match.site_name ?? match.name },
// // // // //       });
// // // // //     }
// // // // //   }, [sites, formData.site?.id]);

// // // // //   // ── Load floors; resolve building name if pre-seeded ──────────────────
// // // // //   useEffect(() => {
// // // // //     if (!formData.building?.id) { setFloors([]); return; }

// // // // //     layoutService.getFloors(formData.building.id).then((data) => {
// // // // //       setFloors(data);
// // // // //     });
// // // // //   }, [formData.building?.id]);

// // // // //   // ── Resolve building name once buildings list is available ────────────
// // // // //   useEffect(() => {
// // // // //     if (!buildings.length || !formData.building?.id || formData.building.name) return;
// // // // //     const match = buildings.find((b: any) =>
// // // // //       String(b.building_id ?? b.id) === String(formData.building.id)
// // // // //     );
// // // // //     if (match) {
// // // // //       setFormData({
// // // // //         ...formData,
// // // // //         building: { id: formData.building.id, name: match.building_name ?? match.name },
// // // // //       });
// // // // //     }
// // // // //   }, [buildings, formData.building?.id]);

// // // // //   // ── Resolve floor name once floors list is available ──────────────────
// // // // //   useEffect(() => {
// // // // //     if (!floors.length || !formData.floor?.id || formData.floor.name) return;
// // // // //     const match = floors.find((f: any) =>
// // // // //       String(f.floor_id ?? f.id) === String(formData.floor.id)
// // // // //     );
// // // // //     if (match) {
// // // // //       setFormData({
// // // // //         ...formData,
// // // // //         floor: {
// // // // //           id:   formData.floor.id,
// // // // //           name: match.floor_name ?? match.floor_code ?? match.name,
// // // // //         },
// // // // //       });
// // // // //     }
// // // // //   }, [floors, formData.floor?.id]);

// // // // //   // ── Form validation ────────────────────────────────────────────────────
// // // // //   const isFormValid =
// // // // //     !!formData.site &&
// // // // //     !!formData.building &&
// // // // //     !!formData.floor &&
// // // // //     !!formData.file &&
// // // // //     !!formData.layoutName?.trim();

// // // // //   // ── File handling ──────────────────────────────────────────────────────
// // // // //   const handleFileChange = async (file: File) => {
// // // // //     if (file.type !== "image/svg+xml") {
// // // // //       toast.error("Only SVG files are allowed");
// // // // //       return;
// // // // //     }
// // // // //     if (file.size > 10 * 1024 * 1024) {
// // // // //       toast.error("Maximum file size is 10 MB");
// // // // //       return;
// // // // //     }

// // // // //     setFormData({ ...formData, file });
// // // // //     setSeatIds([]);
// // // // //     setCountingSeats(true);
// // // // //     try {
// // // // //       const text = await file.text();
// // // // //       const ids  = extractSeatIds(text);
// // // // //       setSeatIds(ids);
// // // // //       console.log(`[LayoutForm] ${ids.length} seat IDs:`, ids);
// // // // //     } catch (err) {
// // // // //       console.warn("[LayoutForm] Could not extract seat IDs:", err);
// // // // //     } finally {
// // // // //       setCountingSeats(false);
// // // // //     }
// // // // //   };

// // // // //   const handleDrop     = (e: React.DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileChange(f); };
// // // // //   const handleDragOver = (e: React.DragEvent) => e.preventDefault();

// // // // //   // ── Submit ─────────────────────────────────────────────────────────────
// // // // //   const router = useRouter();

// // // // //   const handleSubmit = async () => {
// // // // //     if (!formData.site || !formData.building || !formData.floor || !formData.file || !formData.layoutName.trim()) return;

// // // // //     setIsSubmitting(true);
// // // // //     try {
// // // // //       const res = await layoutService.createLayout({
// // // // //         file:        formData.file,
// // // // //         site_id:     formData.site.id,
// // // // //         building_id: formData.building.id,
// // // // //         floor_id:    formData.floor.id,
// // // // //         layout_name: formData.layoutName,
// // // // //         status:      "DRAFT",
// // // // //         seat_ids:    seatIds,
// // // // //       });

// // // // //       console.log("[LayoutForm] Upload success:", res);
// // // // //       toast.success("Layout saved successfully");

// // // // //       const layoutId = res?.layout_id || res?.id || res?.data?.layout_id;
// // // // //       if (!layoutId) {
// // // // //         console.error("layout_id not returned from createLayout response", res);
// // // // //         resetForm();
// // // // //         return;
// // // // //       }

// // // // //       const params = new URLSearchParams({
// // // // //         layoutId:   String(layoutId),
// // // // //         floorId:    String(formData.floor.id),
// // // // //         buildingId: String(formData.building.id),
// // // // //         siteId:     String(formData.site.id),
// // // // //       });
// // // // //       router.push(`/admin/layouts/manage-layout?${params.toString()}`);
// // // // //     } catch (err: any) {
// // // // //       console.error("[LayoutForm] Upload error:", err?.response?.data || err.message);
// // // // //       toast.error(err?.response?.data?.message || "Failed to save layout");
// // // // //     } finally {
// // // // //       setIsSubmitting(false);
// // // // //     }
// // // // //   };

// // // // //   // ── Render ─────────────────────────────────────────────────────────────

// // // // //   return (
// // // // //     <Card className="col-span-2">
// // // // //       <CardHeader>
// // // // //         <CardTitle className="text-sm font-semibold">Layout Information</CardTitle>
// // // // //       </CardHeader>

// // // // //       <CardContent className="space-y-6">

// // // // //         {/* ROW 1 — Site / Building */}
// // // // //         <div className="grid grid-cols-2 gap-4">
// // // // //           <div>
// // // // //             <label className="text-sm font-medium">
// // // // //               Site <span className="text-red-500">*</span>
// // // // //             </label>
// // // // //             <select
// // // // //               value={formData.site?.id || ""}
// // // // //               onChange={(e) =>
// // // // //                 setFormData({
// // // // //                   ...formData,
// // // // //                   site: { id: Number(e.target.value), name: e.target.options[e.target.selectedIndex].text },
// // // // //                   building: null,
// // // // //                   floor:    null,
// // // // //                 })
// // // // //               }
// // // // //               className="w-full mt-1 h-10 border rounded-md px-3 bg-white"
// // // // //             >
// // // // //               <option value="">Select Site</option>
// // // // //               {sites.map((s) => (
// // // // //                 <option key={s.site_id} value={s.site_id}>{s.site_name}</option>
// // // // //               ))}
// // // // //             </select>
// // // // //           </div>

// // // // //           <div>
// // // // //             <label className="text-sm font-medium">
// // // // //               Building <span className="text-red-500">*</span>
// // // // //             </label>
// // // // //             <select
// // // // //               value={formData.building?.id || ""}
// // // // //               onChange={(e) =>
// // // // //                 setFormData({
// // // // //                   ...formData,
// // // // //                   building: { id: Number(e.target.value), name: e.target.options[e.target.selectedIndex].text },
// // // // //                   floor: null,
// // // // //                 })
// // // // //               }
// // // // //               className="w-full mt-1 h-10 border rounded-md px-3 bg-white"
// // // // //             >
// // // // //               <option value="">Select Building</option>
// // // // //               {buildings.map((b) => (
// // // // //                 <option key={b.building_id} value={b.building_id}>{b.building_name}</option>
// // // // //               ))}
// // // // //             </select>
// // // // //           </div>
// // // // //         </div>

// // // // //         {/* ROW 2 — Floor / Layout Name */}
// // // // //         <div className="grid grid-cols-2 gap-4">
// // // // //           <div>
// // // // //             <label className="text-sm font-medium">
// // // // //               Floor <span className="text-red-500">*</span>
// // // // //             </label>
// // // // //             <select
// // // // //               value={formData.floor?.id || ""}
// // // // //               onChange={(e) =>
// // // // //                 setFormData({
// // // // //                   ...formData,
// // // // //                   floor: { id: Number(e.target.value), name: e.target.options[e.target.selectedIndex].text },
// // // // //                 })
// // // // //               }
// // // // //               className="w-full mt-1 h-10 border rounded-md px-3 bg-white"
// // // // //             >
// // // // //               <option value="">Select Floor</option>
// // // // //               {floors.map((f) => (
// // // // //                 <option key={f.floor_id} value={f.floor_id}>
// // // // //                   {f.floor_name || f.floor_code}
// // // // //                 </option>
// // // // //               ))}
// // // // //             </select>
// // // // //           </div>

// // // // //           <div>
// // // // //             <label className="text-sm font-medium">
// // // // //               Layout Name <span className="text-red-500">*</span>
// // // // //             </label>
// // // // //             <input
// // // // //               value={formData.layoutName || ""}
// // // // //               onChange={(e) => setFormData({ ...formData, layoutName: e.target.value })}
// // // // //               className="w-full mt-1 h-10 border rounded-md px-3"
// // // // //               placeholder="e.g. 8th Floor Layout"
// // // // //             />
// // // // //           </div>
// // // // //         </div>

// // // // //         {/* FILE UPLOAD */}
// // // // //         <div>
// // // // //           <label className="text-sm font-medium">
// // // // //             Upload SVG File <span className="text-red-500">*</span>
// // // // //           </label>

// // // // //           <div
// // // // //             onDrop={handleDrop}
// // // // //             onDragOver={handleDragOver}
// // // // //             onClick={() => !formData.file && fileInputRef.current?.click()}
// // // // //             className={`mt-2 border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-colors ${
// // // // //               formData.file
// // // // //                 ? "border-emerald-300 bg-emerald-50/40 cursor-default"
// // // // //                 : "border-indigo-300 hover:border-indigo-400 cursor-pointer"
// // // // //             }`}
// // // // //           >
// // // // //             {formData.file ? (
// // // // //               <div className="flex flex-col items-center gap-2 w-full">
// // // // //                 <FileCheck2 className="w-8 h-8 text-emerald-500" />
// // // // //                 <div className="flex items-center gap-2">
// // // // //                   <p className="text-sm font-medium text-emerald-700 truncate max-w-[240px]">
// // // // //                     {formData.file.name}
// // // // //                   </p>
// // // // //                   <button
// // // // //                     type="button"
// // // // //                     onClick={(e) => {
// // // // //                       e.stopPropagation();
// // // // //                       setFormData({ ...formData, file: null });
// // // // //                       setSeatIds([]);
// // // // //                       if (fileInputRef.current) fileInputRef.current.value = "";
// // // // //                     }}
// // // // //                     className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
// // // // //                     title="Remove file"
// // // // //                   >
// // // // //                     <X size={15} />
// // // // //                   </button>
// // // // //                 </div>

// // // // //                 <div className="flex items-center gap-1.5 text-xs">
// // // // //                   {countingSeats ? (
// // // // //                     <span className="flex items-center gap-1.5 text-gray-400">
// // // // //                       <span className="w-3 h-3 border border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
// // // // //                       Counting seats…
// // // // //                     </span>
// // // // //                   ) : seatIds.length > 0 ? (
// // // // //                     <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full font-medium">
// // // // //                       {seatIds.length} seat{seatIds.length !== 1 ? "s" : ""} detected
// // // // //                     </span>
// // // // //                   ) : null}
// // // // //                 </div>

// // // // //                 <button
// // // // //                   type="button"
// // // // //                   onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
// // // // //                   className="mt-1 px-3 py-1.5 text-xs border rounded-md bg-white hover:bg-gray-50 text-gray-600"
// // // // //                 >
// // // // //                   Replace file
// // // // //                 </button>
// // // // //               </div>
// // // // //             ) : (
// // // // //               <>
// // // // //                 <UploadCloud className="w-8 h-8 text-indigo-500 mb-2" />
// // // // //                 <p className="text-sm">Drag and drop your SVG file here</p>
// // // // //                 <p className="text-xs text-muted-foreground my-1">or</p>
// // // // //                 <button
// // // // //                   type="button"
// // // // //                   onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
// // // // //                   className="px-4 py-2 border rounded-md text-sm bg-white hover:bg-gray-50"
// // // // //                 >
// // // // //                   Browse File
// // // // //                 </button>
// // // // //                 <p className="text-xs text-muted-foreground mt-3">
// // // // //                   Maximum file size: 10 MB · Allowed format: .svg
// // // // //                 </p>
// // // // //               </>
// // // // //             )}
// // // // //           </div>

// // // // //           <input
// // // // //             type="file"
// // // // //             accept=".svg"
// // // // //             ref={fileInputRef}
// // // // //             className="hidden"
// // // // //             onChange={(e) => { if (e.target.files?.[0]) handleFileChange(e.target.files[0]); }}
// // // // //           />
// // // // //         </div>

// // // // //         {/* DESCRIPTION */}
// // // // //         <div>
// // // // //           <label className="text-sm font-medium">
// // // // //             Description{" "}
// // // // //             <span className="text-muted-foreground font-normal">(optional)</span>
// // // // //           </label>
// // // // //           <textarea
// // // // //             className="w-full mt-1 border rounded-md p-3 resize-none"
// // // // //             rows={4}
// // // // //             maxLength={500}
// // // // //             placeholder="Enter description or notes about this layout (optional)"
// // // // //             value={formData.description || ""}
// // // // //             onChange={(e) => setFormData({ ...formData, description: e.target.value })}
// // // // //           />
// // // // //           <div className="text-right text-xs text-muted-foreground mt-1">
// // // // //             {(formData.description || "").length} / 500
// // // // //           </div>
// // // // //         </div>

// // // // //         {/* BUTTONS */}
// // // // //         <div className="flex justify-end gap-3 pt-2">
// // // // //           <button
// // // // //             type="button"
// // // // //             onClick={handleSubmit}
// // // // //             disabled={isSubmitting || !isFormValid}
// // // // //             className={`px-4 py-2 rounded-md text-sm transition-colors text-white ${
// // // // //               isFormValid
// // // // //                 ? "bg-indigo-600 hover:bg-indigo-700"
// // // // //                 : "bg-gray-300 cursor-not-allowed opacity-60"
// // // // //             }`}
// // // // //           >
// // // // //             {isSubmitting ? "Saving…" : "Save as Draft"}
// // // // //           </button>
// // // // //         </div>

// // // // //       </CardContent>
// // // // //     </Card>
// // // // //   );
// // // // // }



// // // // "use client";

// // // // import { useEffect, useRef, useState } from "react";
// // // // import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
// // // // import { UploadCloud, FileCheck2, X } from "lucide-react";
// // // // import { layoutService } from "@/features/uploadlayouts/services/layout.service";
// // // // import { toast } from "sonner";
// // // // import { useRouter } from "next/navigation";

// // // // type Props = {
// // // //   formData: any;
// // // //   setFormData: (data: any) => void;
// // // // };

// // // // // ─── SVG seat counter ─────────────────────────────────────────────────────────

// // // // function extractSeatIds(svgText: string): string[] {
// // // //   const ids: string[] = [];
// // // //   const regex = /<g\s+id="([^"]+)"/g;
// // // //   let match;
// // // //   while ((match = regex.exec(svgText)) !== null) {
// // // //     if (/^\d+$/.test(match[1])) ids.push(match[1]);
// // // //   }
// // // //   return ids;
// // // // }

// // // // // ─── Component ────────────────────────────────────────────────────────────────

// // // // export default function LayoutForm({ formData, setFormData }: Props) {
// // // //   const fileInputRef   = useRef<HTMLInputElement | null>(null);
// // // //   const [isSubmitting, setIsSubmitting] = useState(false);

// // // //   const [sites,     setSites]     = useState<any[]>([]);
// // // //   const [buildings, setBuildings] = useState<any[]>([]);
// // // //   const [floors,    setFloors]    = useState<any[]>([]);

// // // //   const [seatIds,       setSeatIds]       = useState<string[]>([]);
// // // //   const [countingSeats, setCountingSeats] = useState(false);

// // // //   const resetForm = () => {
// // // //     setFormData({
// // // //       site: null, building: null, floor: null,
// // // //       layoutName: "", file: null, isSubmitting: false,
// // // //     });
// // // //     setSeatIds([]);
// // // //   };

// // // //   // ── 1. Load sites on mount ─────────────────────────────────────────────
// // // //   useEffect(() => {
// // // //     layoutService.getSites().then(setSites);
// // // //   }, []);

// // // //   // ── 2. Resolve site name once sites list arrives (pre-seed case) ───────
// // // //   useEffect(() => {
// // // //     if (!sites.length || !formData.site?.id || formData.site.name) return;
// // // //     const match = sites.find((s: any) => String(s.site_id ?? s.id) === String(formData.site.id));
// // // //     if (match) {
// // // //       setFormData((prev: any) => ({
// // // //         ...prev,
// // // //         site: { id: prev.site.id, name: match.site_name ?? match.name ?? "" },
// // // //       }));
// // // //     }
// // // //   }, [sites]);

// // // //   // ── 3. Load buildings whenever selected site changes ──────────────────
// // // //   useEffect(() => {
// // // //     if (!formData.site?.id) { setBuildings([]); setFloors([]); return; }
// // // //     layoutService.getBuildings(formData.site.id).then(setBuildings);
// // // //   }, [formData.site?.id]);

// // // //   // ── 4. Resolve building name + auto-select once buildings list arrives ─
// // // //   useEffect(() => {
// // // //     if (!buildings.length || !formData.building?.id) return;

// // // //     // Resolve name if missing (pre-seed case)
// // // //     if (!formData.building.name) {
// // // //       const match = buildings.find(
// // // //         (b: any) => String(b.building_id ?? b.id) === String(formData.building.id)
// // // //       );
// // // //       if (match) {
// // // //         setFormData((prev: any) => ({
// // // //           ...prev,
// // // //           building: { id: prev.building.id, name: match.building_name ?? match.name ?? "" },
// // // //         }));
// // // //       }
// // // //     }
// // // //   }, [buildings]);

// // // //   // ── 5. Load floors whenever selected building changes ────────────────
// // // //   useEffect(() => {
// // // //     if (!formData.building?.id) { setFloors([]); return; }
// // // //     layoutService.getFloors(formData.building.id).then(setFloors);
// // // //   }, [formData.building?.id]);

// // // //   // ── 6. Resolve floor name once floors list arrives (pre-seed case) ────
// // // //   useEffect(() => {
// // // //     if (!floors.length || !formData.floor?.id || formData.floor.name) return;
// // // //     const match = floors.find(
// // // //       (f: any) => String(f.floor_id ?? f.id) === String(formData.floor.id)
// // // //     );
// // // //     if (match) {
// // // //       setFormData((prev: any) => ({
// // // //         ...prev,
// // // //         floor: {
// // // //           id:   prev.floor.id,
// // // //           name: match.floor_name ?? match.floor_code ?? match.name ?? "",
// // // //         },
// // // //       }));
// // // //     }
// // // //   }, [floors]);

// // // //   // ── Form validation ────────────────────────────────────────────────────
// // // //   const isFormValid =
// // // //     !!formData.site &&
// // // //     !!formData.building &&
// // // //     !!formData.floor &&
// // // //     !!formData.file &&
// // // //     !!formData.layoutName?.trim();

// // // //   // ── File handling ──────────────────────────────────────────────────────
// // // //   const handleFileChange = async (file: File) => {
// // // //     if (file.type !== "image/svg+xml") {
// // // //       toast.error("Only SVG files are allowed");
// // // //       return;
// // // //     }
// // // //     if (file.size > 10 * 1024 * 1024) {
// // // //       toast.error("Maximum file size is 10 MB");
// // // //       return;
// // // //     }
// // // //     setFormData((prev: any) => ({ ...prev, file }));
// // // //     setSeatIds([]);
// // // //     setCountingSeats(true);
// // // //     try {
// // // //       const text = await file.text();
// // // //       const ids  = extractSeatIds(text);
// // // //       setSeatIds(ids);
// // // //       console.log(`[LayoutForm] ${ids.length} seat IDs:`, ids);
// // // //     } catch (err) {
// // // //       console.warn("[LayoutForm] Could not extract seat IDs:", err);
// // // //     } finally {
// // // //       setCountingSeats(false);
// // // //     }
// // // //   };

// // // //   const handleDrop     = (e: React.DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileChange(f); };
// // // //   const handleDragOver = (e: React.DragEvent) => e.preventDefault();

// // // //   // ── Submit ─────────────────────────────────────────────────────────────
// // // //   const router = useRouter();

// // // //   const handleSubmit = async () => {
// // // //     if (!formData.site || !formData.building || !formData.floor || !formData.file || !formData.layoutName?.trim()) return;

// // // //     setIsSubmitting(true);
// // // //     try {
// // // //       const res = await layoutService.createLayout({
// // // //         file:        formData.file,
// // // //         site_id:     formData.site.id,
// // // //         building_id: formData.building.id,
// // // //         floor_id:    formData.floor.id,
// // // //         layout_name: formData.layoutName,
// // // //         status:      "DRAFT",
// // // //         seat_ids:    seatIds,
// // // //       });

// // // //       console.log("[LayoutForm] Upload success:", res);
// // // //       toast.success("Layout saved successfully");

// // // //       const layoutId = res?.layout_id || res?.id || res?.data?.layout_id;
// // // //       if (!layoutId) {
// // // //         console.error("layout_id not returned from createLayout response", res);
// // // //         resetForm();
// // // //         return;
// // // //       }

// // // //       const params = new URLSearchParams({
// // // //         layoutId:   String(layoutId),
// // // //         floorId:    String(formData.floor.id),
// // // //         buildingId: String(formData.building.id),
// // // //         siteId:     String(formData.site.id),
// // // //       });
// // // //       router.push(`/admin/layouts/manage-layout?${params.toString()}`);
// // // //     } catch (err: any) {
// // // //       console.error("[LayoutForm] Upload error:", err?.response?.data || err.message);
// // // //       toast.error(err?.response?.data?.message || "Failed to save layout");
// // // //     } finally {
// // // //       setIsSubmitting(false);
// // // //     }
// // // //   };

// // // //   // ── Render ─────────────────────────────────────────────────────────────

// // // //   return (
// // // //     <Card className="col-span-2">
// // // //       <CardHeader>
// // // //         <CardTitle className="text-sm font-semibold">Layout Information</CardTitle>
// // // //       </CardHeader>

// // // //       <CardContent className="space-y-6">

// // // //         {/* ROW 1 — Site / Building */}
// // // //         <div className="grid grid-cols-2 gap-4">
// // // //           <div>
// // // //             <label className="text-sm font-medium">
// // // //               Site <span className="text-red-500">*</span>
// // // //             </label>
// // // //             <select
// // // //               value={formData.site?.id || ""}
// // // //               onChange={(e) =>
// // // //                 setFormData((prev: any) => ({
// // // //                   ...prev,
// // // //                   site:     { id: Number(e.target.value), name: e.target.options[e.target.selectedIndex].text },
// // // //                   building: null,
// // // //                   floor:    null,
// // // //                 }))
// // // //               }
// // // //               className="w-full mt-1 h-10 border rounded-md px-3 bg-white"
// // // //             >
// // // //               <option value="">Select Site</option>
// // // //               {sites.map((s) => (
// // // //                 <option key={s.site_id} value={s.site_id}>{s.site_name}</option>
// // // //               ))}
// // // //             </select>
// // // //           </div>

// // // //           <div>
// // // //             <label className="text-sm font-medium">
// // // //               Building <span className="text-red-500">*</span>
// // // //             </label>
// // // //             <select
// // // //               value={formData.building?.id || ""}
// // // //               onChange={(e) =>
// // // //                 setFormData((prev: any) => ({
// // // //                   ...prev,
// // // //                   building: { id: Number(e.target.value), name: e.target.options[e.target.selectedIndex].text },
// // // //                   floor:    null,
// // // //                 }))
// // // //               }
// // // //               className="w-full mt-1 h-10 border rounded-md px-3 bg-white"
// // // //             >
// // // //               <option value="">Select Building</option>
// // // //               {buildings.map((b) => (
// // // //                 <option key={b.building_id} value={b.building_id}>{b.building_name}</option>
// // // //               ))}
// // // //             </select>
// // // //           </div>
// // // //         </div>

// // // //         {/* ROW 2 — Floor / Layout Name */}
// // // //         <div className="grid grid-cols-2 gap-4">
// // // //           <div>
// // // //             <label className="text-sm font-medium">
// // // //               Floor <span className="text-red-500">*</span>
// // // //             </label>
// // // //             <select
// // // //               value={formData.floor?.id || ""}
// // // //               onChange={(e) =>
// // // //                 setFormData((prev: any) => ({
// // // //                   ...prev,
// // // //                   floor: { id: Number(e.target.value), name: e.target.options[e.target.selectedIndex].text },
// // // //                 }))
// // // //               }
// // // //               className="w-full mt-1 h-10 border rounded-md px-3 bg-white"
// // // //             >
// // // //               <option value="">Select Floor</option>
// // // //               {floors.map((f) => (
// // // //                 <option key={f.floor_id} value={f.floor_id}>
// // // //                   {f.floor_name || f.floor_code}
// // // //                 </option>
// // // //               ))}
// // // //             </select>
// // // //           </div>

// // // //           <div>
// // // //             <label className="text-sm font-medium">
// // // //               Layout Name <span className="text-red-500">*</span>
// // // //             </label>
// // // //             <input
// // // //               value={formData.layoutName || ""}
// // // //               onChange={(e) => setFormData((prev: any) => ({ ...prev, layoutName: e.target.value }))}
// // // //               className="w-full mt-1 h-10 border rounded-md px-3"
// // // //               placeholder="e.g. 8th Floor Layout"
// // // //             />
// // // //           </div>
// // // //         </div>

// // // //         {/* FILE UPLOAD */}
// // // //         <div>
// // // //           <label className="text-sm font-medium">
// // // //             Upload SVG File <span className="text-red-500">*</span>
// // // //           </label>

// // // //           <div
// // // //             onDrop={handleDrop}
// // // //             onDragOver={handleDragOver}
// // // //             onClick={() => !formData.file && fileInputRef.current?.click()}
// // // //             className={`mt-2 border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-colors ${
// // // //               formData.file
// // // //                 ? "border-emerald-300 bg-emerald-50/40 cursor-default"
// // // //                 : "border-indigo-300 hover:border-indigo-400 cursor-pointer"
// // // //             }`}
// // // //           >
// // // //             {formData.file ? (
// // // //               <div className="flex flex-col items-center gap-2 w-full">
// // // //                 <FileCheck2 className="w-8 h-8 text-emerald-500" />
// // // //                 <div className="flex items-center gap-2">
// // // //                   <p className="text-sm font-medium text-emerald-700 truncate max-w-[240px]">
// // // //                     {formData.file.name}
// // // //                   </p>
// // // //                   <button
// // // //                     type="button"
// // // //                     onClick={(e) => {
// // // //                       e.stopPropagation();
// // // //                       setFormData((prev: any) => ({ ...prev, file: null }));
// // // //                       setSeatIds([]);
// // // //                       if (fileInputRef.current) fileInputRef.current.value = "";
// // // //                     }}
// // // //                     className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
// // // //                     title="Remove file"
// // // //                   >
// // // //                     <X size={15} />
// // // //                   </button>
// // // //                 </div>

// // // //                 <div className="flex items-center gap-1.5 text-xs">
// // // //                   {countingSeats ? (
// // // //                     <span className="flex items-center gap-1.5 text-gray-400">
// // // //                       <span className="w-3 h-3 border border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
// // // //                       Counting seats…
// // // //                     </span>
// // // //                   ) : seatIds.length > 0 ? (
// // // //                     <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full font-medium">
// // // //                       {seatIds.length} seat{seatIds.length !== 1 ? "s" : ""} detected
// // // //                     </span>
// // // //                   ) : null}
// // // //                 </div>

// // // //                 <button
// // // //                   type="button"
// // // //                   onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
// // // //                   className="mt-1 px-3 py-1.5 text-xs border rounded-md bg-white hover:bg-gray-50 text-gray-600"
// // // //                 >
// // // //                   Replace file
// // // //                 </button>
// // // //               </div>
// // // //             ) : (
// // // //               <>
// // // //                 <UploadCloud className="w-8 h-8 text-indigo-500 mb-2" />
// // // //                 <p className="text-sm">Drag and drop your SVG file here</p>
// // // //                 <p className="text-xs text-muted-foreground my-1">or</p>
// // // //                 <button
// // // //                   type="button"
// // // //                   onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
// // // //                   className="px-4 py-2 border rounded-md text-sm bg-white hover:bg-gray-50"
// // // //                 >
// // // //                   Browse File
// // // //                 </button>
// // // //                 <p className="text-xs text-muted-foreground mt-3">
// // // //                   Maximum file size: 10 MB · Allowed format: .svg
// // // //                 </p>
// // // //               </>
// // // //             )}
// // // //           </div>

// // // //           <input
// // // //             type="file"
// // // //             accept=".svg"
// // // //             ref={fileInputRef}
// // // //             className="hidden"
// // // //             onChange={(e) => { if (e.target.files?.[0]) handleFileChange(e.target.files[0]); }}
// // // //           />
// // // //         </div>

// // // //         {/* DESCRIPTION */}
// // // //         <div>
// // // //           <label className="text-sm font-medium">
// // // //             Description{" "}
// // // //             <span className="text-muted-foreground font-normal">(optional)</span>
// // // //           </label>
// // // //           <textarea
// // // //             className="w-full mt-1 border rounded-md p-3 resize-none"
// // // //             rows={4}
// // // //             maxLength={500}
// // // //             placeholder="Enter description or notes about this layout (optional)"
// // // //             value={formData.description || ""}
// // // //             onChange={(e) => setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
// // // //           />
// // // //           <div className="text-right text-xs text-muted-foreground mt-1">
// // // //             {(formData.description || "").length} / 500
// // // //           </div>
// // // //         </div>

// // // //         {/* BUTTONS */}
// // // //         <div className="flex justify-end gap-3 pt-2">
// // // //           <button
// // // //             type="button"
// // // //             onClick={handleSubmit}
// // // //             disabled={isSubmitting || !isFormValid}
// // // //             className={`px-4 py-2 rounded-md text-sm transition-colors text-white ${
// // // //               isFormValid
// // // //                 ? "bg-indigo-600 hover:bg-indigo-700"
// // // //                 : "bg-gray-300 cursor-not-allowed opacity-60"
// // // //             }`}
// // // //           >
// // // //             {isSubmitting ? "Saving…" : "Save as Draft"}
// // // //           </button>
// // // //         </div>

// // // //       </CardContent>
// // // //     </Card>
// // // //   );
// // // // }

// // // "use client";

// // // import { useEffect, useRef, useState } from "react";
// // // import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
// // // import { UploadCloud, FileCheck2, X } from "lucide-react";
// // // import { layoutService } from "@/features/uploadlayouts/services/layout.service";
// // // import { toast } from "sonner";
// // // import { useRouter } from "next/navigation";

// // // type Props = {
// // //   formData: any;
// // //   setFormData: (data: any) => void;
// // // };

// // // // ─── SVG seat counter ─────────────────────────────────────────────────────────

// // // function extractSeatIds(svgText: string): string[] {
// // //   const ids: string[] = [];
// // //   const regex = /<g\s+id="([^"]+)"/g;
// // //   let match;
// // //   while ((match = regex.exec(svgText)) !== null) {
// // //     if (/^\d+$/.test(match[1])) ids.push(match[1]);
// // //   }
// // //   return ids;
// // // }

// // // // ─── Component ────────────────────────────────────────────────────────────────

// // // export default function LayoutForm({ formData, setFormData }: Props) {
// // //   const fileInputRef   = useRef<HTMLInputElement | null>(null);
// // //   const [isSubmitting, setIsSubmitting] = useState(false);

// // //   const [sites,     setSites]     = useState<any[]>([]);
// // //   const [buildings, setBuildings] = useState<any[]>([]);
// // //   const [floors,    setFloors]    = useState<any[]>([]);

// // //   const [seatIds,       setSeatIds]       = useState<string[]>([]);
// // //   const [countingSeats, setCountingSeats] = useState(false);
// // //   const [svgPreview,    setSvgPreview]    = useState<string | null>(null);

// // //   const resetForm = () => {
// // //     setFormData({
// // //       site: null, building: null, floor: null,
// // //       layoutName: "", file: null, isSubmitting: false,
// // //     });
// // //     setSeatIds([]);
// // //     setSvgPreview(null);
// // //   };

// // //   // ── 1. Load sites on mount ─────────────────────────────────────────────
// // //   useEffect(() => {
// // //     layoutService.getSites().then(setSites);
// // //   }, []);

// // //   // ── 2. Resolve site name once sites list arrives (pre-seed case) ───────
// // //   useEffect(() => {
// // //     if (!sites.length || !formData.site?.id || formData.site.name) return;
// // //     const match = sites.find((s: any) => String(s.site_id ?? s.id) === String(formData.site.id));
// // //     if (match) {
// // //       setFormData((prev: any) => ({
// // //         ...prev,
// // //         site: { id: prev.site.id, name: match.site_name ?? match.name ?? "" },
// // //       }));
// // //     }
// // //   }, [sites]);

// // //   // ── 3. Load buildings whenever selected site changes ──────────────────
// // //   useEffect(() => {
// // //     if (!formData.site?.id) { setBuildings([]); setFloors([]); return; }
// // //     layoutService.getBuildings(formData.site.id).then(setBuildings);
// // //   }, [formData.site?.id]);

// // //   // ── 4. Resolve building name + auto-select once buildings list arrives ─
// // //   useEffect(() => {
// // //     if (!buildings.length || !formData.building?.id) return;
// // //     if (!formData.building.name) {
// // //       const match = buildings.find(
// // //         (b: any) => String(b.building_id ?? b.id) === String(formData.building.id)
// // //       );
// // //       if (match) {
// // //         setFormData((prev: any) => ({
// // //           ...prev,
// // //           building: { id: prev.building.id, name: match.building_name ?? match.name ?? "" },
// // //         }));
// // //       }
// // //     }
// // //   }, [buildings]);

// // //   // ── 5. Load floors whenever selected building changes ────────────────
// // //   useEffect(() => {
// // //     if (!formData.building?.id) { setFloors([]); return; }
// // //     layoutService.getFloors(formData.building.id).then(setFloors);
// // //   }, [formData.building?.id]);

// // //   // ── 6. Resolve floor name once floors list arrives (pre-seed case) ────
// // //   useEffect(() => {
// // //     if (!floors.length || !formData.floor?.id || formData.floor.name) return;
// // //     const match = floors.find(
// // //       (f: any) => String(f.floor_id ?? f.id) === String(formData.floor.id)
// // //     );
// // //     if (match) {
// // //       setFormData((prev: any) => ({
// // //         ...prev,
// // //         floor: {
// // //           id:   prev.floor.id,
// // //           name: match.floor_name ?? match.floor_code ?? match.name ?? "",
// // //         },
// // //       }));
// // //     }
// // //   }, [floors]);

// // //   // ── Form validation ────────────────────────────────────────────────────
// // //   const isFormValid =
// // //     !!formData.site &&
// // //     !!formData.building &&
// // //     !!formData.floor &&
// // //     !!formData.file &&
// // //     !!formData.layoutName?.trim();

// // //   // ── File handling ──────────────────────────────────────────────────────
// // //   const handleFileChange = async (file: File) => {
// // //     if (file.type !== "image/svg+xml") {
// // //       toast.error("Only SVG files are allowed");
// // //       return;
// // //     }
// // //     if (file.size > 10 * 1024 * 1024) {
// // //       toast.error("Maximum file size is 10 MB");
// // //       return;
// // //     }
// // //     setFormData((prev: any) => ({ ...prev, file }));
// // //     setSeatIds([]);
// // //     setSvgPreview(null);
// // //     setCountingSeats(true);
// // //     try {
// // //       const text = await file.text();
// // //       const ids  = extractSeatIds(text);
// // //       setSeatIds(ids);
// // //       console.log(`[LayoutForm] ${ids.length} seat IDs:`, ids);

// // //       // Make SVG fluid and store for preview
// // //       const fluid = text
// // //         .replace(/\bwidth="[^"]*"/, 'width="100%"')
// // //         .replace(/\bheight="[^"]*"/, 'height="100%"');
// // //       setSvgPreview(fluid);
// // //     } catch (err) {
// // //       console.warn("[LayoutForm] Could not extract seat IDs:", err);
// // //     } finally {
// // //       setCountingSeats(false);
// // //     }
// // //   };

// // //   const handleDrop     = (e: React.DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileChange(f); };
// // //   const handleDragOver = (e: React.DragEvent) => e.preventDefault();

// // //   // ── Submit ─────────────────────────────────────────────────────────────
// // //   const router = useRouter();

// // //   const handleSubmit = async () => {
// // //     if (!formData.site || !formData.building || !formData.floor || !formData.file || !formData.layoutName?.trim()) return;

// // //     setIsSubmitting(true);
// // //     try {
// // //       const res = await layoutService.createLayout({
// // //         file:        formData.file,
// // //         site_id:     formData.site.id,
// // //         building_id: formData.building.id,
// // //         floor_id:    formData.floor.id,
// // //         layout_name: formData.layoutName,
// // //         status:      "DRAFT",
// // //         seat_ids:    seatIds,
// // //       });

// // //       console.log("[LayoutForm] Upload success:", res);
// // //       toast.success("Layout saved successfully");

// // //       const layoutId = res?.layout_id || res?.id || res?.data?.layout_id;
// // //       if (!layoutId) {
// // //         console.error("layout_id not returned from createLayout response", res);
// // //         resetForm();
// // //         return;
// // //       }

// // //       const params = new URLSearchParams({
// // //         layoutId:   String(layoutId),
// // //         floorId:    String(formData.floor.id),
// // //         buildingId: String(formData.building.id),
// // //         siteId:     String(formData.site.id),
// // //       });
// // //       router.push(`/admin/layouts/manage-layout?${params.toString()}`);
// // //     } catch (err: any) {
// // //       console.error("[LayoutForm] Upload error:", err?.response?.data || err.message);
// // //       toast.error(err?.response?.data?.message || "Failed to save layout");
// // //     } finally {
// // //       setIsSubmitting(false);
// // //     }
// // //   };

// // //   // ── Render ─────────────────────────────────────────────────────────────

// // //   return (
// // //     <Card className="col-span-2">
// // //       <CardHeader>
// // //         <CardTitle className="text-sm font-semibold">Layout Information</CardTitle>
// // //       </CardHeader>

// // //       <CardContent className="space-y-6">

// // //         {/* ROW 1 — Site / Building */}
// // //         <div className="grid grid-cols-2 gap-4">
// // //           <div>
// // //             <label className="text-sm font-medium">
// // //               Site <span className="text-red-500">*</span>
// // //             </label>
// // //             <select
// // //               value={formData.site?.id || ""}
// // //               onChange={(e) =>
// // //                 setFormData((prev: any) => ({
// // //                   ...prev,
// // //                   site:     { id: Number(e.target.value), name: e.target.options[e.target.selectedIndex].text },
// // //                   building: null,
// // //                   floor:    null,
// // //                 }))
// // //               }
// // //               className="w-full mt-1 h-10 border rounded-md px-3 bg-white"
// // //             >
// // //               <option value="">Select Site</option>
// // //               {sites.map((s) => (
// // //                 <option key={s.site_id} value={s.site_id}>{s.site_name}</option>
// // //               ))}
// // //             </select>
// // //           </div>

// // //           <div>
// // //             <label className="text-sm font-medium">
// // //               Building <span className="text-red-500">*</span>
// // //             </label>
// // //             <select
// // //               value={formData.building?.id || ""}
// // //               onChange={(e) =>
// // //                 setFormData((prev: any) => ({
// // //                   ...prev,
// // //                   building: { id: Number(e.target.value), name: e.target.options[e.target.selectedIndex].text },
// // //                   floor:    null,
// // //                 }))
// // //               }
// // //               className="w-full mt-1 h-10 border rounded-md px-3 bg-white"
// // //             >
// // //               <option value="">Select Building</option>
// // //               {buildings.map((b) => (
// // //                 <option key={b.building_id} value={b.building_id}>{b.building_name}</option>
// // //               ))}
// // //             </select>
// // //           </div>
// // //         </div>

// // //         {/* ROW 2 — Floor / Layout Name */}
// // //         <div className="grid grid-cols-2 gap-4">
// // //           <div>
// // //             <label className="text-sm font-medium">
// // //               Floor <span className="text-red-500">*</span>
// // //             </label>
// // //             <select
// // //               value={formData.floor?.id || ""}
// // //               onChange={(e) =>
// // //                 setFormData((prev: any) => ({
// // //                   ...prev,
// // //                   floor: { id: Number(e.target.value), name: e.target.options[e.target.selectedIndex].text },
// // //                 }))
// // //               }
// // //               className="w-full mt-1 h-10 border rounded-md px-3 bg-white"
// // //             >
// // //               <option value="">Select Floor</option>
// // //               {floors.map((f) => (
// // //                 <option key={f.floor_id} value={f.floor_id}>
// // //                   {f.floor_name || f.floor_code}
// // //                 </option>
// // //               ))}
// // //             </select>
// // //           </div>

// // //           <div>
// // //             <label className="text-sm font-medium">
// // //               Layout Name <span className="text-red-500">*</span>
// // //             </label>
// // //             <input
// // //               value={formData.layoutName || ""}
// // //               onChange={(e) => setFormData((prev: any) => ({ ...prev, layoutName: e.target.value }))}
// // //               className="w-full mt-1 h-10 border rounded-md px-3"
// // //               placeholder="e.g. 8th Floor Layout"
// // //             />
// // //           </div>
// // //         </div>

// // //         {/* FILE UPLOAD */}
// // //         <div>
// // //           <label className="text-sm font-medium">
// // //             Upload SVG File <span className="text-red-500">*</span>
// // //           </label>

// // //           <div
// // //             onDrop={handleDrop}
// // //             onDragOver={handleDragOver}
// // //             onClick={() => !formData.file && fileInputRef.current?.click()}
// // //             className={`mt-2 border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-colors ${
// // //               formData.file
// // //                 ? "border-emerald-300 bg-emerald-50/40 cursor-default"
// // //                 : "border-indigo-300 hover:border-indigo-400 cursor-pointer"
// // //             }`}
// // //           >
// // //             {formData.file ? (
// // //               <div className="flex flex-col items-center gap-2 w-full">
// // //                 <FileCheck2 className="w-8 h-8 text-emerald-500" />
// // //                 <div className="flex items-center gap-2">
// // //                   <p className="text-sm font-medium text-emerald-700 truncate max-w-[240px]">
// // //                     {formData.file.name}
// // //                   </p>
// // //                   <button
// // //                     type="button"
// // //                     onClick={(e) => {
// // //                       e.stopPropagation();
// // //                       setFormData((prev: any) => ({ ...prev, file: null }));
// // //                       setSeatIds([]);
// // //                       setSvgPreview(null);
// // //                       if (fileInputRef.current) fileInputRef.current.value = "";
// // //                     }}
// // //                     className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
// // //                     title="Remove file"
// // //                   >
// // //                     <X size={15} />
// // //                   </button>
// // //                 </div>

// // //                 <div className="flex items-center gap-1.5 text-xs">
// // //                   {countingSeats ? (
// // //                     <span className="flex items-center gap-1.5 text-gray-400">
// // //                       <span className="w-3 h-3 border border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
// // //                       Counting seats…
// // //                     </span>
// // //                   ) : seatIds.length > 0 ? (
// // //                     <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full font-medium">
// // //                       {seatIds.length} seat{seatIds.length !== 1 ? "s" : ""} detected
// // //                     </span>
// // //                   ) : null}
// // //                 </div>

// // //                 <button
// // //                   type="button"
// // //                   onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
// // //                   className="mt-1 px-3 py-1.5 text-xs border rounded-md bg-white hover:bg-gray-50 text-gray-600"
// // //                 >
// // //                   Replace file
// // //                 </button>
// // //               </div>
// // //             ) : (
// // //               <>
// // //                 <UploadCloud className="w-8 h-8 text-indigo-500 mb-2" />
// // //                 <p className="text-sm">Drag and drop your SVG file here</p>
// // //                 <p className="text-xs text-muted-foreground my-1">or</p>
// // //                 <button
// // //                   type="button"
// // //                   onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
// // //                   className="px-4 py-2 border rounded-md text-sm bg-white hover:bg-gray-50"
// // //                 >
// // //                   Browse File
// // //                 </button>
// // //                 <p className="text-xs text-muted-foreground mt-3">
// // //                   Maximum file size: 10 MB · Allowed format: .svg
// // //                 </p>
// // //               </>
// // //             )}
// // //           </div>

// // //           <input
// // //             type="file"
// // //             accept=".svg"
// // //             ref={fileInputRef}
// // //             className="hidden"
// // //             onChange={(e) => { if (e.target.files?.[0]) handleFileChange(e.target.files[0]); }}
// // //           />
// // //         </div>

// // //         {/* SVG PREVIEW */}
// // //         {svgPreview && (
// // //           <div>
// // //             <label className="text-sm font-medium">Layout Preview</label>
// // //             <div
// // //               className="mt-2 border rounded-lg bg-gray-50 overflow-auto p-2"
// // //               style={{ maxHeight: "420px" }}
// // //               dangerouslySetInnerHTML={{ __html: svgPreview }}
// // //             />
// // //           </div>
// // //         )}

// // //         {/* DESCRIPTION */}
// // //         <div>
// // //           <label className="text-sm font-medium">
// // //             Description{" "}
// // //             <span className="text-muted-foreground font-normal">(optional)</span>
// // //           </label>
// // //           <textarea
// // //             className="w-full mt-1 border rounded-md p-3 resize-none"
// // //             rows={4}
// // //             maxLength={500}
// // //             placeholder="Enter description or notes about this layout (optional)"
// // //             value={formData.description || ""}
// // //             onChange={(e) => setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
// // //           />
// // //           <div className="text-right text-xs text-muted-foreground mt-1">
// // //             {(formData.description || "").length} / 500
// // //           </div>
// // //         </div>

// // //         {/* BUTTONS */}
// // //         <div className="flex justify-end gap-3 pt-2">
// // //           <button
// // //             type="button"
// // //             onClick={handleSubmit}
// // //             disabled={isSubmitting || !isFormValid}
// // //             className={`px-4 py-2 rounded-md text-sm transition-colors text-white ${
// // //               isFormValid
// // //                 ? "bg-indigo-600 hover:bg-indigo-700"
// // //                 : "bg-gray-300 cursor-not-allowed opacity-60"
// // //             }`}
// // //           >
// // //             {isSubmitting ? "Saving…" : "Save as Draft"}
// // //           </button>
// // //         </div>

// // //       </CardContent>
// // //     </Card>
// // //   );
// // // }

// // "use client";

// // import { useEffect, useRef, useState } from "react";
// // import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
// // import { UploadCloud, FileCheck2, X } from "lucide-react";
// // import { layoutService } from "@/features/uploadlayouts/services/layout.service";
// // import { toast } from "sonner";
// // import { useRouter } from "next/navigation";

// // type Props = {
// //   formData: any;
// //   setFormData: (data: any) => void;
// // };

// // // ─── SVG seat counter ─────────────────────────────────────────────────────────

// // function extractSeatIds(svgText: string): string[] {
// //   const ids: string[] = [];
// //   const regex = /<g\s+id="([^"]+)"/g;
// //   let match;
// //   while ((match = regex.exec(svgText)) !== null) {
// //     if (/^\d+$/.test(match[1])) ids.push(match[1]);
// //   }
// //   return ids;
// // }

// // // ─── Component ────────────────────────────────────────────────────────────────

// // export default function LayoutForm({ formData, setFormData }: Props) {
// //   const fileInputRef   = useRef<HTMLInputElement | null>(null);
// //   const [isSubmitting, setIsSubmitting] = useState(false);

// //   const [sites,     setSites]     = useState<any[]>([]);
// //   const [buildings, setBuildings] = useState<any[]>([]);
// //   const [floors,    setFloors]    = useState<any[]>([]);

// //   const [seatIds,       setSeatIds]       = useState<string[]>([]);
// //   const [countingSeats, setCountingSeats] = useState(false);
// //   const [svgPreview,    setSvgPreview]    = useState<string | null>(null);
// //   const [showPreview,   setShowPreview]   = useState(false);

// //   const resetForm = () => {
// //     setFormData({
// //       site: null, building: null, floor: null,
// //       layoutName: "", file: null, isSubmitting: false,
// //     });
// //     setSeatIds([]);
// //     setSvgPreview(null);
// //     setShowPreview(false);
// //   };

// //   // ── 1. Load sites on mount ─────────────────────────────────────────────
// //   useEffect(() => {
// //     layoutService.getSites().then(setSites);
// //   }, []);

// //   // ── 2. Resolve site name once sites list arrives (pre-seed case) ───────
// //   useEffect(() => {
// //     if (!sites.length || !formData.site?.id || formData.site.name) return;
// //     const match = sites.find((s: any) => String(s.site_id ?? s.id) === String(formData.site.id));
// //     if (match) {
// //       setFormData((prev: any) => ({
// //         ...prev,
// //         site: { id: prev.site.id, name: match.site_name ?? match.name ?? "" },
// //       }));
// //     }
// //   }, [sites]);

// //   // ── 3. Load buildings whenever selected site changes ──────────────────
// //   useEffect(() => {
// //     if (!formData.site?.id) { setBuildings([]); setFloors([]); return; }
// //     layoutService.getBuildings(formData.site.id).then(setBuildings);
// //   }, [formData.site?.id]);

// //   // ── 4. Resolve building name + auto-select once buildings list arrives ─
// //   useEffect(() => {
// //     if (!buildings.length || !formData.building?.id) return;
// //     if (!formData.building.name) {
// //       const match = buildings.find(
// //         (b: any) => String(b.building_id ?? b.id) === String(formData.building.id)
// //       );
// //       if (match) {
// //         setFormData((prev: any) => ({
// //           ...prev,
// //           building: { id: prev.building.id, name: match.building_name ?? match.name ?? "" },
// //         }));
// //       }
// //     }
// //   }, [buildings]);

// //   // ── 5. Load floors whenever selected building changes ────────────────
// //   useEffect(() => {
// //     if (!formData.building?.id) { setFloors([]); return; }
// //     layoutService.getFloors(formData.building.id).then(setFloors);
// //   }, [formData.building?.id]);

// //   // ── 6. Resolve floor name once floors list arrives (pre-seed case) ────
// //   useEffect(() => {
// //     if (!floors.length || !formData.floor?.id || formData.floor.name) return;
// //     const match = floors.find(
// //       (f: any) => String(f.floor_id ?? f.id) === String(formData.floor.id)
// //     );
// //     if (match) {
// //       setFormData((prev: any) => ({
// //         ...prev,
// //         floor: {
// //           id:   prev.floor.id,
// //           name: match.floor_name ?? match.floor_code ?? match.name ?? "",
// //         },
// //       }));
// //     }
// //   }, [floors]);

// //   // ── Form validation ────────────────────────────────────────────────────
// //   const isFormValid =
// //     !!formData.site &&
// //     !!formData.building &&
// //     !!formData.floor &&
// //     !!formData.file &&
// //     !!formData.layoutName?.trim();

// //   // ── File handling ──────────────────────────────────────────────────────
// //   const handleFileChange = async (file: File) => {
// //     if (file.type !== "image/svg+xml") {
// //       toast.error("Only SVG files are allowed");
// //       return;
// //     }
// //     if (file.size > 10 * 1024 * 1024) {
// //       toast.error("Maximum file size is 10 MB");
// //       return;
// //     }
// //     setFormData((prev: any) => ({ ...prev, file }));
// //     setSeatIds([]);
// //     setSvgPreview(null);
// //     setCountingSeats(true);
// //     try {
// //       const text = await file.text();
// //       const ids  = extractSeatIds(text);
// //       setSeatIds(ids);
// //       console.log(`[LayoutForm] ${ids.length} seat IDs:`, ids);

// //       // Make SVG fluid and store for preview
// //       const fluid = text
// //         .replace(/\bwidth="[^"]*"/, 'width="100%"')
// //         .replace(/\bheight="[^"]*"/, 'height="100%"');
// //       setSvgPreview(fluid);
// //     } catch (err) {
// //       console.warn("[LayoutForm] Could not extract seat IDs:", err);
// //     } finally {
// //       setCountingSeats(false);
// //     }
// //   };

// //   const handleDrop     = (e: React.DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileChange(f); };
// //   const handleDragOver = (e: React.DragEvent) => e.preventDefault();

// //   // ── Submit ─────────────────────────────────────────────────────────────
// //   const router = useRouter();

// //   const handleSubmit = async () => {
// //     if (!formData.site || !formData.building || !formData.floor || !formData.file || !formData.layoutName?.trim()) return;

// //     setIsSubmitting(true);
// //     try {
// //       const res = await layoutService.createLayout({
// //         file:        formData.file,
// //         site_id:     formData.site.id,
// //         building_id: formData.building.id,
// //         floor_id:    formData.floor.id,
// //         layout_name: formData.layoutName,
// //         status:      "DRAFT",
// //         seat_ids:    seatIds,
// //       });

// //       console.log("[LayoutForm] Upload success:", res);
// //       toast.success("Layout saved successfully");

// //       const layoutId = res?.layout_id || res?.id || res?.data?.layout_id;
// //       if (!layoutId) {
// //         console.error("layout_id not returned from createLayout response", res);
// //         resetForm();
// //         return;
// //       }

// //       const params = new URLSearchParams({
// //         layoutId:   String(layoutId),
// //         floorId:    String(formData.floor.id),
// //         buildingId: String(formData.building.id),
// //         siteId:     String(formData.site.id),
// //       });
// //       router.push(`/admin/layouts/manage-layout?${params.toString()}`);
// //     } catch (err: any) {
// //       console.error("[LayoutForm] Upload error:", err?.response?.data || err.message);
// //       toast.error(err?.response?.data?.message || "Failed to save layout");
// //     } finally {
// //       setIsSubmitting(false);
// //     }
// //   };

// //   // ── Render ─────────────────────────────────────────────────────────────

// //   return (
// //     <Card className="col-span-2">
// //       <CardHeader>
// //         <CardTitle className="text-sm font-semibold">Layout Information</CardTitle>
// //       </CardHeader>

// //       <CardContent className="space-y-6">

// //         {/* ROW 1 — Site / Building */}
// //         <div className="grid grid-cols-2 gap-4">
// //           <div>
// //             <label className="text-sm font-medium">
// //               Site <span className="text-red-500">*</span>
// //             </label>
// //             <select
// //               value={formData.site?.id || ""}
// //               onChange={(e) =>
// //                 setFormData((prev: any) => ({
// //                   ...prev,
// //                   site:     { id: Number(e.target.value), name: e.target.options[e.target.selectedIndex].text },
// //                   building: null,
// //                   floor:    null,
// //                 }))
// //               }
// //               className="w-full mt-1 h-10 border rounded-md px-3 bg-white"
// //             >
// //               <option value="">Select Site</option>
// //               {sites.map((s) => (
// //                 <option key={s.site_id} value={s.site_id}>{s.site_name}</option>
// //               ))}
// //             </select>
// //           </div>

// //           <div>
// //             <label className="text-sm font-medium">
// //               Building <span className="text-red-500">*</span>
// //             </label>
// //             <select
// //               value={formData.building?.id || ""}
// //               onChange={(e) =>
// //                 setFormData((prev: any) => ({
// //                   ...prev,
// //                   building: { id: Number(e.target.value), name: e.target.options[e.target.selectedIndex].text },
// //                   floor:    null,
// //                 }))
// //               }
// //               className="w-full mt-1 h-10 border rounded-md px-3 bg-white"
// //             >
// //               <option value="">Select Building</option>
// //               {buildings.map((b) => (
// //                 <option key={b.building_id} value={b.building_id}>{b.building_name}</option>
// //               ))}
// //             </select>
// //           </div>
// //         </div>

// //         {/* ROW 2 — Floor / Layout Name */}
// //         <div className="grid grid-cols-2 gap-4">
// //           <div>
// //             <label className="text-sm font-medium">
// //               Floor <span className="text-red-500">*</span>
// //             </label>
// //             <select
// //               value={formData.floor?.id || ""}
// //               onChange={(e) =>
// //                 setFormData((prev: any) => ({
// //                   ...prev,
// //                   floor: { id: Number(e.target.value), name: e.target.options[e.target.selectedIndex].text },
// //                 }))
// //               }
// //               className="w-full mt-1 h-10 border rounded-md px-3 bg-white"
// //             >
// //               <option value="">Select Floor</option>
// //               {floors.map((f) => (
// //                 <option key={f.floor_id} value={f.floor_id}>
// //                   {f.floor_name || f.floor_code}
// //                 </option>
// //               ))}
// //             </select>
// //           </div>

// //           <div>
// //             <label className="text-sm font-medium">
// //               Layout Name <span className="text-red-500">*</span>
// //             </label>
// //             <input
// //               value={formData.layoutName || ""}
// //               onChange={(e) => setFormData((prev: any) => ({ ...prev, layoutName: e.target.value }))}
// //               className="w-full mt-1 h-10 border rounded-md px-3"
// //               placeholder="e.g. 8th Floor Layout"
// //             />
// //           </div>
// //         </div>

// //         {/* FILE UPLOAD */}
// //         <div>
// //           <label className="text-sm font-medium">
// //             Upload SVG File <span className="text-red-500">*</span>
// //           </label>

// //           <div
// //             onDrop={handleDrop}
// //             onDragOver={handleDragOver}
// //             onClick={() => !formData.file && fileInputRef.current?.click()}
// //             className={`mt-2 border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-colors ${
// //               formData.file
// //                 ? "border-emerald-300 bg-emerald-50/40 cursor-default"
// //                 : "border-indigo-300 hover:border-indigo-400 cursor-pointer"
// //             }`}
// //           >
// //             {formData.file ? (
// //               <div className="flex flex-col items-center gap-2 w-full">
// //                 <FileCheck2 className="w-8 h-8 text-emerald-500" />
// //                 <div className="flex items-center gap-2">
// //                   <p className="text-sm font-medium text-emerald-700 truncate max-w-[240px]">
// //                     {formData.file.name}
// //                   </p>
// //                   <button
// //                     type="button"
// //                     onClick={(e) => {
// //                       e.stopPropagation();
// //                       setFormData((prev: any) => ({ ...prev, file: null }));
// //                       setSeatIds([]);
// //                       setSvgPreview(null);
// //                       setShowPreview(false);
// //                       if (fileInputRef.current) fileInputRef.current.value = "";
// //                     }}
// //                     className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
// //                     title="Remove file"
// //                   >
// //                     <X size={15} />
// //                   </button>
// //                 </div>

// //                 <div className="flex items-center gap-1.5 text-xs">
// //                   {countingSeats ? (
// //                     <span className="flex items-center gap-1.5 text-gray-400">
// //                       <span className="w-3 h-3 border border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
// //                       Counting seats…
// //                     </span>
// //                   ) : seatIds.length > 0 ? (
// //                     <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full font-medium">
// //                       {seatIds.length} seat{seatIds.length !== 1 ? "s" : ""} detected
// //                     </span>
// //                   ) : null}
// //                 </div>

// //                 <button
// //                   type="button"
// //                   onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
// //                   className="mt-1 px-3 py-1.5 text-xs border rounded-md bg-white hover:bg-gray-50 text-gray-600"
// //                 >
// //                   Replace file
// //                 </button>
// //               </div>
// //             ) : (
// //               <>
// //                 <UploadCloud className="w-8 h-8 text-indigo-500 mb-2" />
// //                 <p className="text-sm">Drag and drop your SVG file here</p>
// //                 <p className="text-xs text-muted-foreground my-1">or</p>
// //                 <button
// //                   type="button"
// //                   onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
// //                   className="px-4 py-2 border rounded-md text-sm bg-white hover:bg-gray-50"
// //                 >
// //                   Browse File
// //                 </button>
// //                 <p className="text-xs text-muted-foreground mt-3">
// //                   Maximum file size: 10 MB · Allowed format: .svg
// //                 </p>
// //               </>
// //             )}
// //           </div>

// //           <input
// //             type="file"
// //             accept=".svg"
// //             ref={fileInputRef}
// //             className="hidden"
// //             onChange={(e) => { if (e.target.files?.[0]) handleFileChange(e.target.files[0]); }}
// //           />
// //         </div>

// //         {/* SVG PREVIEW */}
// //         {svgPreview && (
// //           <div>
// //             <button
// //               type="button"
// //               onClick={() => setShowPreview((p) => !p)}
// //               className="text-xs text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
// //             >
// //               {showPreview ? "Hide Preview" : "Preview Layout"}
// //             </button>
// //             {showPreview && (
// //               <div
// //                 className="mt-2 border rounded-lg bg-gray-50 overflow-auto p-2"
// //                 style={{ maxHeight: "260px" }}
// //                 dangerouslySetInnerHTML={{ __html: svgPreview }}
// //               />
// //             )}
// //           </div>
// //         )}

// //         {/* DESCRIPTION */}
// //         <div>
// //           <label className="text-sm font-medium">
// //             Description{" "}
// //             <span className="text-muted-foreground font-normal">(optional)</span>
// //           </label>
// //           <textarea
// //             className="w-full mt-1 border rounded-md p-3 resize-none"
// //             rows={4}
// //             maxLength={500}
// //             placeholder="Enter description or notes about this layout (optional)"
// //             value={formData.description || ""}
// //             onChange={(e) => setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
// //           />
// //           <div className="text-right text-xs text-muted-foreground mt-1">
// //             {(formData.description || "").length} / 500
// //           </div>
// //         </div>

// //         {/* BUTTONS */}
// //         <div className="flex justify-end gap-3 pt-2">
// //           <button
// //             type="button"
// //             onClick={handleSubmit}
// //             disabled={isSubmitting || !isFormValid}
// //             className={`px-4 py-2 rounded-md text-sm transition-colors text-white ${
// //               isFormValid
// //                 ? "bg-indigo-600 hover:bg-indigo-700"
// //                 : "bg-gray-300 cursor-not-allowed opacity-60"
// //             }`}
// //           >
// //             {isSubmitting ? "Saving…" : "Save as Draft"}
// //           </button>
// //         </div>

// //       </CardContent>
// //     </Card>
// //   );
// // }

// "use client";

// import { useEffect, useRef, useState } from "react";
// import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
// import { UploadCloud, FileCheck2, X } from "lucide-react";
// import { layoutService } from "@/features/uploadlayouts/services/layout.service";
// import { toast } from "sonner";
// import { useRouter } from "next/navigation";

// type Props = {
//   formData: any;
//   setFormData: (data: any) => void;
// };

// // ─── SVG seat counter ─────────────────────────────────────────────────────────

// function extractSeatIds(svgText: string): string[] {
//   const ids: string[] = [];
//   const regex = /<g\s+id="([^"]+)"/g;
//   let match;
//   while ((match = regex.exec(svgText)) !== null) {
//     if (/^\d+$/.test(match[1])) ids.push(match[1]);
//   }
//   return ids;
// }

// // ─── Component ────────────────────────────────────────────────────────────────

// export default function LayoutForm({ formData, setFormData }: Props) {
//   const fileInputRef   = useRef<HTMLInputElement | null>(null);
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   const [sites,     setSites]     = useState<any[]>([]);
//   const [buildings, setBuildings] = useState<any[]>([]);
//   const [floors,    setFloors]    = useState<any[]>([]);

//   const [seatIds,       setSeatIds]       = useState<string[]>([]);
//   const [countingSeats, setCountingSeats] = useState(false);
//   const [svgPreview,    setSvgPreview]    = useState<string | null>(null);
//   const [showPreview,   setShowPreview]   = useState(false);

//   const resetForm = () => {
//     setFormData({
//       site: null, building: null, floor: null,
//       layoutName: "", file: null, isSubmitting: false,
//     });
//     setSeatIds([]);
//     setSvgPreview(null);
//     setShowPreview(false);
//   };

//   // ── 1. Load sites on mount ─────────────────────────────────────────────
//   useEffect(() => {
//     layoutService.getSites().then(setSites);
//   }, []);

//   // ── 2. Resolve site name once sites list arrives (pre-seed case) ───────
//   useEffect(() => {
//     if (!sites.length || !formData.site?.id || formData.site.name) return;
//     const match = sites.find((s: any) => String(s.site_id ?? s.id) === String(formData.site.id));
//     if (match) {
//       setFormData((prev: any) => ({
//         ...prev,
//         site: { id: prev.site.id, name: match.site_name ?? match.name ?? "" },
//       }));
//     }
//   }, [sites]);

//   // ── 3. Load buildings whenever selected site changes ──────────────────
//   useEffect(() => {
//     if (!formData.site?.id) { setBuildings([]); setFloors([]); return; }
//     layoutService.getBuildings(formData.site.id).then(setBuildings);
//   }, [formData.site?.id]);

//   // ── 4. Resolve building name + auto-select once buildings list arrives ─
//   useEffect(() => {
//     if (!buildings.length || !formData.building?.id) return;
//     if (!formData.building.name) {
//       const match = buildings.find(
//         (b: any) => String(b.building_id ?? b.id) === String(formData.building.id)
//       );
//       if (match) {
//         setFormData((prev: any) => ({
//           ...prev,
//           building: { id: prev.building.id, name: match.building_name ?? match.name ?? "" },
//         }));
//       }
//     }
//   }, [buildings]);

//   // ── 5. Load floors whenever selected building changes ────────────────
//   useEffect(() => {
//     if (!formData.building?.id) { setFloors([]); return; }
//     layoutService.getFloors(formData.building.id).then(setFloors);
//   }, [formData.building?.id]);

//   // ── 6. Resolve floor name once floors list arrives (pre-seed case) ────
//   useEffect(() => {
//     if (!floors.length || !formData.floor?.id || formData.floor.name) return;
//     const match = floors.find(
//       (f: any) => String(f.floor_id ?? f.id) === String(formData.floor.id)
//     );
//     if (match) {
//       setFormData((prev: any) => ({
//         ...prev,
//         floor: {
//           id:   prev.floor.id,
//           name: match.floor_name ?? match.floor_code ?? match.name ?? "",
//         },
//       }));
//     }
//   }, [floors]);

//   // ── Form validation ────────────────────────────────────────────────────
//   const isFormValid =
//     !!formData.site &&
//     !!formData.building &&
//     !!formData.floor &&
//     !!formData.file &&
//     !!formData.layoutName?.trim();

//   // ── File handling ──────────────────────────────────────────────────────
//   const handleFileChange = async (file: File) => {
//     if (file.type !== "image/svg+xml") {
//       toast.error("Only SVG files are allowed");
//       return;
//     }
//     if (file.size > 10 * 1024 * 1024) {
//       toast.error("Maximum file size is 10 MB");
//       return;
//     }
//     setFormData((prev: any) => ({ ...prev, file }));
//     setSeatIds([]);
//     setSvgPreview(null);
//     setCountingSeats(true);
//     try {
//       const text = await file.text();
//       const ids  = extractSeatIds(text);
//       setSeatIds(ids);
//       console.log(`[LayoutForm] ${ids.length} seat IDs:`, ids);

//       // Make SVG fluid and store for preview
//       const fluid = text
//         .replace(/\bwidth="[^"]*"/, 'width="100%"')
//         .replace(/\bheight="[^"]*"/, 'height="100%"');
//       setSvgPreview(fluid);
//     } catch (err) {
//       console.warn("[LayoutForm] Could not extract seat IDs:", err);
//     } finally {
//       setCountingSeats(false);
//     }
//   };

//   const handleDrop     = (e: React.DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileChange(f); };
//   const handleDragOver = (e: React.DragEvent) => e.preventDefault();

//   // ── Submit ─────────────────────────────────────────────────────────────
//   const router = useRouter();

//   const handleSubmit = async () => {
//     if (!formData.site || !formData.building || !formData.floor || !formData.file || !formData.layoutName?.trim()) return;

//     setIsSubmitting(true);
//     try {
//       const res = await layoutService.createLayout({
//         file:        formData.file,
//         site_id:     formData.site.id,
//         building_id: formData.building.id,
//         floor_id:    formData.floor.id,
//         layout_name: formData.layoutName,
//         status:      "DRAFT",
//         seat_ids:    seatIds,
//       });

//       console.log("[LayoutForm] Upload success:", res);
//       toast.success("Layout saved successfully");

//       const layoutId = res?.layout_id || res?.id || res?.data?.layout_id;
//       if (!layoutId) {
//         console.error("layout_id not returned from createLayout response", res);
//         resetForm();
//         return;
//       }

//       const params = new URLSearchParams({
//         layoutId:   String(layoutId),
//         floorId:    String(formData.floor.id),
//         buildingId: String(formData.building.id),
//         siteId:     String(formData.site.id),
//       });
//       router.push(`/admin/layouts/manage-layout?${params.toString()}`);
//     } catch (err: any) {
//       console.error("[LayoutForm] Upload error:", err?.response?.data || err.message);
//       toast.error(err?.response?.data?.message || "Failed to save layout");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   // ── Render ─────────────────────────────────────────────────────────────

//   return (
//     <Card className="col-span-2">
//       <CardHeader>
//         <CardTitle className="text-sm font-semibold">Layout Information</CardTitle>
//       </CardHeader>

//       <CardContent className="space-y-6">

//         {/* ROW 1 — Site / Building */}
//         <div className="grid grid-cols-2 gap-4">
//           <div>
//             <label className="text-sm font-medium">
//               Site <span className="text-red-500">*</span>
//             </label>
//             <select
//               value={formData.site?.id || ""}
//               onChange={(e) =>
//                 setFormData((prev: any) => ({
//                   ...prev,
//                   site:     { id: Number(e.target.value), name: e.target.options[e.target.selectedIndex].text },
//                   building: null,
//                   floor:    null,
//                 }))
//               }
//               className="w-full mt-1 h-10 border rounded-md px-3 bg-white"
//             >
//               <option value="">Select Site</option>
//               {sites.map((s) => (
//                 <option key={s.site_id} value={s.site_id}>{s.site_name}</option>
//               ))}
//             </select>
//           </div>

//           <div>
//             <label className="text-sm font-medium">
//               Building <span className="text-red-500">*</span>
//             </label>
//             <select
//               value={formData.building?.id || ""}
//               onChange={(e) =>
//                 setFormData((prev: any) => ({
//                   ...prev,
//                   building: { id: Number(e.target.value), name: e.target.options[e.target.selectedIndex].text },
//                   floor:    null,
//                 }))
//               }
//               className="w-full mt-1 h-10 border rounded-md px-3 bg-white"
//             >
//               <option value="">Select Building</option>
//               {buildings.map((b) => (
//                 <option key={b.building_id} value={b.building_id}>{b.building_name}</option>
//               ))}
//             </select>
//           </div>
//         </div>

//         {/* ROW 2 — Floor / Layout Name */}
//         <div className="grid grid-cols-2 gap-4">
//           <div>
//             <label className="text-sm font-medium">
//               Floor <span className="text-red-500">*</span>
//             </label>
//             <select
//               value={formData.floor?.id || ""}
//               onChange={(e) =>
//                 setFormData((prev: any) => ({
//                   ...prev,
//                   floor: { id: Number(e.target.value), name: e.target.options[e.target.selectedIndex].text },
//                 }))
//               }
//               className="w-full mt-1 h-10 border rounded-md px-3 bg-white"
//             >
//               <option value="">Select Floor</option>
//               {floors.map((f) => (
//                 <option key={f.floor_id} value={f.floor_id}>
//                   {f.floor_name || f.floor_code}
//                 </option>
//               ))}
//             </select>
//           </div>

//           <div>
//             <label className="text-sm font-medium">
//               Layout Name <span className="text-red-500">*</span>
//             </label>
//             <input
//               value={formData.layoutName || ""}
//               onChange={(e) => setFormData((prev: any) => ({ ...prev, layoutName: e.target.value }))}
//               className="w-full mt-1 h-10 border rounded-md px-3"
//               placeholder="e.g. 8th Floor Layout"
//             />
//           </div>
//         </div>

//         {/* FILE UPLOAD */}
//         <div>
//           <label className="text-sm font-medium">
//             Upload SVG File <span className="text-red-500">*</span>
//           </label>

//           <div
//             onDrop={handleDrop}
//             onDragOver={handleDragOver}
//             onClick={() => !formData.file && fileInputRef.current?.click()}
//             className={`mt-2 border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-colors ${
//               formData.file
//                 ? "border-emerald-300 bg-emerald-50/40 cursor-default"
//                 : "border-indigo-300 hover:border-indigo-400 cursor-pointer"
//             }`}
//           >
//             {formData.file ? (
//               <div className="flex flex-col items-center gap-2 w-full">
//                 <FileCheck2 className="w-8 h-8 text-emerald-500" />
//                 <div className="flex items-center gap-2">
//                   <p className="text-sm font-medium text-emerald-700 truncate max-w-[240px]">
//                     {formData.file.name}
//                   </p>
//                   <button
//                     type="button"
//                     onClick={(e) => {
//                       e.stopPropagation();
//                       setFormData((prev: any) => ({ ...prev, file: null }));
//                       setSeatIds([]);
//                       setSvgPreview(null);
//                       setShowPreview(false);
//                       if (fileInputRef.current) fileInputRef.current.value = "";
//                     }}
//                     className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
//                     title="Remove file"
//                   >
//                     <X size={15} />
//                   </button>
//                 </div>

//                 <div className="flex items-center gap-1.5 text-xs">
//                   {countingSeats ? (
//                     <span className="flex items-center gap-1.5 text-gray-400">
//                       <span className="w-3 h-3 border border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
//                       Counting seats…
//                     </span>
//                   ) : seatIds.length > 0 ? (
//                     <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full font-medium">
//                       {seatIds.length} seat{seatIds.length !== 1 ? "s" : ""} detected
//                     </span>
//                   ) : null}
//                 </div>

//                 <button
//                   type="button"
//                   onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
//                   className="mt-1 px-3 py-1.5 text-xs border rounded-md bg-white hover:bg-gray-50 text-gray-600"
//                 >
//                   Replace file
//                 </button>
//               </div>
//             ) : (
//               <>
//                 <UploadCloud className="w-8 h-8 text-indigo-500 mb-2" />
//                 <p className="text-sm">Drag and drop your SVG file here</p>
//                 <p className="text-xs text-muted-foreground my-1">or</p>
//                 <button
//                   type="button"
//                   onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
//                   className="px-4 py-2 border rounded-md text-sm bg-white hover:bg-gray-50"
//                 >
//                   Browse File
//                 </button>
//                 <p className="text-xs text-muted-foreground mt-3">
//                   Maximum file size: 10 MB · Allowed format: .svg
//                 </p>
//               </>
//             )}
//           </div>

//           <input
//             type="file"
//             accept=".svg"
//             ref={fileInputRef}
//             className="hidden"
//             onChange={(e) => { if (e.target.files?.[0]) handleFileChange(e.target.files[0]); }}
//           />
//         </div>

//         {/* SVG PREVIEW */}
//         {svgPreview && (
//           <div>
//             <button
//               type="button"
//               onClick={() => setShowPreview((p) => !p)}
//               className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-colors"
//             >
//               <svg
//                 className={`w-3.5 h-3.5 transition-transform duration-200 ${showPreview ? "rotate-180" : ""}`}
//                 viewBox="0 0 24 24" fill="none" stroke="currentColor"
//                 strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
//               >
//                 <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
//                 <circle cx="12" cy="12" r="3" />
//               </svg>
//               {showPreview ? "Hide Preview" : "Preview Layout"}
//             </button>
//             {showPreview && (
//               <div
//                 className="mt-2 border rounded-lg bg-gray-50 overflow-auto p-2"
//                 style={{ maxHeight: "260px" }}
//                 dangerouslySetInnerHTML={{ __html: svgPreview }}
//               />
//             )}
//           </div>
//         )}

//         {/* DESCRIPTION */}
//         <div>
//           <label className="text-sm font-medium">
//             Description{" "}
//             <span className="text-muted-foreground font-normal">(optional)</span>
//           </label>
//           <textarea
//             className="w-full mt-1 border rounded-md p-3 resize-none"
//             rows={4}
//             maxLength={500}
//             placeholder="Enter description or notes about this layout (optional)"
//             value={formData.description || ""}
//             onChange={(e) => setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
//           />
//           <div className="text-right text-xs text-muted-foreground mt-1">
//             {(formData.description || "").length} / 500
//           </div>
//         </div>

//         {/* BUTTONS */}
//         <div className="flex justify-end gap-3 pt-2">
//           <button
//             type="button"
//             onClick={handleSubmit}
//             disabled={isSubmitting || !isFormValid}
//             className={`px-4 py-2 rounded-md text-sm transition-colors text-white ${
//               isFormValid
//                 ? "bg-indigo-600 hover:bg-indigo-700"
//                 : "bg-gray-300 cursor-not-allowed opacity-60"
//             }`}
//           >
//             {isSubmitting ? "Saving…" : "Save as Draft"}
//           </button>
//         </div>

//       </CardContent>
//     </Card>
//   );
// }

"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { UploadCloud, FileCheck2, X } from "lucide-react";
import { layoutService } from "@/features/uploadlayouts/services/layout.service";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Props = {
  formData: any;
  setFormData: (data: any) => void;
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

export default function LayoutForm({ formData, setFormData }: Props) {
  const fileInputRef   = useRef<HTMLInputElement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [sites,     setSites]     = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [floors,    setFloors]    = useState<any[]>([]);

  const [seatIds,       setSeatIds]       = useState<string[]>([]);
  const [countingSeats, setCountingSeats] = useState(false);
  const [svgPreview,    setSvgPreview]    = useState<string | null>(null);
  const [showPreview,   setShowPreview]   = useState(false);

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
        site: { id: prev.site.id, name: match.site_name ?? match.name ?? "" },
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
          building: { id: prev.building.id, name: match.building_name ?? match.name ?? "" },
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
        },
      }));
    }
  }, [floors]);

  // ── Form validation ────────────────────────────────────────────────────
  const isFormValid =
    !!formData.site &&
    !!formData.building &&
    !!formData.floor &&
    !!formData.file &&
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
      console.log(`[LayoutForm] ${ids.length} seat IDs:`, ids);

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

      console.log("[LayoutForm] Upload success:", res);
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
      console.error("[LayoutForm] Upload error:", err?.response?.data || err.message);
      toast.error(err?.response?.data?.message || "Failed to save layout");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Layout Information</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ROW 1 — Site / Building */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">
              Site <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.site?.id || ""}
              onChange={(e) =>
                setFormData((prev: any) => ({
                  ...prev,
                  site:     { id: Number(e.target.value), name: e.target.options[e.target.selectedIndex].text },
                  building: null,
                  floor:    null,
                }))
              }
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
              onChange={(e) =>
                setFormData((prev: any) => ({
                  ...prev,
                  building: { id: Number(e.target.value), name: e.target.options[e.target.selectedIndex].text },
                  floor:    null,
                }))
              }
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
              onChange={(e) =>
                setFormData((prev: any) => ({
                  ...prev,
                  floor: { id: Number(e.target.value), name: e.target.options[e.target.selectedIndex].text },
                }))
              }
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
              className="w-full mt-1 h-10 border rounded-md px-3"
              placeholder="e.g. 8th Floor Layout"
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
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="px-3 py-1.5 text-xs border rounded-md bg-white hover:bg-gray-50 text-gray-600"
                  >
                    Replace file
                  </button>

                  {svgPreview && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowPreview((p) => !p); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-colors"
                    >
                      <svg
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${showPreview ? "rotate-180" : ""}`}
                        viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      {showPreview ? "Hide Preview" : "Preview Layout"}
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

        {/* SVG PREVIEW */}
        {svgPreview && showPreview && (
          <div
            className="border rounded-lg bg-gray-50 overflow-auto p-2"
            style={{ maxHeight: "260px" }}
            dangerouslySetInnerHTML={{ __html: svgPreview }}
          />
        )}

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
  );
}