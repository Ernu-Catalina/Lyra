import axios from "axios";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  "https://lyra-backend-production-98b7.up.railway.app";

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  withCredentials: true, // Required for httpOnly refresh-token cookies
});

// Attach access token from localStorage to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── 401 refresh-and-retry interceptor ─────────────────────────────────────────
// When any request returns 401 we attempt a single silent refresh.
// While the refresh is in-flight, all subsequent 401s are queued and resolved
// (or rejected) together once the refresh completes — preventing duplicate calls.

let isRefreshing = false;
let waitQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function drainQueue(err: unknown, token: string | null) {
  waitQueue.forEach(({ resolve, reject }) => {
    if (err) reject(err);
    else resolve(token!);
  });
  waitQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    // Only intercept 401s that haven't already been retried, and skip the
    // /auth/refresh call itself to avoid infinite loops.
    if (
      error.response?.status !== 401 ||
      original._retry ||
      original.url === "/auth/refresh" ||
      original.url === "/auth/logout"
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue this request until the in-flight refresh completes
      return new Promise((resolve, reject) => {
        waitQueue.push({ resolve, reject });
      }).then((newToken) => {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const res = await api.post<{ access_token: string }>("/auth/refresh", {});
      const newToken = res.data.access_token;
      localStorage.setItem("token", newToken);
      api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
      drainQueue(null, newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (refreshErr) {
      drainQueue(refreshErr, null);
      localStorage.removeItem("token");
      // Signal AuthProvider to clear its state without creating a circular import
      window.dispatchEvent(new CustomEvent("auth:logout"));
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
