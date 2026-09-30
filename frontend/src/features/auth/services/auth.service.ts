import { axiosInstance } from "@/lib/http/axios";
import type { User } from "../types/auth.types";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const authService = {
  // Single entry point for both SSO flows -- the login API itself, nothing
  // separate. The backend reads the email's domain (there's one single
  // deployed frontend -- no separate sgxdev/solugenix URLs) and decides
  // server-side whether to send the browser into the direct Microsoft
  // OAuth flow or apps.solugenix.com's SSO gateway (see GATEWAY_SSO_HOSTNAME
  // in backend/core/config.py) -- the frontend has no routing logic of its own.
  login(email: string): void {
    window.location.href = `${BACKEND_URL}/auth/login?email=${encodeURIComponent(email)}`;
  },

  // Backend reads httpOnly cookie and returns user
  async getMe(): Promise<User> {
    const { data } = await axiosInstance.get<User>("/auth/me");
    return data;
  },

  // Backend clears access_token + refresh_token cookies
  async logout(): Promise<void> {
    await axiosInstance.post("/auth/logout");
  },
};