import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, useTheme } from '@/lib/theme-context';
import { ThemeToggle } from '@/components/ui/theme-toggle';

// localStorage モック
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

// matchMedia モック
const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: matchMediaMock,
});

// テーマ値を表示するヘルパーコンポーネント
function ThemeDisplay() {
  const { theme, resolvedTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('dark');
  });

  it('デフォルトでsystemテーマが設定される', () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );
    expect(screen.getByTestId('theme').textContent).toBe('system');
  });

  it('localStorageから保存済みテーマを復元する', () => {
    localStorageMock.getItem.mockReturnValueOnce('dark');
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );
    // 初期レンダー後にuseEffectで復元される
    expect(localStorageMock.getItem).toHaveBeenCalledWith('aegis-sight-theme');
  });

  it('useThemeがThemeProvider外で使用された場合エラーをスローする', () => {
    // エラーをキャッチするためconsole.errorを抑制
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ThemeDisplay />)).toThrow(
      'useTheme must be used within a ThemeProvider'
    );
    consoleSpy.mockRestore();
  });
});

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('dark');
  });

  it('テーマ切替ボタンがレンダリングされる', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    const button = screen.getByRole('button');
    expect(button).toBeDefined();
  });

  it('ボタンにaria-labelが設定されている', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).toBeTruthy();
  });

  it('クリックでテーマが切り替わる', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
        <ThemeDisplay />
      </ThemeProvider>
    );
    const button = screen.getByRole('button');

    // system -> light (初期状態がsystemの場合、クリックでlightへ)
    fireEvent.click(button);
    // テーマが変更されることを確認
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });
});
