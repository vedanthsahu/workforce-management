"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function LayoutGuidelines() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">
          Guidelines
        </CardTitle>
      </CardHeader>

      <CardContent>
        <ul className="list-disc pl-4 space-y-2 text-sm text-muted-foreground">
          <li>Upload SVG file exported from design tools</li>
          <li>Ensure layout scale is accurate and consistent</li>
          <li>All seats and areas will be automatically detected</li>
          <li>You can edit and map seats after upload</li>
          <li>Layout will be saved as Draft initially</li>
        </ul>
      </CardContent>
    </Card>
  );
}