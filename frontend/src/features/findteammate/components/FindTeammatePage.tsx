"use client";

import { useRef, useEffect, useState } from "react";
import {
  Search, X, MapPin, Users,
  AlertCircle, UserX, Info, CheckCircle2, Monitor, Wifi, Zap, Armchair,
} from "lucide-react";
import { useFindTeammate } from "../hooks/useFindTeammate";
import { FindTeammateSkeleton } from "./FindTeammateSkeleton";
import type { ApiTeamGroup, ApiTeamMember, RawTeammateBooking, TeammateResult } from "../types/findteammate.types";
import { getAmenityColor } from "@/features/amenities/utils/amenityColors";
import { amenitiesService } from "@/features/amenities/services/amenitiesService";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

const AVATAR_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
  "#14b8a6", "#0ea5e9", "#f97316", "#10b981",
];

function avatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}


function formatSearchedAt(date: Date): string {
  return (
    date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) +
    ", " +
    date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
}

function AmenityIcon({ name }: { name: string }) {
  const l = name.toLowerCase();
  if (l.includes("monitor") || l.includes("screen")) return <Monitor className="w-3.5 h-3.5" />;
  if (l.includes("wifi") || l.includes("internet")) return <Wifi className="w-3.5 h-3.5" />;
  if (l.includes("power") || l.includes("outlet")) return <Zap className="w-3.5 h-3.5" />;
  if (l.includes("chair") || l.includes("adjust")) return <Armchair className="w-3.5 h-3.5" />;
  return <CheckCircle2 className="w-3.5 h-3.5" />;
}

// ── Shared atoms ──────────────────────────────────────────────────────────────

