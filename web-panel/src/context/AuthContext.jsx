import { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext(null);

/**
 * AuthProvider: token ve kullanıcı bilgisini uygulama genelinde sağlar.
 * token ve user nesnesi localStorage'da saklanır; sayfa yenilemesinde
 * (sayfa yenileme dahil) rol bilgisi de korunur.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("vc_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem("vc_token") || null);
  const [isLoading, setIsLoading] = useState(false);

  // token değişince localStorage'ı güncelle
  useEffect(() => {
    if (token) {
      localStorage.setItem("vc_token", token);
    } else {
      localStorage.removeItem("vc_token");
    }
  }, [token]);

  // user değişince localStorage'ı güncelle (rol bilgisi dahil)
  useEffect(() => {
    if (user) {
      localStorage.setItem("vc_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("vc_user");
    }
  }, [user]);

  const login = useCallback((userData, jwt) => {
    setUser(userData);
    setToken(jwt);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
  }, []);

  const value = { user, setUser, token, isLoading, setIsLoading, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** useAuth hook — AuthContext'i kolayca tüketir */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
