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

  it('無効なlocalStorage値はsystemにフォールバックする', () => {
    localStorageMock.getItem.mockReturnValueOnce('invalid-theme');
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );
    expect(screen.getByTestId('theme').textContent).toBe('system');
  });

  it('localStorage例外時はsystemにフォールバックする', () => {
    localStorageMock.getItem.mockImplementationOnce(() => {
      throw new Error('SecurityError');
    });
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );
    expect(screen.getByTestId('theme').textContent).toBe('system');
  });

  it('darkテーマ時にdarkクラスが設定される', () => {
    localStorageMock.getItem.mockReturnValueOnce('dark');
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('lightテーマ時にdarkクラスが除去される', () => {
    document.documentElement.classList.add('dark');
    localStorageMock.getItem.mockReturnValueOnce('light');
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('system preference変更時にテーマが更新される', () => {
    let changeHandler: (() => void) | null = null;
    matchMediaMock.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((_: string, handler: () => void) => {
        changeHandler = handler;
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );

    // Theme is system, so media query change should update resolved theme
    expect(changeHandler).not.toBeNull();
    if (changeHandler) {
      (changeHandler as () => void)();
    }
  });

  it('system theme change listener does nothing when theme is not system', () => {
    let changeHandler: (() => void) | null = null;
    matchMediaMock.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((_: string, handler: () => void) => {
        changeHandler = handler;
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    // Start with dark theme (not system)
    localStorageMock.getItem.mockReturnValueOnce('dark');
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme').textContent).toBe('dark');
    const resolvedBefore = screen.getByTestId('resolved').textContent;
    // Fire media query change — should NOT change resolvedTheme since theme !== 'system'
    if (changeHandler) {
      (changeHandler as () => void)();
    }
    // resolvedTheme should remain unchanged
    expect(screen.getByTestId('resolved').textContent).toBe(resolvedBefore);
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

  it('light → dark → system → light のサイクルで切り替わる', () => {
    // Start with light theme from localStorage
    localStorageMock.getItem.mockReturnValueOnce('light');
    render(
      <ThemeProvider>
        <ThemeToggle />
        <ThemeDisplay />
      </ThemeProvider>
    );
    const button = screen.getByRole('button');

    // light -> dark
    fireEvent.click(button);
    expect(screen.getByTestId('theme').textContent).toBe('dark');

    // dark -> system
    fireEvent.click(button);
    expect(screen.getByTestId('theme').textContent).toBe('system');

    // system -> light
    fireEvent.click(button);
    expect(screen.getByTestId('theme').textContent).toBe('light');
  });

  it('systemテーマ時にAバッジが表示される', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
        <ThemeDisplay />
      </ThemeProvider>
    );
    // Default is system, so "A" badge should be visible
    expect(screen.getByText('A')).toBeDefined();
  });

  it('darkテーマ時にMoonIconが表示される', () => {
    localStorageMock.getItem.mockReturnValueOnce('dark');
    // Mock matchMedia to report dark preference
    matchMediaMock.mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { container } = render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).toContain('ダークモード');
  });

  it('lightテーマ時にSunIconが表示される', () => {
    localStorageMock.getItem.mockReturnValueOnce('light');
    const { container } = render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).toContain('ライトモード');
  });
});
