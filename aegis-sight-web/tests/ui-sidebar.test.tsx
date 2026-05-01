import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dashboard'),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, className, onClick }: { href: string; children: React.ReactNode; className?: string; onClick?: () => void }) => (
    <a href={href} className={className} onClick={onClick}>{children}</a>
  ),
}));

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/ui/sidebar';

describe('Sidebar', () => {
  it('renders aside element', () => {
    render(<Sidebar />);
    expect(screen.getByRole('complementary')).toBeInTheDocument();
  });

  it('renders AEGIS-SIGHT brand title', () => {
    render(<Sidebar />);
    expect(screen.getByText('AEGIS-SIGHT')).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    render(<Sidebar />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    // ダッシュボードリンクが存在する
    const dashboardLinks = screen.getAllByRole('link', { name: /ダッシュボード/ });
    expect(dashboardLinks.length).toBeGreaterThan(0);
  });

  it('marks dashboard link as active when on /dashboard', () => {
    vi.mocked(usePathname).mockReturnValue('/dashboard');
    render(<Sidebar />);
    const links = screen.getAllByRole('link');
    const dashLink = links.find((l) => l.getAttribute('href') === '/dashboard');
    expect(dashLink).toHaveClass('bg-primary-50');
  });

  it('marks child route link as active when on /dashboard/assets', () => {
    vi.mocked(usePathname).mockReturnValue('/dashboard/assets');
    render(<Sidebar />);
    const links = screen.getAllByRole('link');
    const assetsLink = links.find((l) => l.getAttribute('href') === '/dashboard/assets');
    expect(assetsLink).toHaveClass('bg-primary-50');
  });

  it('does not mark dashboard link as active for child routes', () => {
    vi.mocked(usePathname).mockReturnValue('/dashboard/assets');
    render(<Sidebar />);
    const links = screen.getAllByRole('link');
    const dashLink = links.find((l) => l.getAttribute('href') === '/dashboard');
    expect(dashLink).not.toHaveClass('bg-primary-50');
  });

  it('renders key navigation items', () => {
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: /資産管理/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ユーザー管理/ })).toBeInTheDocument();
    // Use exact text to avoid matching '通知設定' as well
    expect(screen.getByRole('link', { name: '設定' })).toBeInTheDocument();
  });

  it('renders footer with admin info', () => {
    render(<Sidebar />);
    expect(screen.getByText('管理者')).toBeInTheDocument();
    expect(screen.getByText('admin@aegis-sight.local')).toBeInTheDocument();
  });
});

describe('Sidebar - mobile props', () => {
  it('renders with mobileOpen=false (default, sidebar hidden on mobile)', () => {
    const { container } = render(<Sidebar mobileOpen={false} />);
    const aside = container.querySelector('aside');
    expect(aside?.className).toContain('-translate-x-full');
  });

  it('renders with mobileOpen=true (sidebar visible on mobile)', () => {
    const { container } = render(<Sidebar mobileOpen={true} />);
    const aside = container.querySelector('aside');
    // translate-x-0 should be present (not -translate-x-full)
    expect(aside?.className).not.toContain('-translate-x-full');
  });

  it('calls onMobileClose when nav link clicked on mobile', () => {
    const onMobileClose = vi.fn();
    render(<Sidebar mobileOpen={true} onMobileClose={onMobileClose} />);
    const links = screen.getAllByRole('link');
    fireEvent.click(links[0]);
    expect(onMobileClose).toHaveBeenCalledTimes(1);
  });
});
