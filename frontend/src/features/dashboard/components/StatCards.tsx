"use client";

import { ArrowDown, ArrowUp, CalendarDays, TrendingUp, Trophy, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardsProps = {
  daysInOffice: number;
  trend: number;
  teamInOffice: number;
  officeVisitsThisYear: number;
  teamRank: number;
};

const rankSuffix = (n: number) => (n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th");

export function StatCards({
  daysInOffice,
  trend,
  teamInOffice,
  officeVisitsThisYear,
  teamRank,
}: StatCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <div className="group bg-white border border-blue-100 rounded-2xl p-3 relative overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 to-transparent" />
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Days in office</p>
          <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors duration-200">
            <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
          </div>
        </div>
        <p className="text-[24px] font-bold text-gray-900 leading-none">
          {daysInOffice}<span className="text-[12px] font-normal text-gray-400 ml-1">/mo</span>
        </p>
        <p className="text-[10.5px] text-gray-400 mt-1">this month</p>
        {trend !== 0 && (
          <div className={cn("inline-flex items-center gap-1 mt-1.5 text-[10.5px] font-medium px-1.5 py-0.5 rounded-md", trend > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500")}>
            {trend > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            <span>{Math.abs(trend)} vs last</span>
          </div>
        )}
      </div>

      <div className="group bg-white border border-emerald-100 rounded-2xl p-3 relative overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 animate-fade-in-up" style={{ animationDelay: "160ms" }}>
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-transparent" />
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Team present</p>
          <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-200 transition-colors duration-200">
            <Users className="w-3.5 h-3.5 text-emerald-600" />
          </div>
        </div>
        <p className="text-[24px] font-bold text-gray-900 leading-none">{teamInOffice}</p>
        <p className="text-[10.5px] text-gray-400 mt-1">in office today</p>
        <div className="inline-flex items-center gap-1.5 mt-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          <span className="text-[10px] text-emerald-500 font-medium">Live</span>
        </div>
      </div>

      <div className="group bg-white border border-violet-100 rounded-2xl p-3 relative overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 animate-fade-in-up col-span-2 sm:col-span-1" style={{ animationDelay: "200ms" }}>
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 to-transparent" />
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Office visits</p>
          <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center shrink-0 group-hover:bg-violet-200 transition-colors duration-200">
            <TrendingUp className="w-3.5 h-3.5 text-violet-500" />
          </div>
        </div>
        <p className="text-[24px] font-bold text-gray-900 leading-none">
          {officeVisitsThisYear}<span className="text-[12px] font-normal text-gray-400 ml-1">this year</span>
        </p>
        <div className="mt-2 bg-indigo-600 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-[13px] font-bold text-white">#{teamRank}</span>
            <span className="text-[10px] text-violet-300">team rank</span>
          </div>
          <div className="flex items-center gap-1">
            <Trophy className="w-3 h-3 text-violet-300" />
            <span className="text-[10px] text-violet-300">{teamRank}{rankSuffix(teamRank)} place</span>
          </div>
        </div>
      </div>
    </div>
  );
}
