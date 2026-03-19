import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { User } from "@shared/schema";

interface AuthContext {
  user: User | null;
  setUser: (u: User | null) => void;
  logout: () => void;
  loading: boolean;
}

const AuthCtx = createContext<AuthContext>({ user: null, setUser: () => {}, logout: () => {}, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    if (u) localStorage.setItem("gy_user", JSON.stringify(u));
    else localStorage.removeItem("gy_user");
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, [setUser]);

  useEffect(() => {
    const saved = localStorage.getItem("gy_user");
    if (!saved) { setLoading(false); return; }
    let parsed: User | null = null;
    try { parsed = JSON.parse(saved); } catch { localStorage.removeItem("gy_user"); setLoading(false); return; }
    if (!parsed?.id) { localStorage.removeItem("gy_user"); setLoading(false); return; }

    fetch(`/api/users/${parsed.id}`, { credentials: "include" })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error("not_found");
      })
      .then((fresh: User) => {
        localStorage.setItem("gy_user", JSON.stringify(fresh));
        setUserState(fresh);
      })
      .catch(() => {
        localStorage.removeItem("gy_user");
        setUserState(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return <AuthCtx.Provider value={{ user, setUser, logout, loading }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
