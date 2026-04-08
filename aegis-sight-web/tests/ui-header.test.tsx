import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// vi.hoisted allows variables to be safely referenced in vi.mock factories
const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
  user: { name: 'Test User', email: 'test@example.com' } as { name: string; email: string } | null,
}));

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

vi.mock('@/components/ui/theme-toggle', () => ({
  ThemeToggle: () => <button aria-label="Toggle theme">Theme</button>,
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: mocks.user, logout: mocks.logout }),
}));

import { Header } from '@/components/ui/header';

describe('Header', () => {
  beforeEach(() => {
    mocks.logout.mockReset();
    mocks.user = { name: 'Test User', email: 'test@example.com' };
  });

  it('renders header element', () => {
    render(<Header />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('shows user initials from user name', () => {
    render(<Header />);
    // First letter of "Test User" = 'T'
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('shows user menu on avatar click', () => {
    render(<Header />);
    // The initials 'T' is inside the avatar button
    fireEvent.click(screen.getByText('T').closest('button')!);
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('hides user menu when clicked again', () => {
    render(<Header />);
    const btn = screen.getByText('T').closest('button')!;
    fireEvent.click(btn);
    expect(screen.getByText('Test User')).toBeInTheDocument();
    fireEvent.click(btn);
    expect(screen.queryByText('Test User')).toBeNull();
  });

  it('calls logout when logout button clicked', () => {
    render(<Header />);
    fireEvent.click(screen.getByText('T').closest('button')!);
    fireEvent.click(screen.getByText('ログアウト'));
    expect(mocks.logout).toHaveBeenCalledTimes(1);
  });

  it('renders mobile menu button', () => {
    render(<Header />);
    expect(screen.getByLabelText('メニューを開く')).toBeInTheDocument();
  });

  it('renders search link pointing to /dashboard/search', () => {
    render(<Header />);
    const link = screen.getByText('検索...').closest('a');
    expect(link).toHaveAttribute('href', '/dashboard/search');
  });

  it('renders notifications button', () => {
    render(<Header />);
    expect(screen.getByLabelText('通知')).toBeInTheDocument();
  });
});

describe('Header with null user', () => {
  beforeEach(() => {
    mocks.user = null;
  });

  it('falls back to 管理者 initials when user is null', () => {
    render(<Header />);
    // First letter of '管理者' = '管'
    expect(screen.getByText('管')).toBeInTheDocument();
  });
});
