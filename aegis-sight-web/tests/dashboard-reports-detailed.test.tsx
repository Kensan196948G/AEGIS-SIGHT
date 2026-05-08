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
  usePathname: () => '/dashboard/reports',
}));

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const importPage = async () => {
  const mod = await import('@/app/dashboard/reports/page');
  return mod.default;
};

describe('Reports page (static design-data driven)', () => {
  it('renders レポート heading', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('レポート');
  });

  it('renders subtitle about セキュリティ・コンプライアンス・運用レポート', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('運用レポート');
  });

  it('renders summary stats (レポート数, 準備完了, 生成中)', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('レポート数');
    expect(text).toContain('準備完了');
    expect(text).toContain('生成中');
  });

  it('renders report names from static data', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('月次セキュリティサマリーレポート');
    expect(text).toContain('パッチ適用状況レポート');
    expect(text).toContain('コンプライアンス準拠状況レポート');
  });

  it('renders categories', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('セキュリティ');
    expect(text).toContain('パッチ管理');
    expect(text).toContain('コンプライアンス');
    expect(text).toContain('SAM');
  });

  it('renders periods', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('2024年12月');
    expect(text).toContain('Q4 2024');
  });

  it('renders format labels (PDF/Excel/CSV)', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('PDF');
    expect(text).toContain('Excel');
    expect(text).toContain('CSV');
  });

  it('renders status labels (準備完了, 生成中)', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('準備完了');
    expect(text).toContain('生成中');
  });

  it('renders ダウンロード button for ready reports', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('ダウンロード');
  });

  it('renders レポートを生成 action button', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('レポートを生成');
  });

  it('renders table column headers', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('レポート名');
    expect(text).toContain('カテゴリ');
    expect(text).toContain('対象期間');
    expect(text).toContain('形式');
    expect(text).toContain('サイズ');
    expect(text).toContain('作成日');
    expect(text).toContain('ステータス');
  });
});
