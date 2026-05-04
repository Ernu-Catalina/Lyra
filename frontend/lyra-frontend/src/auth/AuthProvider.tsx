import React, { useState, useEffect, useRef, useCallback } from "react";
import { AuthContext } from "./AuthContext";
import api from "../api/client";


const ACCESS_TOKEN_MS = 15 * 60 * 1000;
const REFRESH_BEFORE_MS = 60 * 1000;

function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimer = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = useCallback(() => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
  }, []);

  const scheduleRefresh = useCallback((accessToken: string) => {
    clearTimer();
    const expiry = getTokenExpiry(accessToken);
    if (!expiry) return;

    const delay = Math.max(expiry - Date.now() - REFRESH_BEFORE_MS, 0);

    refreshTimer.current = setTimeout(async () => {
      try {
        const res = await api.post<{ access_token: string }>("/auth/refresh");
        const newToken = res.data.access_token;
        localStorage.setItem("token", newToken);
        setToken(newToken);
        scheduleRefresh(newToken);
      } catch {
        localStorage.removeItem("token");
        setToken(null);
      }
    }, delay);
  }, [clearTimer]);

  const login = useCallback((accessToken: string) => {
    localStorage.setItem("token", accessToken);
    setToken(accessToken);
    scheduleRefresh(accessToken);
  }, [scheduleRefresh]);

  const logout = useCallback(async () => {
    clearTimer();
    localStorage.removeItem("token");
    setToken(null);
    try {
      await api.post("/auth/logout");
    } catch {}
  }, [clearTimer]);

  // Restore session on app start
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem("token");

      if (storedToken) {
        const expiry = getTokenExpiry(storedToken);
        if (expiry && expiry > Date.now()) {
          setToken(storedToken);
          scheduleRefresh(storedToken);
          setIsLoading(false);
          return;
        }
      }

      // Try silent refresh using httpOnly cookie (for Remember Me)
      try {
        const res = await api.post<{ access_token: string }>("/auth/refresh");
        const newToken = res.data.access_token;
        localStorage.setItem("token", newToken);
        setToken(newToken);
        scheduleRefresh(newToken);
      } catch {
        // No valid session
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();

    return clearTimer;
  }, [scheduleRefresh, clearTimer]);

  return (
    <AuthContext.Provider value={{ token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};