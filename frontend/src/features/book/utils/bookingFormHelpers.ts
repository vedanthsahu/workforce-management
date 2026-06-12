import React from "react";
import { MonitorDot, Star, UtensilsCrossed, Waves, Wind } from "lucide-react";

export function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getPreferenceIcon(key: string): React.ReactNode {
  switch (key) {
    case "window":      return React.createElement(Wind, { size: 20, className: "text-green-500" });
    case "cafeteria":   return React.createElement(UtensilsCrossed, { size: 20, className: "text-orange-400" });
    case "elevator":    return React.createElement(Waves, { size: 20, className: "text-violet-500" });
    case "dualMonitor": return React.createElement(MonitorDot, { size: 20, className: "text-blue-500" });
    default:            return React.createElement(Star, { size: 20, className: "text-gray-400" });
  }
}
