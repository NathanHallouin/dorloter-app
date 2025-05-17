import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { authApi } from "../api/auth";
import { tokenStore } from "../api/tokenStore";
import type { User } from "../api/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (tokenStore.getAccess()) {
        try {
          const me = await authApi.me();
          if (active) setUser(me);
        } catch {
          tokenStore.clear();
        }
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const tokens = await authApi.login(email, password);
    tokenStore.set(tokens.accessToken, tokens.refreshToken);
    setUser(tokens.user);
  };

  const register = async (email: string, name: string, password: string) => {
    const tokens = await authApi.register(email, name, password);
    tokenStore.set(tokens.accessToken, tokens.refreshToken);
    setUser(tokens.user);
  };

  const logout = async () => {
    const refresh = tokenStore.getRefresh();
    tokenStore.clear();
    setUser(null);
    if (refresh) {
      try {
        await authApi.logout(refresh);
      } catch {
        /* best-effort */
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return ctx;
}
