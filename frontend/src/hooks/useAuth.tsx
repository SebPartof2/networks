import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from '../types';
import { api } from '../lib/api';
import { refreshAccessToken, revokeToken } from '../lib/oauth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: () => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const userData = await api.getCurrentUser();
      setUser(userData);
    } catch {
      // Token might be expired, try to refresh
      const refreshTokenValue = localStorage.getItem('refresh_token');
      if (refreshTokenValue) {
        try {
          const tokens = await refreshAccessToken(refreshTokenValue);
          localStorage.setItem('access_token', tokens.access_token);
          localStorage.setItem('refresh_token', tokens.refresh_token);
          localStorage.setItem('token_expires_at', String(Date.now() + tokens.expires_in * 1000));

          const userData = await api.getCurrentUser();
          setUser(userData);
        } catch {
          // Refresh failed, clear tokens
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('token_expires_at');
          setUser(null);
        }
      } else {
        localStorage.removeItem('access_token');
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Set up token refresh timer
  useEffect(() => {
    const checkAndRefreshToken = async () => {
      const expiresAt = localStorage.getItem('token_expires_at');
      const refreshTokenValue = localStorage.getItem('refresh_token');

      if (expiresAt && refreshTokenValue) {
        const now = Date.now();
        const expiry = parseInt(expiresAt, 10);

        // Refresh 60 seconds before expiry
        if (now >= expiry - 60000) {
          try {
            const tokens = await refreshAccessToken(refreshTokenValue);
            localStorage.setItem('access_token', tokens.access_token);
            localStorage.setItem('refresh_token', tokens.refresh_token);
            localStorage.setItem('token_expires_at', String(Date.now() + tokens.expires_in * 1000));
          } catch {
            // Refresh failed
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('token_expires_at');
            setUser(null);
          }
        }
      }
    };

    const interval = setInterval(checkAndRefreshToken, 30000);
    return () => clearInterval(interval);
  }, []);

  const login = useCallback(() => {
    window.location.href = '/sso';
  }, []);

  const logout = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        await revokeToken(token);
      } catch {
        // Ignore revocation errors
      }
    }

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token_expires_at');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isAdmin: user?.is_admin ?? false,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
