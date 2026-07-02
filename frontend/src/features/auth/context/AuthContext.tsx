"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { authService } from "../services/auth.service";
import type { AuthContextType, User } from "../types/auth.types";

type UserState = User | null | undefined;

const AuthContext = createContext<AuthContextType | null>(null);

// Routes where the /me fetch is skipped entirely (truly public pages)
const SKIP_AUTH_ROUTES = ["/login", "/auth/callback"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();

  const [user,         setUser]         = useState<UserState>(undefined);
  const [isLoading,    setIsLoading]    = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const didInitialCheck = useRef(false);

  // ── Initial auth check — runs once on mount ──────────────────────────────
  useEffect(() => {
    if (didInitialCheck.current) return;
    didInitialCheck.current = true;

    // Only skip /me for truly public pages (login, callback)
    // NOT for "/" — the root page needs /me to know where to send the user
    if (SKIP_AUTH_ROUTES.includes(pathname)) {
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

  // ── Listen for refresh lifecycle events from axios ────────────────────────
  useEffect(() => {
    const onRefreshStart = () => setIsRefreshing(true);

    const onRefreshEnd = (e: Event) => {
      const success = (e as CustomEvent<{ success: boolean }>).detail?.success;
      setIsRefreshing(false);
      if (!success) setUser(null);
    };

    window.addEventListener("auth:refresh-start", onRefreshStart);
    window.addEventListener("auth:refresh-end",   onRefreshEnd as EventListener);

    return () => {
      window.removeEventListener("auth:refresh-start", onRefreshStart);
      window.removeEventListener("auth:refresh-end",   onRefreshEnd as EventListener);
    };
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await authService.logout().catch(() => {});
    setUser(null);
    router.replace("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user:            user ?? null,
        // isLoading is true until /me resolves AND user state is set.
        // This prevents any layout from rendering before we know who the user is.
        isLoading:       isLoading || user === undefined,
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