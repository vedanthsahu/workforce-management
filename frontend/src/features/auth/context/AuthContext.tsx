

"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authService } from "../services/auth.service";
import type { AuthContextType, User } from "../types/auth.types";

type UserState = User | null | undefined;

const AuthContext = createContext<AuthContextType | null>(null);

const PUBLIC_ROUTES = ["/login", "/auth/callback"];
const ROOT_ROUTE    = "/";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();

  const [user,         setUser]         = useState<UserState>(undefined);
  const [isLoading,    setIsLoading]    = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const didInitialCheck = useRef(false);

  // ── Initial auth check — runs once on mount only ─────────────────────────
  useEffect(() => {
    if (didInitialCheck.current) return;
    didInitialCheck.current = true;

    if (PUBLIC_ROUTES.includes(pathname)) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    authService
      .getMe()
      .then((u) => {
        setUser(u);
      })
      .catch((err) => {
        const status         = err?.response?.status;
        const isNetworkError = !err?.response;

        if (isNetworkError) {
          setUser((prev) => prev);
        } else if (status === 401) {
          // Interceptor owns the refresh + redirect for 401.
          // Do not clear user here — it would race the interceptor.
          setUser((prev) => prev);
        } else if (status === 403) {
          setUser(null);
        } else {
          setUser((prev) => prev);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Listen for refresh lifecycle events from axios.ts ────────────────────
  useEffect(() => {
    const onRefreshStart = () => {
      setIsRefreshing(true);
    };

    const onRefreshEnd = (e: Event) => {
      const success = (e as CustomEvent<{ success: boolean }>).detail?.success;
      setIsRefreshing(false);
      if (!success) {
        setUser(null);
      }
    };

    window.addEventListener("auth:refresh-start", onRefreshStart);
    window.addEventListener("auth:refresh-end",   onRefreshEnd as EventListener);

    return () => {
      window.removeEventListener("auth:refresh-start", onRefreshStart);
      window.removeEventListener("auth:refresh-end",   onRefreshEnd as EventListener);
    };
  }, []);

  // ── Redirect guard ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading || isRefreshing || user === undefined) return;

    if (pathname === ROOT_ROUTE) {
      router.replace(user ? "/dashboard" : "/login");
      return;
    }

    if (user && PUBLIC_ROUTES.includes(pathname)) {
      router.replace("/dashboard");
      return;
    }

    if (user === null && !PUBLIC_ROUTES.includes(pathname)) {
      router.replace("/login");
      return;
    }
  }, [isLoading, isRefreshing, user, pathname, router]);

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await authService.logout().catch(() => {});
    setUser(null);
    router.replace("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        isAuthenticated: !!user,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used inside AuthProvider");
  return ctx;
}