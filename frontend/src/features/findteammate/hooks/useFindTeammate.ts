"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchAllTeamGroups, searchTeamMembers, fetchTeamMemberById } from "../services/findteammate.service";
import type { ApiTeamGroup, ApiTeamMember, RawTeammateBooking, SearchPhase, TeammateResult } from "../types/findteammate.types";
import { useAuthContext } from "@/features/auth/context/AuthContext";

// In-office members first; within each group (in-office / remote), sort alphabetically by name
function sortMembers(members: ApiTeamMember[]): ApiTeamMember[] {
  return [...members].sort((a, b) => {
    if (a.has_booking_today !== b.has_booking_today) {
      return a.has_booking_today ? -1 : 1;
    }
    return a.full_name.localeCompare(b.full_name, undefined, { sensitivity: "base" });
  });
}

function buildResult(member: ApiTeamMember, teamName: string): TeammateResult {
  const s = member.seat;
  const booking: RawTeammateBooking | null = s
    ? {
      booking_id: null,
      booking_date: null,
      booking_status: null,
      seat_id: s.seat_id,
      seat_code: s.seat_code,
      floor_id: s.floor_id,
      floor_name: s.floor_name,
      building_id: s.building_id,
      building_name: s.building_name,
      site_name: null,
      check_in_at: null,
      checked_out_at: null,
      start_time: "09:00:00",
      end_time: "18:00:00",
      source_channel: s.source_channel,
      desk_type: s.seat_type,
      amenities: s.amenities.map((a) => a.name),
    }
    : null;
  return {
    userId: member.user_id,
    name: member.full_name,
    email: member.email,
    teamName,
    inOfficeToday: member.has_booking_today,
    seatCode: s?.seat_code ?? null,
    booking,
  };
}

export function useFindTeammate() {
  const { user } = useAuthContext();

  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<SearchPhase>({ status: "idle" });
  const [teamGroups, setTeamGroups] = useState<ApiTeamGroup[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);

  useEffect(() => {
    fetchAllTeamGroups()
      .then(setTeamGroups)
      .catch(() => setTeamGroups([]))
      .finally(() => setTeamsLoading(false));
  }, []);

  // Exclude the current user from every group's member list, then sort:
  // in-office members first, rest sorted by name
  const visibleTeamGroups = useMemo(() => {
    const uid = user?.user_id;
    return teamGroups.map((g) => {
      const members = sortMembers(
        uid ? g.members.filter((m) => m.user_id !== uid) : g.members
      );
      return {
        ...g,
        members,
        total_members: members.length,
        booked_today_count: members.filter((m) => m.has_booking_today).length,
      };
    });
  }, [teamGroups, user?.user_id]);

  // Triggered by clicking Search button or pressing Enter — uses the search API
  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;

    setPhase({ status: "searching" });

    try {
      const results = await searchTeamMembers(q);

      if (!results.length) {
        setPhase({ status: "not_found", query });
        return;
      }

      const { user_id } = results[0];

      // Try to find the full member (with seat data) in already-loaded groups
      let member: ApiTeamMember | undefined;
      let teamName = "";
      for (const g of visibleTeamGroups) {
        const m = g.members.find((mem) => mem.user_id === user_id);
        if (m) { member = m; teamName = g.team_name; break; }
      }

      // Not in current page — fetch directly from teams API
      if (!member) {
        const groups = await fetchTeamMemberById(user_id);
        if (groups.length && groups[0].members.length) {
          member = groups[0].members[0];
          teamName = groups[0].team_name;
        }
      }

      if (!member) {
        setPhase({ status: "not_found", query });
        return;
      }

      setPhase({ status: "done", result: buildResult(member, teamName), searchedAt: new Date() });
    } catch {
      setPhase({ status: "error", message: "Failed to load seat details. Please try again." });
    }
  }, [query, visibleTeamGroups]);

  // Triggered by clicking a member row — all data already available, no API call needed
  const selectMember = useCallback((member: ApiTeamMember, teamName: string) => {
    setQuery(member.full_name);
    setPhase({ status: "done", result: buildResult(member, teamName), searchedAt: new Date() });
  }, []);

  const handleQueryChange = useCallback((q: string) => {
    setQuery(q);
    setPhase((prev) =>
      prev.status === "idle" || prev.status === "not_found" ? prev : { status: "idle" }
    );
  }, []);

  const handleClear = useCallback(() => {
    setQuery("");
    setPhase({ status: "idle" });
  }, []);

  return { query, setQuery: handleQueryChange, phase, handleSearch, handleClear, selectMember, teamGroups: visibleTeamGroups, teamsLoading };
}