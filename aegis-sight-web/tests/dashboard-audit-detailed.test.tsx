import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/audit',
}));

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const importPage = async () => {
  const mod = await import('@/app/dashboard/audit/page');
  return mod.default;
};

describe('Audit page (static design-data driven)', () => {
  it('renders 監査ログ heading', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('監査ログ');
  });

  it('renders subtitle', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('ユーザー操作・システム変更・認証イベント');
  });

  it('renders summary stats labels', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('総ログ件数');
    expect(text).toContain('失敗イベント');
    expect(text).toContain('ブロックイベント');
  });

  it('renders log users from static data', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('tanaka.hiroshi');
    expect(text).toContain('yamamoto.kenji');
    expect(text).toContain('admin');
  });

  it('renders action labels', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('ユーザーアカウント作成');
    expect(text).toContain('機密ファイルへのアクセス');
    expect(text).toContain('ポリシー設定変更');
  });

  it('renders result badges (成功, 失敗, ブロック)', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('成功');
    expect(text).toContain('失敗');
    expect(text).toContain('ブロック');
  });

  it('renders table column headers', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('日時');
    expect(text).toContain('ユーザー');
    expect(text).toContain('操作');
    expect(text).toContain('リソース');
    expect(text).toContain('IPアドレス');
    expect(text).toContain('結果');
  });

  it('renders CSVエクスポート action button', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('CSVエクスポート');
  });

  it('renders total count footer', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('全 10 件中 10 件を表示');
  });

  it('search filter narrows the log list', async () => {
    const Page = await importPage();
    const { container } = render(<Page />);
    const input = container.querySelector('input[type="search"], input[type="text"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    fireEvent.change(input, { target: { value: 'tanaka' } });
    expect(document.body.textContent).toContain('tanaka.hiroshi');
  });

  it('search with no match shows empty message', async () => {
    const Page = await importPage();
    const { container } = render(<Page />);
    const input = container.querySelector('input[type="search"], input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'zzznoneexisting' } });
    expect(document.body.textContent).toContain('条件に一致するログが見つかりません');
  });
});
