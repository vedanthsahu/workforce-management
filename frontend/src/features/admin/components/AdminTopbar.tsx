"use client";

import { Bell } from "lucide-react";

export default function AdminTopbar() {
  return (
    <div className="h-16  bg-white border-b flex items-center justify-end  px-6">

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-6">

        {/* NOTIFICATION */}
        <div className="relative">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
        </div>

        {/* USER */}
        <div className="flex items-center gap-3 cursor-pointer">

          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-white font-medium">
            C
          </div>

          {/* Name + Role */}
          <div className="text-sm">
            <p className="font-medium">Chandana Gowda</p>
            <p className="text-xs text-muted-foreground">
              Admin
            </p>
          </div>

          {/* Dropdown arrow */}
          <span className="text-xs">▼</span>

        </div>

      </div>
    </div>
  );
}