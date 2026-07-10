"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchAllTeamGroups, fetchUserTodayBooking } from "../services/findteammate.service";
import type { ApiTeamGroup, ApiTeamMember, SearchPhase, TeammateResult } from "../types/findteammate.types";
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

  // Shared logic: fetch booking for a member and build a TeammateResult
  const resolveTeammate = useCallback(
    async (member: ApiTeamMember, teamName: string): Promise<TeammateResult> => {
      const booking = member.has_booking_today
        ? await fetchUserTodayBooking(member.user_id)
        : null;
      return {
        userId: member.user_id,
        name: member.full_name,
        email: member.email,
        teamName,
        inOfficeToday: member.has_booking_today,
        seatCode: member.seat?.seat_code ?? booking?.seat_code ?? null,
        booking,
      };
    },
    []
  );

  // Triggered by clicking Search button or pressing Enter
  const handleSearch = useCallback(async () => {
    const q = query.trim().toLowerCase();
    if (!q) return;

    setPhase({ status: "searching" });

    let found: { member: ApiTeamMember; teamName: string } | null = null;
    for (const group of visibleTeamGroups) {
      for (const member of group.members) {
        if (
          member.full_name.toLowerCase().includes(q) ||
          member.email.toLowerCase().includes(q)
        ) {
          found = { member, teamName: group.team_name };
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      setPhase({ status: "not_found", query });
      return;
    }

    try {
      const result = await resolveTeammate(found.member, found.teamName);
      setPhase({ status: "done", result, searchedAt: new Date() });
    } catch {
      setPhase({ status: "error", message: "Failed to load seat details. Please try again." });
    }
  }, [query, teamGroups, resolveTeammate]);

  // Triggered by clicking a member row in the team overview
  const selectMember = useCallback(
    async (member: ApiTeamMember, teamName: string) => {
      setQuery(member.full_name);
      setPhase({ status: "searching" });
      try {
        const result = await resolveTeammate(member, teamName);
        setPhase({ status: "done", result, searchedAt: new Date() });
      } catch {
        setPhase({ status: "error", message: "Failed to load seat details. Please try again." });
      }
    },
    [resolveTeammate]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setPhase({ status: "idle" });
  }, []);

  return { query, setQuery, phase, handleSearch, handleClear, selectMember, teamGroups: visibleTeamGroups, teamsLoading };
}