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
  usePathname: () => '/dashboard/search',
}));

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const importPage = async () => {
  const mod = await import('@/app/dashboard/search/page');
  return mod.default;
};

describe('Search page (static design-data driven)', () => {
  it('renders グローバル検索 heading', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('グローバル検索');
  });

  it('renders search subtitle mentioning デバイス・ユーザー・アラート', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('デバイス・ユーザー・アラート');
  });

  it('renders 最近の検索 hint when query is empty', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('最近の検索');
  });

  it('renders RECENT_SEARCHES buttons', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('ThinkPad X1');
    expect(text).toContain('ランサムウェア');
    expect(text).toContain('MFA 未設定');
  });

  it('renders 6 category cards when query is empty', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('デバイス管理');
    expect(text).toContain('ユーザー');
    expect(text).toContain('アラート');
    expect(text).toContain('ライセンス');
    expect(text).toContain('インシデント');
    expect(text).toContain('コンプライアンス');
  });

  it('shows category counts (1,284 devices)', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('1,284');
  });

  it('hides results panel when query is empty', async () => {
    const Page = await importPage();
    const { queryByText } = render(<Page />);
    expect(queryByText('検索結果')).toBeNull();
  });

  it('shows results panel when query has 2+ chars matching', async () => {
    const Page = await importPage();
    const { container, getByText } = render(<Page />);
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input).toBeTruthy();
    fireEvent.change(input, { target: { value: 'DESK' } });
    expect(getByText('検索結果')).toBeTruthy();
    expect(document.body.textContent).toContain('DESK-PC-0042');
  });

  it('finds incidents when query matches INC-2025-0042', async () => {
    const Page = await importPage();
    const { container } = render(<Page />);
    const input = container.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'INC-2025' } });
    expect(document.body.textContent).toContain('INC-2025-0042');
  });

  it('shows empty state when query has no match', async () => {
    const Page = await importPage();
    const { container } = render(<Page />);
    const input = container.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'zzzzzznonexistent' } });
    expect(document.body.textContent).toContain('一致する結果が見つかりません');
  });

  it('clicking RECENT_SEARCHES button populates query and shows results', async () => {
    const Page = await importPage();
    const { getByText } = render(<Page />);
    fireEvent.click(getByText('ThinkPad X1'));
    expect(getByText('検索結果')).toBeTruthy();
  });
});
