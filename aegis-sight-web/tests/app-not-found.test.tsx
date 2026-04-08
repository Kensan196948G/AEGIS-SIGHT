import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import NotFound from '@/app/not-found';

describe('NotFound', () => {
  it('renders 404 text', () => {
    render(<NotFound />);
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renders Japanese not-found message', () => {
    render(<NotFound />);
    expect(screen.getByText('ページが見つかりません')).toBeInTheDocument();
  });

  it('renders explanation text', () => {
    render(<NotFound />);
    expect(
      screen.getByText(/お探しのページは移動または削除された可能性があります/)
    ).toBeInTheDocument();
  });

  it('renders dashboard link with correct href', () => {
    render(<NotFound />);
    const link = screen.getByText('ダッシュボードへ');
    expect(link).toHaveAttribute('href', '/dashboard');
  });

  it('renders top page link with correct href', () => {
    render(<NotFound />);
    const link = screen.getByText('トップページへ');
    expect(link).toHaveAttribute('href', '/');
  });

  it('renders branding text', () => {
    render(<NotFound />);
    expect(
      screen.getByText('AEGIS-SIGHT IT Management Platform')
    ).toBeInTheDocument();
  });
});
