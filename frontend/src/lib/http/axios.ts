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
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);