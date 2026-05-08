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
  usePathname: () => '/dashboard/sla',
}));

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const importPage = async () => {
  const mod = await import('@/app/dashboard/sla/page');
  return mod.default;
};

describe('SLA page (static design-data driven)', () => {
  it('renders SLA 管理 heading', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('SLA 管理');
  });

  it('renders subtitle about サービスレベル合意', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('サービスレベル合意');
  });

  it('renders summary stats labels', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('SLA 指標数');
    expect(text).toContain('達成');
    expect(text).toContain('未達');
  });

  it('renders SLA item names from static data', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('重大インシデント初動対応');
    expect(text).toContain('高優先インシデント対応開始');
    expect(text).toContain('パッチ適用率');
    expect(text).toContain('ヘルプデスク応答時間');
    expect(text).toContain('バックアップ完了率');
  });

  it('renders status badge labels (達成, 注意, 未達)', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('達成');
    expect(text).toContain('注意');
    expect(text).toContain('未達');
  });

  it('renders table column headers', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('SLA 指標');
    expect(text).toContain('目標値');
    expect(text).toContain('実績値');
    expect(text).toContain('単位');
    expect(text).toContain('ステータス');
  });

  it('renders PDFエクスポート action button', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('PDFエクスポート');
  });

  it('renders SLA 指標一覧 section heading', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('SLA 指標一覧');
  });

  it('renders unit symbols (% and 分)', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('%');
    expect(text).toContain('分');
  });
});
