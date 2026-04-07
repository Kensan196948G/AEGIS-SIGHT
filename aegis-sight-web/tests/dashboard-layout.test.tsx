import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock all UI components used by DashboardLayout
vi.mock('@/components/ui/sidebar', () => ({
  Sidebar: () => <nav data-testid="sidebar">Sidebar</nav>,
}));

vi.mock('@/components/ui/header', () => ({
  Header: () => <header data-testid="header">Header</header>,
}));

vi.mock('@/components/ui/skip-link', () => ({
  SkipLink: ({ targetId }: { targetId: string }) => (
    <a href={`#${targetId}`} data-testid="skip-link">Skip to content</a>
  ),
}));

vi.mock('@/components/ui/offline-indicator', () => ({
  OfflineIndicator: () => <div data-testid="offline-indicator" />,
}));

vi.mock('@/components/ui/pwa-install', () => ({
  PWAInstallPrompt: () => <div data-testid="pwa-install" />,
}));

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DashboardLayout (app/dashboard/layout.tsx)', () => {
  it('renders without crashing', async () => {
    const { default: Layout } = await import('@/app/dashboard/layout');
    const { container } = render(
      <Layout>
        <div data-testid="child">Page Content</div>
      </Layout>
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders children', async () => {
    const { default: Layout } = await import('@/app/dashboard/layout');
    render(
      <Layout>
        <div data-testid="child">Page Content</div>
      </Layout>
    );
    expect(screen.getByTestId('child')).toBeTruthy();
    expect(screen.getByText('Page Content')).toBeTruthy();
  });

  it('renders Sidebar', async () => {
    const { default: Layout } = await import('@/app/dashboard/layout');
    render(
      <Layout>
        <span />
      </Layout>
    );
    expect(screen.getByTestId('sidebar')).toBeTruthy();
  });

  it('renders Header', async () => {
    const { default: Layout } = await import('@/app/dashboard/layout');
    render(
      <Layout>
        <span />
      </Layout>
    );
    expect(screen.getByTestId('header')).toBeTruthy();
  });

  it('renders SkipLink with main-content target', async () => {
    const { default: Layout } = await import('@/app/dashboard/layout');
    render(
      <Layout>
        <span />
      </Layout>
    );
    const skipLink = screen.getByTestId('skip-link');
    expect(skipLink.getAttribute('href')).toBe('#main-content');
  });

  it('main element has id=main-content', async () => {
    const { default: Layout } = await import('@/app/dashboard/layout');
    render(
      <Layout>
        <span />
      </Layout>
    );
    expect(document.getElementById('main-content')).toBeTruthy();
  });

  it('renders OfflineIndicator and PWAInstallPrompt', async () => {
    const { default: Layout } = await import('@/app/dashboard/layout');
    render(
      <Layout>
        <span />
      </Layout>
    );
    expect(screen.getByTestId('offline-indicator')).toBeTruthy();
    expect(screen.getByTestId('pwa-install')).toBeTruthy();
  });
});
