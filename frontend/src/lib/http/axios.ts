import axios from "axios";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const axiosInstance = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

let _refreshing: Promise<boolean> | null = null;

// ── Cross-tab refresh coordination ──────────────────────────────────────────
// _refreshing above only de-dupes concurrent refresh attempts *within one
// tab* (it's a plain module variable, so a second tab has its own separate
// copy starting at null). Two tabs of the same browser share the same
// refresh-token cookie, so if both tabs' access tokens expire around the
// same moment, both independently fire POST /auth/refresh with that same
// token. The backend rotates it atomically (one tab wins outright), but the
// *losing* tab's lookup can land after the winner's commit -- and the
// backend can't tell "a sibling tab lost a benign race" apart from "someone
// replayed a stolen refresh token", so it takes the safe assumption and
// revokes the whole session (see REFRESH_TOKEN_REUSE_DETECTED in
// auth_service.refresh_auth_tokens). That's correct behavior for an actual
// stolen token; the fix here is to stop two tabs from ever racing to begin
// with, via a localStorage lock every tab checks before calling refresh.
const CROSS_TAB_LOCK_KEY = "auth:refresh:lock";
const CROSS_TAB_RESULT_KEY = "auth:refresh:result";
// Safety net only -- covers a tab that grabbed the lock and then died
// (crashed, closed) before it could release it. Any real refresh call
// completes in well under this.
const CROSS_TAB_LOCK_STALE_MS = 10_000;

function tryAcquireCrossTabRefreshLock(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const existing = window.localStorage.getItem(CROSS_TAB_LOCK_KEY);
    if (existing) {
      const acquiredAt = Number(existing);
      if (Number.isFinite(acquiredAt) && Date.now() - acquiredAt < CROSS_TAB_LOCK_STALE_MS) {
        return false; // another tab is already refreshing
      }
    }
    window.localStorage.setItem(CROSS_TAB_LOCK_KEY, String(Date.now()));
    return true;
  } catch {
    // localStorage unavailable (private-mode restrictions, quota, etc) --
    // fall back to this tab's own single-flight only.
    return true;
  }
}

function releaseCrossTabRefreshLock(success: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CROSS_TAB_LOCK_KEY);
    // "storage" only fires in *other* tabs, not this one -- exactly what's
    // needed to wake tabs that are waiting below.
    window.localStorage.setItem(
      CROSS_TAB_RESULT_KEY,
      JSON.stringify({ success, at: Date.now() })
    );
  } catch {
    // Non-fatal -- waiting tabs fall back to their own polling/timeout below.
  }
}

// Called by a tab that found another tab already holding the lock. Waits
// for that tab's result instead of firing a second concurrent refresh.
function waitForCrossTabRefresh(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    const startedAt = Date.now();
    let settled = false;

    const finish = (result: boolean) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("storage", onStorage);
      clearInterval(pollId);
      resolve(result);
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key !== CROSS_TAB_RESULT_KEY || !e.newValue) return;
      try {
        finish(!!JSON.parse(e.newValue).success);
      } catch {
        finish(false);
      }
    };

    // Polling fallback: the owning tab's storage.removeItem for the lock
    // doesn't carry a payload to branch on, so this just guards against the
    // lock disappearing (or simply going stale) without a "storage" event
    // ever reaching this listener -- e.g. the owning tab closed mid-refresh.
    const pollId = setInterval(() => {
      const stillLocked = window.localStorage.getItem(CROSS_TAB_LOCK_KEY);
      const staleOrGone =
        !stillLocked ||
        Date.now() - Number(stillLocked) >= CROSS_TAB_LOCK_STALE_MS;
      if (staleOrGone || Date.now() - startedAt >= CROSS_TAB_LOCK_STALE_MS) {
        // No confirmed result reached this tab -- resolve optimistically
        // (true) rather than forcing a session-expired popup on a guess.
        // The retried request either succeeds outright (the owning tab's
        // refresh actually landed -- cookies are valid, nothing more to
        // do) or 401s again, and since original._retry is already set by
        // then, that second 401 falls straight through to a plain
        // rejection instead of looping -- the caller just sees a failed
        // request, and the *next* request this tab makes goes through the
        // refresh flow cleanly and surfaces the real outcome. Preferable
        // to guessing "failed" and showing an incorrect expired-session
        // message to a tab whose sibling actually succeeded.
        finish(true);
      }
    }, 150);

    window.addEventListener("storage", onStorage);
  });
}

function dispatchRefreshStart() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("auth:refresh-start"));
  }
}

function dispatchRefreshEnd(success: boolean) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<{ success: boolean }>("auth:refresh-end", {
        detail: { success },
      })
    );
  }
}

// Session truly expired (refresh failed) — AuthProvider listens for this
// and shows a modal ("your session expired, please log in again") before
// navigating to /login, instead of the silent hard-redirect this used to
// do straight from here with no explanation to the user.
function dispatchSessionExpired() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("auth:session-expired"));
  }
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status   = error.response?.status;

    if (original.url?.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    if (status === 401 && !original._retry) {
      original._retry = true;

      if (!_refreshing) {
        dispatchRefreshStart();

        if (tryAcquireCrossTabRefreshLock()) {
          _refreshing = axiosInstance
            .post("/auth/refresh", {})
            .then(() => true)
            .catch(() => false)
            .then((success) => {
              releaseCrossTabRefreshLock(success);
              return success;
            })
            .finally(() => {
              _refreshing = null;
            });
        } else {
          // Another tab already holds the refresh lock -- wait for its
          // result instead of sending a second concurrent request with the
          // same (still shared, not yet rotated) refresh-token cookie.
          _refreshing = waitForCrossTabRefresh().finally(() => {
            _refreshing = null;
          });
        }
      }

      const refreshed = await _refreshing;

      dispatchRefreshEnd(refreshed);

      if (refreshed) {
        return axiosInstance(original);
      }

      if (
        typeof window !== "undefined" &&
        !window.location.pathname.includes("/login")
      ) {
        try { await axios.post(`${BACKEND_URL}/auth/logout`, {}, { withCredentials: true }); } catch {}
        dispatchSessionExpired();
      }
    }

    return Promise.reject(error);
  }
);