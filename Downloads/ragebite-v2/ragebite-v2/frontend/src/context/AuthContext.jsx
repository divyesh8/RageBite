import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, setToken, clearToken } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate              = useNavigate();

  // ─── RESTORE SESSION ON MOUNT ──────────────────────────────────────────────
  useEffect(() => {
    const restore = async () => {
      try {
        // Try to refresh token → get new access token from cookie
        const { data } = await authAPI.me ? authAPI.me() : Promise.reject();
        if (data.success) {
          setUser(data.user);
        }
      } catch {
        // No valid session — clear everything
        clearToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []);

  const login = useCallback(async (identifier, password, rememberMe = false) => {
    const { data } = await authAPI.login({ identifier, password, rememberMe });
    if (data.accessToken) setToken(data.accessToken);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch {}
    clearToken();
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  const updateUser = useCallback((updates) => {
    setUser(prev => prev ? { ...prev, ...updates } : prev);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAuth: !!user, login, logout, updateUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
