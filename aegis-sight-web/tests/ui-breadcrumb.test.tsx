import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/sam',
}));

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

import { Breadcrumb } from '@/components/ui/breadcrumb';

describe('Breadcrumb', () => {
  it('renders nav with aria-label', () => {
    render(<Breadcrumb items={[{ label: 'Home', href: '/home' }]} />);
    expect(screen.getByRole('navigation', { name: 'パンくずリスト' })).toBeInTheDocument();
  });

  it('returns null when items is empty', () => {
    const { container } = render(<Breadcrumb items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders home icon link', () => {
    render(<Breadcrumb items={[{ label: 'Page', href: '/page' }]} />);
    const homeLink = screen.getByRole('link', { name: '' }); // svg-only link
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('renders provided items', () => {
    render(
      <Breadcrumb
        items={[
          { label: 'ダッシュボード', href: '/dashboard' },
          { label: 'SAM', href: '/dashboard/sam' },
        ]}
      />
    );
    // Last item (SAM) should be a span not a link
    expect(screen.getByText('SAM').tagName).toBe('SPAN');
    // First item (ダッシュボード) should be a link
    expect(screen.getByRole('link', { name: 'ダッシュボード' })).toHaveAttribute('href', '/dashboard');
  });

  it('auto-generates breadcrumbs from pathname when items not provided', () => {
    // pathname mock returns '/dashboard/sam'
    render(<Breadcrumb />);
    expect(screen.getByText('ダッシュボード')).toBeInTheDocument();
    expect(screen.getByText('SAM')).toBeInTheDocument();
  });

  it('capitalizes unknown path segments', () => {
    render(<Breadcrumb items={[{ label: 'Unknown', href: '/unknown' }]} />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('accepts extra className', () => {
    render(<Breadcrumb items={[{ label: 'X', href: '/x' }]} className="my-class" />);
    expect(screen.getByRole('navigation')).toHaveClass('my-class');
  });
});
