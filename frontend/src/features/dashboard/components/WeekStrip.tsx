"use client";

import { cn } from "@/lib/utils";
import type { WeekDay } from "../types/dashboard.types";

type WeekStripProps = {
  days: WeekDay[];
};

export function WeekStrip({ days }: WeekStripProps) {
  const todayIdx = days.findIndex((d) => d.isToday);

  return (
    <div
      className="bg-white border border-gray-100 rounded-2xl px-3 py-3 flex items-center gap-2 overflow-x-auto scrollbar-none shadow-sm animate-fade-in-up"
      style={{ animationDelay: "60ms" }}
    >
      {days.map((day, idx) => {
        const isAdjacent = todayIdx !== -1 && Math.abs(idx - todayIdx) === 1;
        return (
          <div
            key={`${day.dayLabel}-${day.date}`}
            className={cn(
              "flex flex-col items-center justify-center flex-1 min-w-[44px] h-[64px] rounded-xl transition-all duration-200 select-none gap-1 border-2 hover:scale-[1.04] active:scale-[0.97]",
              day.isToday
                ? "bg-indigo-600 border-indigo-500 shadow-md shadow-indigo-200"
                : isAdjacent
                ? "bg-gray-50 border-emerald-200 hover:border-emerald-300"
                : "bg-gray-50 border-transparent hover:bg-gray-100 hover:border-gray-200"
            )}
          >
            <span className={cn("text-[9px] font-semibold uppercase tracking-wider leading-none", day.isToday ? "text-indigo-200" : "text-gray-400")}>
              {day.isToday ? "Today" : day.dayLabel}
            </span>
            <span className={cn("text-[16px] font-bold leading-none", day.isToday ? "text-white" : "text-gray-700")}>
              {day.date}
            </span>
            <span className={cn("w-[5px] h-[5px] rounded-full transition-colors", day.hasBooking ? "bg-emerald-400" : "bg-red-300")} />
          </div>
        );
      })}
    </div>
  );
}
