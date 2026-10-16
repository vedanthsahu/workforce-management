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
import { markSessionEstablished, clearSessionEstablished } from "@/lib/http/axios";
import { authService } from "../services/auth.service";
import type { AuthContextType, User } from "../types/auth.types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLocationTreeStore } from "@/store/useLocationTreeStore";

type UserState = User | null | undefined;

const AuthContext = createContext<AuthContextType | null>(null);

// Routes where the /me fetch is skipped entirely (truly public pages)
const SKIP_AUTH_ROUTES = ["/login", "/auth/callback"];

// Client-side caches keyed by nothing but the browser -- not by which
// account is using it. Left alone, a second person logging into the same
// browser inherits the first person's leftover UI state (e.g. Floor Layout
// Management's remembered "last viewed floor" -- see FloorLayoutsPage.tsx --
// or the office/building/floor hierarchy cached in useLocationTreeStore)
// even though it has nothing to do with their account. Cleared on every
// sign-out and session-expiry so the next login always starts clean,
// regardless of whether it's the same person or someone else, or even a
// different tenant on a shared/demo machine.
function clearPerAccountClientCache(): void {
  try {
    localStorage.removeItem("selectedLayoutFloor");
  } catch { /* private-mode/quota errors -- nothing to clean up either way */ }
  useLocationTreeStore.getState().invalidateAll();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();

  const [user,         setUser]         = useState<UserState>(undefined);
  const [isLoading,    setIsLoading]    = useState(true);
  const [, setIsRefreshing] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

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
        markSessionEstablished();
      })
      .catch((err) => {
        const status         = err?.response?.status;
        const isNetworkError = !err?.response;

        if (isNetworkError) {
          setUser((prev) => prev);
        } else if (status === 401) {
          // No valid session (and the interceptor's refresh failed). Resolve
          // user to null -- leaving it undefined keeps isLoading true forever,
          // so MainLayout never reaches its redirect to /login.
          setUser(null);
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
  // Deliberately does NOT clear `user` on a failed refresh (`success:
  // false`). The axios interceptor always dispatches "auth:refresh-end"
  // BEFORE "auth:session-expired" (see axios.ts) -- clearing `user` here
  // fired MainLayout's "no user -> redirect to /login" guard before the
  // session-expired dialog's own sessionExpired state even had a chance to
  // flip on, so the admin was already on the login page by the time the
  // dialog appeared, stacked on top of it. This was the same race the
  // session-expired handler below was already fixed for -- just reached
  // through a second, earlier-firing event this listener didn't account
  // for. `user` now only ever gets cleared in handleSessionExpiredAcknowledge,
  // together with the actual navigation.
  useEffect(() => {
    const onRefreshStart = () => setIsRefreshing(true);

    const onRefreshEnd = () => {
      setIsRefreshing(false);
    };

    window.addEventListener("auth:refresh-start", onRefreshStart);
    window.addEventListener("auth:refresh-end",   onRefreshEnd as EventListener);

    return () => {
      window.removeEventListener("auth:refresh-start", onRefreshStart);
      window.removeEventListener("auth:refresh-end",   onRefreshEnd as EventListener);
    };
  }, []);

  // ── Session-expired modal ─────────────────────────────────────────────────
  // The axios interceptor used to hard-redirect to /login the instant a
  // refresh failed, with no explanation. Now it just dispatches this event
  // and waits -- the actual navigation happens below, after the user has
  // seen why, on the same "click to proceed" pattern as the Sign Out dialog.
  //
  // Deliberately does NOT clear `user` here. MainLayout ((main)/layout.tsx)
  // has its own effect that redirects to /login the instant `user` becomes
  // null -- clearing it immediately raced that redirect against this
  // dialog's own "click OK, then navigate" flow, so the admin was already
  // bounced to /login before ever acknowledging, with this dialog then
  // stacked on top of the login page instead of appearing over whatever
  // page they were actually on. Leaving `user` alone until the acknowledge
  // click keeps MainLayout's guard from firing early -- the dialog is
  // modal, so nothing on the page behind it is reachable in the meantime.
  useEffect(() => {
    const onSessionExpired = () => {
      setSessionExpired(true);
    };

    window.addEventListener("auth:session-expired", onSessionExpired);
    return () => window.removeEventListener("auth:session-expired", onSessionExpired);
  }, []);

  // ── Check the session when the user returns to an idle tab ────────────────
  // The expiry dialog is only ever raised by the axios interceptor, after an
  // API call 401s and its refresh fails -- an idle tab makes no calls, so the
  // dialog used to appear only once the user clicked something. Re-checking
  // /auth/me when the tab becomes visible/focused again runs that same path:
  // a live session is just refreshed quietly, an expired one raises the dialog
  // right away. Skipped for signed-out users and while the dialog is open.
  useEffect(() => {
    if (!user || sessionExpired) return;

    let lastCheck = 0;
    const checkSession = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      // focus and visibilitychange usually fire together -- one check is enough.
      if (now - lastCheck < 5_000) return;
      lastCheck = now;
      // The interceptor owns the outcome (refresh, or the session-expired
      // event); nothing to do with the result here.
      authService.getMe().catch(() => {});
    };

    document.addEventListener("visibilitychange", checkSession);
    window.addEventListener("focus", checkSession);
    return () => {
      document.removeEventListener("visibilitychange", checkSession);
      window.removeEventListener("focus", checkSession);
    };
  }, [user, sessionExpired]);

  const handleSessionExpiredAcknowledge = useCallback(() => {
    clearPerAccountClientCache();
    clearSessionEstablished();
    setUser(null);
    setSessionExpired(false);
    router.replace("/login");
  }, [router]);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await authService.logout().catch(() => {});
    clearPerAccountClientCache();
    clearSessionEstablished();
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

      {/* ── Session Expired Dialog ─────────────────────────────────────────────
          No onOpenChange handler: `open` stays controlled to `sessionExpired`,
          so Base UI has no state transition to apply from Escape/outside
          click -- it can only close via handleSessionExpiredAcknowledge. */}
      <Dialog open={sessionExpired}>
        <DialogContent
          className="max-w-sm"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle>Session expired</DialogTitle>
            <DialogDescription>
              Your session has expired. Please log in again to continue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleSessionExpiredAcknowledge}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used inside AuthProvider");
  return ctx;
}