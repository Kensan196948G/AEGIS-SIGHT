import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  isOnline: true,
}));

vi.mock('@/lib/use-online-status', () => ({
  useOnlineStatus: () => mocks.isOnline,
}));

// Mock dynamic import for offline-storage
vi.mock('@/lib/offline-storage', () => ({
  getOfflineOperations: async () => [],
}));

import { OfflineIndicator } from '@/components/ui/offline-indicator';

describe('OfflineIndicator', () => {
  beforeEach(() => {
    mocks.isOnline = true;
  });

  it('renders nothing when online', () => {
    mocks.isOnline = true;
    const { container } = render(<OfflineIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it('renders offline alert when offline', () => {
    mocks.isOnline = false;
    render(<OfflineIndicator />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/オフラインモード/)).toBeInTheDocument();
  });

  it('has correct aria-live attribute', () => {
    mocks.isOnline = false;
    render(<OfflineIndicator />);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
  });
});
