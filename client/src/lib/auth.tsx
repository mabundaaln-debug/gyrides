import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { User } from "@shared/schema";

interface AuthContext {
  user: User | null;
  setUser: (u: User | null) => void;
  logout: () => void;
}

const AuthCtx = createContext<AuthContext>({ user: null, setUser: () => {}, logout: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => {
    const saved = localStorage.getItem("gy_user");
    return saved ? JSON.parse(saved) : null;
  });

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    if (u) localStorage.setItem("gy_user", JSON.stringify(u));
    else localStorage.removeItem("gy_user");
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, [setUser]);

  return <AuthCtx.Provider value={{ user, setUser, logout }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
