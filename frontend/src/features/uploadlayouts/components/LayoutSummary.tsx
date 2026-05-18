"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type Props = {
  formData: {
    site: string;
    building: string;
    floor: string;
    layoutName: string;
  };
};

export default function LayoutSummary({ formData }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">
          Layout Summary (Preview)
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 text-sm">

        <div className="flex justify-between">
          <span className="text-muted-foreground">Site</span>
          <span>{formData.site || "-"}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Building</span>
          <span>{formData.building || "-"}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Floor</span>
          <span>{formData.floor || "-"}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Layout Name</span>
          <span>{formData.layoutName || "-"}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Version</span>
          <span>1.0 (New)</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Status</span>
          <span className="text-yellow-600 bg-yellow-100 px-2 py-1 rounded-md text-xs">
            DRAFT
          </span>
        </div>

      </CardContent>
    </Card>
  );
}