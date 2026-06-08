import { createContext, useContext, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'https://ragebite-production.up.railway.app/api';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate              = useNavigate();

  const login = useCallback(async (identifier, password, rememberMe = false) => {
    const { data } = await axios.post(`${API}/auth/login`,
      { identifier, password, rememberMe },
      { withCredentials: true }
    );
    if (data.accessToken) window.__rb_access_token = data.accessToken;
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${window.__rb_access_token}` },
        withCredentials: true
      });
    } catch {}
    window.__rb_access_token = null;
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  const updateUser = useCallback((updates) => {
    setUser(prev => prev ? { ...prev, ...updates } : prev);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, loading, isAuth: !!user,
      login, logout, updateUser, setUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
