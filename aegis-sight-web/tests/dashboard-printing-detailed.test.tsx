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
  usePathname: () => '/dashboard/printing',
}));

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const importPage = async () => {
  const mod = await import('@/app/dashboard/printing/page');
  return mod.default;
};

describe('Printing page (static design-data driven)', () => {
  it('renders 印刷管理 heading', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('印刷管理');
  });

  it('renders subtitle about プリンター', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('プリンター');
  });

  it('renders summary stats (プリンター数, オンライン, 本日総印刷枚数, カラー印刷比率)', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('プリンター数');
    expect(text).toContain('オンライン');
    expect(text).toContain('本日総印刷枚数');
    expect(text).toContain('カラー印刷比率');
  });

  it('renders printers from static data', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('本社 3F 複合機-A');
    expect(text).toContain('本社 3F 複合機-B');
    expect(text).toContain('大阪支社');
    expect(text).toContain('名古屋支社');
  });

  it('renders printer models', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('Canon imageRUNNER');
    expect(text).toContain('HP LaserJet');
    expect(text).toContain('Fujifilm Apeos');
    expect(text).toContain('Ricoh IM');
  });

  it('renders status labels (オンライン, 警告, オフライン)', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('オンライン');
    expect(text).toContain('警告');
    expect(text).toContain('オフライン');
  });

  it('renders printer table column headers', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('プリンター名');
    expect(text).toContain('モデル');
    expect(text).toContain('設置場所');
    expect(text).toContain('カラー');
    expect(text).toContain('本日ジョブ数');
    expect(text).toContain('本日印刷枚数');
    expect(text).toContain('状態');
  });

  it('renders 印刷ログ（本日） section heading', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('印刷ログ');
  });

  it('renders log entries with users', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('田中 浩');
    expect(text).toContain('山本 健司');
    expect(text).toContain('佐藤 由紀');
  });

  it('renders log table column headers', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('ユーザー');
    expect(text).toContain('部門');
    expect(text).toContain('印刷枚数');
    expect(text).toContain('種別');
    expect(text).toContain('時刻');
  });

  it('search input filters logs when query is provided', async () => {
    const Page = await importPage();
    const { container } = render(<Page />);
    const input = container.querySelector('input[type="search"], input[type="text"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    fireEvent.change(input, { target: { value: '田中' } });
    expect(document.body.textContent).toContain('田中 浩');
  });

  it('shows empty log message when search has no match', async () => {
    const Page = await importPage();
    const { container } = render(<Page />);
    const input = container.querySelector('input[type="search"], input[type="text"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'zzzzznomatch' } });
    expect(document.body.textContent).toContain('条件に一致するログが見つかりません');
  });
});
