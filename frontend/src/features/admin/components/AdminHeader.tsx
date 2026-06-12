"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
};

export default function AdminHeader({ selectedDate, setSelectedDate }: Props) {
  return (
    <div className="flex items-center justify-between">

      {/* LEFT */}
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your workspace
        </p>
      </div>

      {/* RIGHT FILTERS */}
      <div className="flex items-center gap-3">

        {/* Date */}
        <Label className="flex items-center gap-2 h-9 px-3 rounded-md border bg-white text-sm">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-7 w-auto border-0 p-0 shadow-none focus-visible:ring-0"
          />
          Filter by date
        </Label>

      </div>
    </div>
  );
}