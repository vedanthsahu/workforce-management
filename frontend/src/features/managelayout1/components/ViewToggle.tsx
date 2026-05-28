"use client";

import React from "react";
import { Map, List } from "lucide-react";
import { ViewMode } from "../types/seat.types";

interface Props {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
}

export default function ViewToggle({ view, onChange }: Props) {
  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
      {(["map", "list"] as ViewMode[]).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
            view === v
              ? "bg-white text-indigo-600 shadow-sm border border-gray-200"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {v === "map" ? <Map size={13} /> : <List size={13} />}
          {v === "map" ? "Map view" : "List view"}
        </button>
      ))}
    </div>
  );
}