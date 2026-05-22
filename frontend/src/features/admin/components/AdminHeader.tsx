"use client";

import { Calendar } from "lucide-react";
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

        {/* Offices Dropdown */}
        {/* <select className="h-9 px-3 rounded-md border bg-white text-sm">
          <option>All Offices</option>
        </select> */}

        {/* Floors Dropdown */}
        {/* <select className="h-9 px-3 rounded-md border bg-white text-sm">
          <option>All Floors</option>
        </select> */}

        {/* Date */}
        <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-white text-sm">
         
          <input
  type="date"
  value={selectedDate}
  onChange={(e) => setSelectedDate(e.target.value)}
/> Filter by date
        </div>

      </div>
    </div>
  );
}