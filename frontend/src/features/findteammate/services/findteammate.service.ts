import { axiosInstance } from "@/lib/http/axios";
import type { ApiTeamGroup, TeammateSearchResult } from "../types/findteammate.types";

export async function fetchAllTeamGroups(): Promise<ApiTeamGroup[]> {
  const { data } = await axiosInstance.get<ApiTeamGroup[]>("/teams/me");
  return data;
}

export async function searchTeamMembers(q: string): Promise<TeammateSearchResult[]> {
  const { data } = await axiosInstance.get<TeammateSearchResult[]>("/teams/members/search", {
    params: { q },
  });
  return data;
}

export async function fetchTeamMemberById(userId: string): Promise<ApiTeamGroup[]> {
  const { data } = await axiosInstance.get<ApiTeamGroup[]>("/teams/me", {
    params: { user_id: userId },
  });
  return data;
}
