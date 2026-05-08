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
  usePathname: () => '/dashboard/notifications',
}));

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const importPage = async () => {
  const mod = await import('@/app/dashboard/notifications/page');
  return mod.default;
};

describe('Notifications page (static design-data driven)', () => {
  it('renders 通知センター heading', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('通知センター');
  });

  it('renders subtitle about システムアラート', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('システムアラート');
  });

  it('renders summary stats labels (未読, 重大, 高優先度, 総通知数)', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('未読');
    expect(text).toContain('重大');
    expect(text).toContain('高優先度');
    expect(text).toContain('総通知数');
  });

  it('renders notifications from static data', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('ランサムウェア試行を検知');
    expect(text).toContain('SIEM サーバー');
    expect(text).toContain('緊急パッチ適用待ち');
  });

  it('renders 通知一覧 section', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('通知一覧');
  });

  it('renders category labels', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('セキュリティ');
    expect(text).toContain('パッチ');
    expect(text).toContain('SAM');
  });

  it('shows 新着 badge for unread notifications', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('新着');
  });

  it('renders すべて既読にする button', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('すべて既読にする');
  });

  it('renders severity option labels', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('すべての重要度');
  });

  it('shows total count footer', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('全 9 件中 9 件を表示');
  });

  it('filter select filters notifications when changed to critical', async () => {
    const Page = await importPage();
    const { container } = render(<Page />);
    const select = container.querySelector('select') as HTMLSelectElement;
    expect(select).toBeTruthy();
    fireEvent.change(select, { target: { value: 'critical' } });
    expect(document.body.textContent).toContain('全 9 件中 2 件を表示');
  });
});
