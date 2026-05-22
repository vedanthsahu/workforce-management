"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { UploadCloud } from "lucide-react";
import { layoutService } from "@/features/uploadlayouts/services/layout.service";

type Props = {
  formData: any;
  setFormData: (data: any) => void;
};

export default function LayoutForm({ formData, setFormData }: Props) {

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

   // NEW STATE
  const [sites, setSites] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [floors, setFloors] = useState<any[]>([]);


  const resetForm = () => {
  setFormData({
    site: null,
    building: null,
    floor: null,
    layoutName: "",
    file: null,
    isSubmitting: false,
  });
};

  //LOAD SITES
  useEffect(() => {
    layoutService.getSites().then(setSites);
  }, []);

  // LOAD BUILDINGS
  useEffect(() => {
    if (formData.site?.id) {
      layoutService.getBuildings(formData.site.id).then(setBuildings);
    } else {
      setBuildings([]);
    }
  }, [formData.site]);

  //  LOAD FLOORS
  useEffect(() => {
    if (formData.building?.id) {
      layoutService.getFloors(formData.building.id).then(setFloors);
    } else {
      setFloors([]);
    }
  }, [formData.building]);


   const handleFileChange = (file: File) => {
    if (file.type !== "image/svg+xml") return alert("Only SVG allowed");
    if (file.size > 10 * 1024 * 1024) return alert("Max 10MB");

    setFormData({ ...formData, file });
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

const handleSubmit = async () => {
  try {
    if (!formData.site || !formData.building || !formData.floor) {
      alert("Please select Site, Building and Floor");
      return;
    }

    if (!formData.file) {
      alert("Upload SVG file");
      return;
    }

    if (!formData.layoutName.trim()) {
      alert("Enter layout name");
      return;
    }
    setIsSubmitting(true);
    alert("Before API");
   

    const res = await layoutService.createLayout({
      file: formData.file,
      site_id: formData.site.id,
      building_id: formData.building.id,
      floor_id: formData.floor.id,
      layout_name: formData.layoutName,
      status: "DRAFT",
    });
    alert("after API");

    console.log("SUCCESS:", res);

    alert("Layout saved successfully ");
    formData
    resetForm();
   

    console.log ("FILE TYPE:", formData.file?.type);

  } catch (err: any) {
    console.error("ERROR:", err?.response?.data || err.message);
  }
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
            <select
          value={formData.site?.id || ""}
          onChange={(e) =>
            setFormData({
              ...formData,
              site: {
                id: Number(e.target.value),
                name: e.target.options[e.target.selectedIndex].text,
              },
              building: null,
              floor: null,
            })
          }
        
  className="w-full mt-1 h-10 border rounded-md px-3 bg-white"
>
  <option value="">Select Site</option>
          {sites.map((s) => (
            <option key={s.site_id} value={s.site_id}>
              {s.site_name}
            </option>
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
            setFormData({
              ...formData,
              building: {
                id: Number(e.target.value),
                name: e.target.options[e.target.selectedIndex].text,
              },
              floor: null,
            })
          }
        
  className="w-full mt-1 h-10 border rounded-md px-3 bg-white"
>
  <option value="">Select Building</option>
          {buildings.map((b) => (
            <option key={b.building_id} value={b.building_id}>
              {b.building_name}
            </option>
          ))}
        </select>
          </div>
        </div>

        {/* ROW 2 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">
              Floor <span className="text-red-500">*</span>
            </label>
            <select
          value={formData.floor?.id || ""}
          onChange={(e) =>
            setFormData({
              ...formData,
              floor: {
                id: Number(e.target.value),
                name: e.target.options[e.target.selectedIndex].text,
              },
            })
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
              onChange={(e) =>
                setFormData({
                  ...formData,
                  layoutName: e.target.value,
                })
              }
              className="w-full mt-1 h-10 border rounded-md px-3"
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
            className="mt-2 border-2 border-dashed border-indigo-300 rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer"
          >
            <UploadCloud className="w-8 h-8 text-indigo-500 mb-2" />

            <p className="text-sm">
              Drag and drop your SVG file here
            </p>

            <p className="text-xs text-muted-foreground my-1">
              or
            </p>

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

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 border rounded-md text-sm bg-white hover:bg-gray-50"
            >
              Browse File
            </button>

            {formData.file && (
              <p className="text-xs text-green-600 mt-2">
                {formData.file.name}
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
          <button  onClick={resetForm} 
          className="px-4 py-2 border rounded-md">
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
           
            className="px-4 py-2 bg-indigo-600 text-white rounded-md disabled:opacity-60"
          >
            {/* {isSubmitting ? "Saving..." : "Save as Draft"} */}
            Save as Draft
          </button>
          
          
        </div>

      </CardContent>
    </Card>
  );
}