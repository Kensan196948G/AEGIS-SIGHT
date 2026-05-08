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
  usePathname: () => '/dashboard/devices/DEV-0042',
  useParams: () => ({ id: 'DEV-0042' }),
}));

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const importPage = async () => {
  const mod = await import('@/app/dashboard/devices/[id]/page');
  return mod.default;
};

describe('Device Detail page (static design-data driven)', () => {
  it('renders hostname DESK-PC-0042', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('DESK-PC-0042');
  });

  it('renders OS version (Windows 11 Pro)', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('Windows 11 Pro');
  });

  it('renders IP address 192.168.1.142', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('192.168.1.142');
  });

  it('renders MAC address', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('AA:BB:CC:DD:EE:FF');
  });

  it('renders domain aegis.local', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('aegis.local');
  });

  it('renders active status badge', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('アクティブ');
  });

  it('renders breadcrumb back link to /dashboard/devices', async () => {
    const Page = await importPage();
    const { container } = render(<Page />);
    const link = container.querySelector('a[href="/dashboard/devices"]');
    expect(link).toBeTruthy();
  });

  it('renders 基本情報 section heading', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('基本情報');
  });

  it('renders software inventory entries (Microsoft 365)', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('Microsoft 365');
  });

  it('renders software inventory entries (Google Chrome)', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('Google Chrome');
  });

  it('renders software inventory entries (Sophos Intercept X)', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(document.body.textContent).toContain('Sophos Intercept X');
  });

  it('renders multiple software publishers', async () => {
    const Page = await importPage();
    render(<Page />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('Microsoft Corporation');
    expect(text).toContain('Google LLC');
  });
});
