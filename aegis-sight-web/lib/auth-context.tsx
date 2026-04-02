'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
  department: string;
  role: 'admin' | 'manager' | 'operator' | 'viewer';
  avatarUrl: string | null;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

const STORAGE_KEY = 'aegis-sight-auth';

function setAuthCookie(token: string) {
  document.cookie = `aegis-sight-auth=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

function removeAuthCookie() {
  document.cookie = 'aegis-sight-auth=; path=/; max-age=0';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Check for existing session on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.user && parsed.token) {
          setUser(parsed.user);
          setAuthCookie(parsed.token);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        // Fallback for demo: accept admin@aegis-sight.local / admin
        if (email === 'admin@aegis-sight.local' && password === 'admin') {
          const demoUser: User = {
            id: '1',
            email: 'admin@aegis-sight.local',
            name: '管理者',
            department: 'IT管理',
            role: 'admin',
            avatarUrl: null,
          };
          const demoToken = 'demo-token-' + Date.now();
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: demoUser, token: demoToken }));
          setAuthCookie(demoToken);
          setUser(demoUser);
          router.push('/dashboard');
          return;
        }
        throw new Error('メールアドレスまたはパスワードが正しくありません');
      }

      const data = await response.json();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: data.user, token: data.token }));
      setAuthCookie(data.token);
      setUser(data.user);
      router.push('/dashboard');
    } catch (err) {
      // If API is unavailable, allow demo login
      if (email === 'admin@aegis-sight.local' && password === 'admin') {
        const demoUser: User = {
          id: '1',
          email: 'admin@aegis-sight.local',
          name: '管理者',
          department: 'IT管理',
          role: 'admin',
          avatarUrl: null,
        };
        const demoToken = 'demo-token-' + Date.now();
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: demoUser, token: demoToken }));
        setAuthCookie(demoToken);
        setUser(demoUser);
        router.push('/dashboard');
        return;
      }
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    removeAuthCookie();
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
