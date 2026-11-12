"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/Feedback";
import { ApiError, api, errorMessage, setUnauthorizedHandler } from "@/lib/api";
import type { Permission, SessionUser } from "@/lib/types";

interface AuthState {
  user: SessionUser;
  can: (...permissions: Permission[]) => boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * Loads the signed-in user for the dashboard. The permissions come from the API
 * (single source of truth) and only drive what the UI shows: the API enforces them.
 */
export function AuthProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toLogin = useCallback(() => {
    setUser(null);
    const next = window.location.pathname + window.location.search;
    // A full navigation: the proxy sees the cleared cookie and no stale UI survives.
    window.location.assign(next && next !== "/" ? `/login?next=${encodeURIComponent(next)}` : "/login");
  }, []);

  const refresh = useCallback(async () => {
    try {
      setUser(await api.get<SessionUser>("/auth/me"));
      setError(null);
    } catch (err) {
      // 401 is handled by the unauthorized handler; anything else (API down…) is shown with a retry.
      if (!(err instanceof ApiError && err.status === 401)) setError(errorMessage(err));
      throw err;
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      // The session cookie is HTTP-only; ask the API to clear it, then leave.
      void api.post("/auth/logout").catch(() => undefined).finally(toLogin);
    });
    // Loading the session is the external sync this effect exists for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh().catch(() => undefined);
    return () => setUnauthorizedHandler(null);
  }, [refresh, toLogin]);

  const logout = useCallback(async () => {
    await api.post("/auth/logout").catch(() => undefined);
    setUser(null);
    router.replace("/login");
    router.refresh();
  }, [router]);

  const value = useMemo<AuthState | null>(
    () =>
      user
        ? {
            user,
            can: (...permissions) => permissions.every((p) => user.permissions.includes(p)),
            refresh,
            logout,
          }
        : null,
    [user, refresh, logout],
  );

  if (!value && error) {
    return (
      <div className="grid min-h-dvh place-items-center p-6">
        <div className="w-full max-w-lg">
          <ErrorState message={error} />
          <div className="mt-4 flex justify-center">
            <Button variant="line" size="sm" onClick={() => void refresh().catch(() => undefined)}>
              Réessayer
            </Button>
          </div>
        </div>
      </div>
    );
  }
  if (!value) return <>{fallback}</>;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
