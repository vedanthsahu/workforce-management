"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { TeamMember } from "../types/dashboard.types";

type TeamInOfficeProps = {
  members: TeamMember[];
  inOfficeCount: number;
  remoteCount: number;
  canViewTeammates: boolean;
  canBookSelf: boolean;
};

export function TeamInOffice({
  members,
  inOfficeCount,
  remoteCount,
  canViewTeammates,
  canBookSelf,
}: TeamInOfficeProps) {
  if (!canViewTeammates) return null;

  const floorCounts: Record<string, number> = {};
  for (const m of members) {
    if (m.floor && m.floor !== "—") floorCounts[m.floor] = (floorCounts[m.floor] ?? 0) + 1;
  }
  const topFloor = Object.entries(floorCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <p className="text-[12.5px] font-semibold text-gray-900">Team in office today</p>
        <span className="text-[11px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
          {inOfficeCount} in · {remoteCount} remote
        </span>
      </div>
      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {members.length === 0 ? (
          <p className="text-[11px] text-gray-400 col-span-2 px-1 py-2">No teammates in office today.</p>
        ) : (
          members.map((m, i) => (
            <div
              key={m.id}
              className="flex items-center gap-2.5 bg-gray-50 rounded-xl px-2.5 py-2 border border-transparent hover:bg-gray-100 hover:border-gray-200 hover:-translate-y-0.5 hover:shadow-sm active:scale-[0.98] transition-all duration-200 cursor-default group animate-fade-in-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <Avatar size="sm" className="ring-2 ring-white group-hover:ring-gray-200 group-hover:scale-105 transition-all duration-200">
                <AvatarFallback
                  className="font-bold"
                  style={{ backgroundColor: m.avatarColor || "#E8E8E8", color: "#555" }}
                >
                  {m.initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-[11.5px] font-medium text-gray-800 leading-tight truncate">{m.name}</p>
                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                  {m.floor && m.floor !== "—" && (
                    <span className="text-[10px] text-gray-400 leading-tight">{m.floor}</span>
                  )}
                  {m.floor && m.floor !== "—" && m.seatCode && (
                    <span className="text-[10px] text-gray-300">·</span>
                  )}
                  {m.seatCode && (
                    <span className="text-[10px] text-gray-400 leading-tight">{m.seatCode}</span>
                  )}
                  {!m.floor && !m.seatCode && (
                    <span className="text-[10px] text-gray-400 leading-tight">—</span>
                  )}
                </div>
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            </div>
          ))
        )}
      </div>
      {topFloor && (
        <div className="px-4 pb-3">
          <p className="text-[10.5px] text-gray-400">
            Most of your team is on{" "}
            <span className="text-indigo-600 font-medium">{topFloor}</span> today.{" "}
            {canBookSelf && (
              <Link
                href="" 
                // "/find-teammates"   in future we can link to a page that shows the floor and seat of teammates in office
                className="text-indigo-600 hover:underline hover:text-indigo-800 transition-colors"
                title="Comming soon "
              >
                Book nearby →
              </Link>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
