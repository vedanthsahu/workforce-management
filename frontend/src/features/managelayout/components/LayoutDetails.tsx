"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function LayoutDetails() {
  return (
    <Card className="h-full">

      <CardContent className="p-4 space-y-5">

        {/* ---------------- HEADER ---------------- */}
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-sm">Layout Details</h2>

          <Button variant="outline" size="sm">
            Edit
          </Button>
        </div>

        {/* ---------------- BASIC INFO ---------------- */}
        <div className="text-sm space-y-2">
          <p className="font-medium">8th Floor Layout</p>

          <p className="text-gray-500 text-xs">
            Main work floor with cabins, meeting rooms and collaboration area.
          </p>
        </div>

        {/* ---------------- STATS GRID ---------------- */}
        <div className="grid grid-cols-2 gap-4 text-sm">

          <div>
            <p className="text-gray-500">Total Seats</p>
            <p className="font-semibold">48</p>
          </div>

          <div>
            <p className="text-gray-500">Bookable Seats</p>
            <p className="font-semibold text-green-600">42</p>
          </div>

          <div>
            <p className="text-gray-500">Blocked Seats</p>
            <p className="font-semibold text-red-500">2</p>
          </div>

          <div>
            <p className="text-gray-500">Amenities Count</p>
            <p className="font-semibold">0</p>
          </div>

        </div>

        {/* ---------------- LAYOUT FILE ---------------- */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Layout File</p>

          <div className="border rounded-md p-2 flex justify-between items-center text-sm">

            <span className="truncate">
              BGM_HQ_Floor8_v1.png
            </span>

            <Button variant="ghost" size="sm">
              ⬇
            </Button>

          </div>
        </div>

        {/* ---------------- QUICK ACTIONS ---------------- */}
        <div className="space-y-2">

          <p className="text-sm font-medium">Quick Actions</p>

          <Button variant="outline" className="w-full">
            Edit Layout
          </Button>

          <Button variant="outline" className="w-full">
            Manage Seats
          </Button>

          <Button variant="outline" className="w-full">
            Manage Amenities
          </Button>

          <Button
            variant="outline"
            className="w-full border-red-300 text-red-500"
          >
            Manage Blocked Areas
          </Button>

        </div>

        {/* ---------------- PUBLISH BUTTON ---------------- */}
        <Button className="w-full bg-indigo-600 text-white">
          Publish Layout
        </Button>

      </CardContent>
    </Card>
  );
}