function MemberAvatar({ name, userId, size = "md" }: { name: string; userId: string; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-8 h-8 text-[11px]" : "w-[52px] h-[52px] text-[14px]";
  return (
    <div
      className={`${dim} rounded-full flex items-center justify-center shrink-0 font-bold text-white`}
      style={{ backgroundColor: avatarColor(userId) }}
    >
      {getInitials(name)}
    </div>
  );
}

function InOfficeBadge({ inOffice }: { inOffice: boolean }) {
  return inOffice ? (
    <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      In Office
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
      Remote
    </span>
  );
}

// ── Team overview (idle state) ────────────────────────────────────────────────

function TeamOverviewSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[0, 1].map((i) => (
        <div key={i} className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#EBEBF5] flex items-center gap-3">
            <div className="h-4 bg-gray-200 rounded w-32" />
            <div className="h-4 bg-gray-100 rounded w-20 ml-auto" />
          </div>
          {[0, 1, 2].map((j) => (
            <div key={j} className="flex items-center gap-3 px-4 py-3 border-b border-[#EBEBF5]/60 last:border-0">
              <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-gray-200 rounded w-36" />
                <div className="h-2.5 bg-gray-100 rounded w-48" />
              </div>
              <div className="h-5 bg-gray-100 rounded-full w-16" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function TeamGroupCard({
  group,
  onSelectMember,
}: {
  group: ApiTeamGroup;
  onSelectMember: (member: ApiTeamMember, teamName: string) => void;
}) {
  const inOfficeCount = group.members.filter((m) => m.has_booking_today).length;

  return (
    <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden shadow-sm">
      {/* Team header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#EBEBF5] bg-gray-50/50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <p className="text-[13px] font-semibold text-gray-800">{group.team_name}</p>
        </div>
        {/* <div className="flex items-center gap-2">
          <span className="text-[11px] text-emerald-600 font-medium bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
            {inOfficeCount} in office
          </span>
          <span className="text-[11px] text-gray-400">
            {group.total_members} members
          </span>
        </div> */}
      </div>

      {/* Members */}
      {group.members.length === 0 ? (
        <p className="px-4 py-4 text-[12px] text-gray-400">No members in this team.</p>
      ) : (
        <div className="divide-y divide-[#EBEBF5]/70">
          {group.members.map((member) => (
            <button
              key={member.user_id}
              onClick={() => onSelectMember(member, group.team_name)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left group"
            >
              <MemberAvatar name={member.full_name} userId={member.user_id} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-800 leading-tight truncate group-hover:text-indigo-600 transition-colors">
                  {member.full_name}
                </p>
                <p className="text-[11.5px] text-gray-400 truncate mt-0.5">{member.email}</p>
              </div>
              <div className="shrink-0 flex items-center gap-3">
                <div className="w-[82px] flex justify-end">
                  <InOfficeBadge inOffice={member.has_booking_today} />
                </div>
                <div className="w-[116px] flex justify-end">
                  {member.seat?.seat_code ? (
                    <span className="text-[10.5px] text-gray-400 font-mono">
                      {member.seat.seat_code}
                    </span>
                  ) : (
                    <span className="text-[10.5px] text-amber-500 italic">No seat booked</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamOverview({
  groups,
  onSelectMember,
}: {
  groups: ApiTeamGroup[];
  onSelectMember: (member: ApiTeamMember, teamName: string) => void;
}) {
  const totalMembers = groups.reduce((acc, g) => acc + g.total_members, 0);
  const totalInOffice = groups.reduce((acc, g) => acc + g.booked_today_count, 0);
  const totalRemote = totalMembers - totalInOffice;

  if (groups.length === 0) {
    return (
      <div className="bg-white border border-[#EBEBF5] rounded-xl shadow-sm p-10 flex flex-col items-center gap-2 text-center">
        <Users className="w-8 h-8 text-gray-300" />
        <p className="text-[13px] font-medium text-gray-500">No team data found</p>
        <p className="text-[12px] text-gray-400">You don&apos;t appear to be part of any team yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 bg-white border border-[#EBEBF5] rounded-lg px-3 py-2 shadow-sm">
          <Users className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-[12px] font-semibold text-gray-700">{totalMembers}</span>
          <span className="text-[11.5px] text-gray-400">total members</span>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[12px] font-semibold text-emerald-700">{totalInOffice}</span>
          <span className="text-[11.5px] text-emerald-600">in office today</span>
        </div>
        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <span className="w-2 h-2 rounded-full bg-amber-300" />
          <span className="text-[12px] font-semibold text-amber-600">{totalRemote}</span>
          <span className="text-[11.5px] text-amber-600">remote</span>
        </div>
      </div>

      {/* Team cards */}
      {groups.map((group) => (
        <TeamGroupCard key={group.team_id} group={group} onSelectMember={onSelectMember} />
      ))}

      <p className="text-[11px] text-gray-400 text-center pb-2">
        Click any teammate to view their seat details
      </p>
    </div>
  );
}

// ── Result card ───────────────────────────────────────────────────────────────

function StatusCard({ inOffice, booking }: { inOffice: boolean; booking: RawTeammateBooking | null }) {
  return (
    <div className={`rounded-xl border px-4 py-3.5 min-w-[190px] ${inOffice ? "bg-emerald-50/60 border-emerald-200" : "bg-gray-50 border-[#EBEBF5]"}`}>
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 className={`w-3.5 h-3.5 ${inOffice ? "text-emerald-500" : "text-gray-400"}`} />
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Status Today</span>
      </div>
      {inOffice ? (
        <>
          <p className="text-[13px] font-bold text-emerald-700 flex items-center gap-1.5">
            Available in Office
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
          </p>
          <p className="text-[11.5px] text-emerald-600 mt-0.5">
            {booking ? "Booked a seat for today" : "Checked in today"}
          </p>
        </>
      ) : (
        <>
          <p className="text-[13px] font-bold text-gray-600">Not in Office</p>
          <p className="text-[11.5px] text-gray-400 mt-0.5">No booking for today</p>
        </>
      )}
    </div>
  );
}

function formatTime(t: string | null): string {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function SeatDetailsGrid({ booking }: { booking: RawTeammateBooking }) {
  const [categoryByName, setCategoryByName] = useState<Map<string, string | null>>(new Map());

  useEffect(() => {
    amenitiesService.getPreferences()
      .then((res) => {
        setCategoryByName(new Map(res.amenities.map((a) => [a.name.toLowerCase(), a.category])));
      })
      .catch(() => {});
  }, []);

  const cells: { label: string; value: React.ReactNode }[] = [
    { label: "Building", value: booking.building_name ?? "—" },
    { label: "Floor", value: booking.floor_name ?? "—" },
    { label: "Seat Number", value: booking.seat_code ?? "—" },
    { label: "Booking Source", value: booking.source_channel ?? "—" },
    { label: "Start Time", value: formatTime(booking.start_time) },
    { label: "End Time", value: formatTime(booking.end_time) },
    { label: "Desk Type", value: booking.desk_type ?? "—" },
    {
      label: "Amenities",
      value: booking.amenities?.length ? (
        <span className="flex flex-wrap gap-1.5 mt-0.5">
          {booking.amenities.map((a) => {
            const color = getAmenityColor(a, categoryByName.get(a.toLowerCase()));
            return (
              <span key={a} className={`inline-flex items-center gap-1 text-[11px] font-medium rounded-md px-1.5 py-0.5 border ${color.bg} ${color.text} ${color.border}`}>
                <AmenityIcon name={a} />
                {a}
              </span>
            );
          })}
        </span>
      ) : "—",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-5">
      {cells.map(({ label, value }) => (
        <div key={label}>
          <p className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
          <div className="text-[13px] font-semibold text-gray-800">{value}</div>
        </div>
      ))}
    </div>
  );
}

function ResultCard({ result, searchedAt, onBack }: { result: TeammateResult; searchedAt: Date; onBack: () => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-gray-700">Search Result</h2>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-gray-400">Searched on: {formatSearchedAt(searchedAt)}</span>
          <button
            onClick={onBack}
            className="text-[11.5px] text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            ← Back to teams
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden shadow-sm">
        {/* Profile row */}
        <div className="p-5 flex flex-col sm:flex-row gap-5">
          <div className="flex gap-4 flex-1 min-w-0">
            <MemberAvatar name={result.name} userId={result.userId} />
            <div className="min-w-0 pt-0.5">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <h3 className="text-[15px] font-bold text-[#0f172a] leading-tight">{result.name}</h3>
                <InOfficeBadge inOffice={result.inOfficeToday} />
              </div>
              <p className="text-[12px] text-gray-500">{result.teamName}</p>
              <div className="mt-2.5 flex flex-col gap-1">
                <p className="text-[12.5px] text-gray-500 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0018 4H2a2 2 0 00-.003 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  {result.email}
                </p>
              </div>
            </div>
          </div>
          <div className="sm:shrink-0">
            <StatusCard inOffice={result.inOfficeToday} booking={result.booking} />
          </div>
        </div>

        {result.inOfficeToday && result.booking && (
          <>
            <div className="border-t border-[#EBEBF5] mx-5" />
            <div className="p-5">
              <p className="text-[12.5px] font-semibold text-gray-700 flex items-center gap-1.5 mb-4">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                Seat Details
              </p>
              <SeatDetailsGrid booking={result.booking} />
              <p className="mt-4 text-[11px] text-gray-400 flex items-center gap-1.5">
                <Info className="w-3 h-3 shrink-0" />
                Availability is based on today&apos;s booking.
              </p>
            </div>
          </>
        )}
      </div>

      <p className="text-[11.5px] text-gray-400 flex items-center gap-1.5 px-0.5">
        <Info className="w-3.5 h-3.5 shrink-0" />
        If the information is incorrect, please contact your administrator.
      </p>
    </div>
  );
}

// ── Page root ─────────────────────────────────────────────────────────────────

export default function FindTeammatePage() {
  const {
    query, setQuery,
    phase, handleSearch, handleClear, selectMember,
    teamGroups, teamsLoading,
  } = useFindTeammate();

  const containerRef = useRef<HTMLDivElement>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const showSuggestions =
    dropdownOpen &&
    query.trim().length >= 1 &&
    (phase.status === "idle" || phase.status === "not_found");

  const q = query.trim().toLowerCase();
  const suggestions = showSuggestions
    ? teamGroups
      .flatMap((g) =>
        g.members
          .filter((m) => {
            const nameWords = m.full_name.toLowerCase().split(" ");
            return (
              nameWords.some((w) => w.startsWith(q)) ||
              m.email.toLowerCase().startsWith(q)
            );
          })
          .map((m) => ({ member: m, teamName: g.team_name }))
      )
      .slice(0, 6)
    : [];

  return (
    <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[#F7F8FC]">

      {/* ── Sticky header ── */}
      <div className="shrink-0 bg-[#F7F8FC] px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-4 flex flex-col gap-4">
        <div>
          <h1 className="text-[18px] sm:text-[20px] font-bold text-[#0f172a] leading-tight">Find Teammate</h1>
          <p className="text-[12px] sm:text-[12.5px] text-gray-400 mt-0.5">
            Search by name or email to see if your teammate is available in office today.
          </p>
        </div>

        {/* Search bar */}
        <div className="bg-white border border-[#EBEBF5] rounded-xl shadow-sm px-4 py-4">
          <div ref={containerRef} className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setDropdownOpen(true); }}
                onFocus={() => { if (query.trim().length >= 1) setDropdownOpen(true); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { setDropdownOpen(false); handleSearch(); }
                  else if (e.key === "Escape") { setDropdownOpen(false); }
                }}
                placeholder="Search by name or email"
                disabled={teamsLoading}
                className="w-full pl-9 pr-8 py-2 text-[13px] border border-[#EBEBF5] rounded-lg bg-[#F7F8FC] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 disabled:opacity-50 transition-all"
              />
              {query && (
                <button
                  onClick={() => { handleClear(); setDropdownOpen(false); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Autocomplete suggestions dropdown */}
              {showSuggestions && (
                <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 bg-white border border-[#EBEBF5] rounded-xl shadow-lg overflow-hidden">
                  {suggestions.length === 0 ? (
                    <p className="px-4 py-3 text-[12px] text-gray-400 text-center">
                      No teammates match &ldquo;{query}&rdquo;
                    </p>
                  ) : (
                    <ul role="listbox" className="py-1 max-h-[240px] overflow-y-auto divide-y divide-[#EBEBF5]/60">
                      {suggestions.map(({ member, teamName }) => (
                        <li key={member.user_id} role="option" aria-selected={false}>
                          <button
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setDropdownOpen(false);
                              selectMember(member, teamName);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50 transition-colors text-left"
                          >
                            <MemberAvatar name={member.full_name} userId={member.user_id} size="sm" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-gray-800 leading-tight truncate">
                                {member.full_name}
                              </p>
                              <p className="text-[11px] text-gray-400 truncate">{teamName}</p>
                            </div>
                            <InOfficeBadge inOffice={member.has_booking_today} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={handleSearch}
              disabled={!query.trim() || teamsLoading || phase.status === "searching"}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-[13px] font-semibold rounded-lg hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {phase.status === "searching"
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Search className="w-4 h-4" />
              }
              {phase.status === "searching" ? "Searching…" : "Search"}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            {teamsLoading ? "Loading team data…" : "Search by name or email — or click any teammate below"}
          </p>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8">

        {/* Searching spinner + skeleton */}
        {phase.status === "searching" && <FindTeammateSkeleton />}

        {/* Result card */}
        {phase.status === "done" && (
          <ResultCard result={phase.result} searchedAt={phase.searchedAt} onBack={handleClear} />
        )}

        {/* Not found */}
        {phase.status === "not_found" && (
          <div className="space-y-4">
            <div className="bg-white border border-[#EBEBF5] rounded-xl shadow-sm p-8 flex flex-col items-center gap-3 text-center">
              <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center">
                <UserX className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-gray-700">No teammate found</p>
                <p className="text-[12.5px] text-gray-400 mt-0.5">
                  No one matching <span className="font-medium text-gray-600">&ldquo;{phase.query}&rdquo;</span> was found in your team.
                </p>
              </div>
              <button onClick={handleClear} className="text-[12px] text-indigo-600 hover:text-indigo-800 font-medium mt-1">
                ← Back to teams
              </button>
            </div>
            {!teamsLoading && <TeamOverview groups={teamGroups} onSelectMember={selectMember} />}
          </div>
        )}

        {/* Error */}
        {phase.status === "error" && (
          <div className="bg-white border border-red-100 rounded-xl shadow-sm p-5 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-[13px] text-red-500">{phase.message}</p>
          </div>
        )}

        {/* Idle — show team overview */}
        {phase.status === "idle" && (
          teamsLoading
            ? <TeamOverviewSkeleton />
            : <TeamOverview groups={teamGroups} onSelectMember={selectMember} />
        )}
      </div>
    </main>
  );
}
