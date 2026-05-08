import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/incidents',
}));

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const importPage = async () => {
  const mod = await import('@/app/dashboard/incidents/page');
  return mod.default;
};

describe('Incidents page (static design-data driven)', () => {
  it('renders インシデント管理 heading', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('インシデント管理');
  });

  it('renders subtitle about セキュリティインシデント', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('セキュリティインシデント');
  });

  it('renders summary stats labels', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('総件数');
    expect(text).toContain('P1 重大');
    expect(text).toContain('今月解決');
  });

  it('renders incident IDs from static data', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('INC-001');
    expect(text).toContain('INC-002');
    expect(text).toContain('INC-005');
  });

  it('renders incident titles', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('ランサムウェア感染疑い');
    expect(text).toContain('特権ID');
    expect(text).toContain('DDoS');
  });

  it('renders priority labels P1/P2/P3', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('P1');
    expect(text).toContain('P2');
    expect(text).toContain('P3');
  });

  it('renders status labels (対応中, 調査中, 解決済, 承認待ち)', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('対応中');
    expect(text).toContain('調査中');
    expect(text).toContain('解決済');
    expect(text).toContain('承認待ち');
  });

  it('renders assignees (セキュリティチーム, インフラチーム)', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('セキュリティチーム');
    expect(text).toContain('インフラチーム');
  });

  it('renders SLA columns (4h, 8h, 24h, 48h)', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('4h');
    expect(text).toContain('8h');
    expect(text).toContain('24h');
    expect(text).toContain('48h');
  });

  it('renders table column headers', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('タイトル');
    expect(text).toContain('優先度');
    expect(text).toContain('ステータス');
    expect(text).toContain('担当者');
    expect(text).toContain('発生日時');
    expect(text).toContain('SLA');
    expect(text).toContain('経過時間');
  });

  it('renders top action buttons (CSVエクスポート, インシデントを作成)', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('CSVエクスポート');
    expect(text).toContain('インシデントを作成');
  });

  it('renders table footer total count', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('全 5 件');
  });
});
