import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/procurement/PRQ-2025-0042',
  useParams: () => ({ id: 'PRQ-2025-0042' }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const importPage = async () => {
  const mod = await import('@/app/dashboard/procurement/[id]/page');
  return mod.default;
};

describe('Procurement Detail page (static design-data driven)', () => {
  it('renders procurement ID heading', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('PRQ-2025-0042');
  });

  it('renders item name', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('Dell Latitude 5540');
  });

  it('renders department', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('エンジニアリング部');
  });

  it('renders approved status badge label', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('承認済');
  });

  it('renders qty 20', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('20');
  });

  it('renders status stepper labels', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('下書き');
    expect(text).toContain('申請中');
    expect(text).toContain('承認済');
    expect(text).toContain('発注済');
    expect(text).toContain('納品済');
    expect(text).toContain('完了');
  });

  it('renders timeline events', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('申請作成');
    expect(text).toContain('申請提出');
    expect(text).toContain('上長承認');
  });

  it('renders pricing total 3,560,000', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('3,560,000');
  });

  it('renders breadcrumb back link to /dashboard/procurement', async () => {
    const Page = await importPage();
    const { container } = render(<Page />);
    const link = container.querySelector('a[href="/dashboard/procurement"]');
    expect(link).toBeTruthy();
  });

  it('shows 発注済みにする button when status is approved', async () => {
    const Page = await importPage();
    const { getByText } = render(<Page />);
    expect(getByText('発注済みにする')).toBeTruthy();
  });

  it('opens confirm Modal when 発注済みにする clicked', async () => {
    const Page = await importPage();
    const { getByText, queryByText } = render(<Page />);
    expect(queryByText('操作の確認')).toBeNull();
    fireEvent.click(getByText('発注済みにする'));
    expect(getByText('操作の確認')).toBeTruthy();
  });

  it('hides action button after confirm', async () => {
    const Page = await importPage();
    const { getByText, queryByText } = render(<Page />);
    fireEvent.click(getByText('発注済みにする'));
    fireEvent.click(getByText('確定'));
    expect(queryByText('発注済みにする')).toBeNull();
  });

  it('cancels Modal without changing state', async () => {
    const Page = await importPage();
    const { getByText, queryByText } = render(<Page />);
    fireEvent.click(getByText('発注済みにする'));
    fireEvent.click(getByText('キャンセル'));
    expect(queryByText('操作の確認')).toBeNull();
    expect(getByText('発注済みにする')).toBeTruthy();
  });
});
