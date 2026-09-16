import axios from "axios";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const axiosInstance = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

let _refreshing: Promise<boolean> | null = null;

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

        _refreshing = axiosInstance
          .post("/auth/refresh", {})
          .then(() => true)
          .catch(() => false)
          .finally(() => {
            _refreshing = null;
          });
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