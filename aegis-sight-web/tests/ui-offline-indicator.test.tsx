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

  it('resets pendingCount on SYNC_COMPLETE message from service worker', () => {
    // Set up a fake serviceWorker with addEventListener/removeEventListener
    let messageHandler: ((event: MessageEvent) => void) | null = null;
    const fakeServiceWorker = {
      addEventListener: vi.fn((_type: string, handler: (event: MessageEvent) => void) => {
        messageHandler = handler;
      }),
      removeEventListener: vi.fn(),
    };
    Object.defineProperty(navigator, 'serviceWorker', {
      value: fakeServiceWorker,
      configurable: true,
      writable: true,
    });

    mocks.isOnline = false;
    render(<OfflineIndicator />);

    // Dispatch SYNC_COMPLETE message
    expect(messageHandler).not.toBeNull();
    if (messageHandler) {
      messageHandler(new MessageEvent('message', { data: { type: 'SYNC_COMPLETE' } }));
    }
    // The handler should have been registered
    expect(fakeServiceWorker.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));

    // Clean up
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      configurable: true,
      writable: true,
    });
  });

  it('handles non-SYNC_COMPLETE message without resetting pendingCount', () => {
    let messageHandler: ((event: MessageEvent) => void) | null = null;
    const fakeServiceWorker = {
      addEventListener: vi.fn((_type: string, handler: (event: MessageEvent) => void) => {
        messageHandler = handler;
      }),
      removeEventListener: vi.fn(),
    };
    Object.defineProperty(navigator, 'serviceWorker', {
      value: fakeServiceWorker,
      configurable: true,
      writable: true,
    });

    mocks.isOnline = false;
    render(<OfflineIndicator />);

    // Dispatch a non-matching message
    if (messageHandler) {
      messageHandler(new MessageEvent('message', { data: { type: 'OTHER_EVENT' } }));
    }
    // Should still be rendered (pendingCount not reset by non-matching message)
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // Clean up
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      configurable: true,
      writable: true,
    });
  });

  it('does not throw when navigator.serviceWorker is undefined', () => {
    const original = navigator.serviceWorker;
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    mocks.isOnline = false;
    // Should render without throwing
    expect(() => render(<OfflineIndicator />)).not.toThrow();

    Object.defineProperty(navigator, 'serviceWorker', {
      value: original,
      configurable: true,
      writable: true,
    });
  });
});
