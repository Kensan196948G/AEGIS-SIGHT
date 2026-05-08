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
  usePathname: () => '/dashboard/patches',
}));

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const importPage = async () => {
  const mod = await import('@/app/dashboard/patches/page');
  return mod.default;
};

describe('Patches page (static design-data driven)', () => {
  it('renders パッチ管理 heading', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('パッチ管理');
  });

  it('renders subtitle about Windows Update', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('Windows Update');
  });

  it('renders summary stats labels', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('適用率');
    expect(text).toContain('管理パッチ数');
    expect(text).toContain('適用待ち');
    expect(text).toContain('失敗');
  });

  it('renders patch titles from static data', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('KB5034441');
    expect(text).toContain('CVE-2025-21333');
    expect(text).toContain('Adobe Acrobat Reader');
    expect(text).toContain('Chrome 131');
  });

  it('renders severity labels (緊急, 重要, 中, 低)', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('緊急');
    expect(text).toContain('重要');
    expect(text).toContain('中');
    expect(text).toContain('低');
  });

  it('renders status labels (一部失敗, 適用中)', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('一部失敗');
    expect(text).toContain('適用中');
  });

  it('renders action buttons', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('CSVエクスポート');
    expect(text).toContain('パッチを追加');
  });

  it('renders table column headers', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('パッチ名');
    expect(text).toContain('重要度');
    expect(text).toContain('リリース日');
    expect(text).toContain('ステータス');
  });

  it('renders total count footer', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('全 6 件中 6 件を表示');
  });

  it('renders severity option labels in select', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('すべての重要度');
  });

  it('search filter narrows the patch list', async () => {
    const Page = await importPage();
    const { container } = render(<Page />);
    const input = container.querySelector('input[type="search"], input[type="text"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    fireEvent.change(input, { target: { value: 'KB' } });
    expect(document.body.textContent).toContain('KB5034441');
  });

  it('severity filter changes visible count', async () => {
    const Page = await importPage();
    const { container } = render(<Page />);
    const select = container.querySelector('select') as HTMLSelectElement;
    expect(select).toBeTruthy();
    fireEvent.change(select, { target: { value: 'critical' } });
    expect(document.body.textContent).toContain('全 6 件中 2 件を表示');
  });
});
