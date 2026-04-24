import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import type { ReactNode } from 'react';

// Mock next/navigation
const mockRouterPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

// localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Test helper: renders a component that exposes auth context values
function AuthConsumer() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="is-loading">{String(auth.isLoading)}</span>
      <span data-testid="is-authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="user-email">{auth.user?.email ?? 'null'}</span>
      <span data-testid="error">{auth.error ?? 'null'}</span>
      <button onClick={() => auth.login('admin@aegis-sight.local', 'admin')}>
        Demo Login
      </button>
      <button onClick={() => auth.login('bad@example.com', 'wrong')}>
        Bad Login
      </button>
      <button onClick={auth.logout}>Logout</button>
    </div>
  );
}

function Wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('useAuth', () => {
  it('AuthProvider 外で使用された場合 Error をスローする', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<AuthConsumer />)).toThrow(
      'useAuth must be used within an AuthProvider'
    );
    consoleSpy.mockRestore();
  });
});

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    mockRouterPush.mockClear();
    // Reset fetch mock
    vi.restoreAllMocks();
  });

  it('初期状態: isLoading=true → false に変化し、未認証', async () => {
    render(<AuthConsumer />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('is-loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('is-authenticated').textContent).toBe('false');
    expect(screen.getByTestId('user-email').textContent).toBe('null');
  });

  it('localStorage に有効なセッションがある場合、user を復元する', async () => {
    const storedUser = {
      id: '1',
      email: 'admin@aegis-sight.local',
      name: '管理者',
      department: 'IT管理',
      role: 'admin',
      avatarUrl: null,
    };
    localStorageMock.getItem.mockReturnValueOnce(
      JSON.stringify({ user: storedUser, token: 'stored-token' })
    );

    render(<AuthConsumer />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('is-loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('is-authenticated').textContent).toBe('true');
    expect(screen.getByTestId('user-email').textContent).toBe(
      'admin@aegis-sight.local'
    );
  });

  it('localStorage のデータが破損している場合、未認証状態を維持する', async () => {
    localStorageMock.getItem.mockReturnValueOnce('{ invalid json }');

    render(<AuthConsumer />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('is-loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('is-authenticated').textContent).toBe('false');
    // Corrupted entry should be removed
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('aegis-sight-auth');
  });

  it('API 障害時のデモログイン（admin@aegis-sight.local / admin）が成功する', async () => {
    // Simulate API failure
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    render(<AuthConsumer />, { wrapper: Wrapper });
    await waitFor(() =>
      expect(screen.getByTestId('is-loading').textContent).toBe('false')
    );

    await act(async () => {
      screen.getByText('Demo Login').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated').textContent).toBe('true');
    });
    expect(screen.getByTestId('user-email').textContent).toBe(
      'admin@aegis-sight.local'
    );
    expect(mockRouterPush).toHaveBeenCalledWith('/dashboard');
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'aegis-sight-auth',
      expect.stringContaining('admin@aegis-sight.local')
    );
  });

  it('API が !response.ok のときデモ認証情報でフォールバックログインする', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });

    render(<AuthConsumer />, { wrapper: Wrapper });
    await waitFor(() =>
      expect(screen.getByTestId('is-loading').textContent).toBe('false')
    );

    await act(async () => {
      screen.getByText('Demo Login').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated').textContent).toBe('true');
    });
    expect(mockRouterPush).toHaveBeenCalledWith('/dashboard');
  });

  it('API が !ok かつ非デモ認証情報のとき line 98 throw をカバーする', async () => {
    // response.ok=false + bad credentials → throw "メールアドレスまたはパスワードが正しくありません" (line 98)
    global.fetch = vi.fn().mockResolvedValue({ ok: false });

    render(<AuthConsumer />, { wrapper: Wrapper });
    await waitFor(() =>
      expect(screen.getByTestId('is-loading').textContent).toBe('false')
    );

    await act(async () => {
      screen.getByText('Bad Login').click(); // bad@example.com / wrong
    });

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).not.toBe('null');
    });
    expect(screen.getByTestId('is-authenticated').textContent).toBe('false');
  });

  it('不正な認証情報でのログインが error を設定する', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    render(<AuthConsumer />, { wrapper: Wrapper });
    await waitFor(() =>
      expect(screen.getByTestId('is-loading').textContent).toBe('false')
    );

    await act(async () => {
      screen.getByText('Bad Login').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).not.toBe('null');
    });
    expect(screen.getByTestId('is-authenticated').textContent).toBe('false');
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('API 正常時に user を設定して dashboard へリダイレクトする', async () => {
    const apiUser = {
      id: '2',
      email: 'user@example.com',
      name: 'テストユーザー',
      department: '開発',
      role: 'operator',
      avatarUrl: null,
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: apiUser, token: 'api-token' }),
    });

    render(<AuthConsumer />, { wrapper: Wrapper });
    await waitFor(() =>
      expect(screen.getByTestId('is-loading').textContent).toBe('false')
    );

    await act(async () => {
      screen.getByText('Demo Login').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated').textContent).toBe('true');
    });
    expect(mockRouterPush).toHaveBeenCalledWith('/dashboard');
  });

  it('logout が user をクリアして /login へリダイレクトする', async () => {
    const storedUser = {
      id: '1',
      email: 'admin@aegis-sight.local',
      name: '管理者',
      department: 'IT管理',
      role: 'admin',
      avatarUrl: null,
    };
    localStorageMock.getItem.mockReturnValueOnce(
      JSON.stringify({ user: storedUser, token: 'stored-token' })
    );

    render(<AuthConsumer />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated').textContent).toBe('true');
    });

    await act(async () => {
      screen.getByText('Logout').click();
    });

    expect(screen.getByTestId('is-authenticated').textContent).toBe('false');
    expect(screen.getByTestId('user-email').textContent).toBe('null');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('aegis-sight-auth');
    expect(mockRouterPush).toHaveBeenCalledWith('/login');
  });
});
