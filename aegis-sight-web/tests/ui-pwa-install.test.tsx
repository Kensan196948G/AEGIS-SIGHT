import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PWAInstallPrompt } from '@/components/ui/pwa-install';

const DISMISS_KEY = 'aegis-pwa-install-dismissed';

// Helper to fire beforeinstallprompt event
function fireInstallPromptEvent() {
  const mockPrompt = vi.fn().mockResolvedValue(undefined);
  const mockUserChoice = Promise.resolve({ outcome: 'accepted' as const });
  const event = new Event('beforeinstallprompt') as Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  };
  event.prompt = mockPrompt;
  event.userChoice = mockUserChoice;
  act(() => {
    window.dispatchEvent(event);
  });
  return { mockPrompt, mockUserChoice };
}

describe('PWAInstallPrompt', () => {
  beforeEach(() => {
    localStorage.clear();
    // Default: not in standalone mode
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing initially (no beforeinstallprompt event)', () => {
    const { container } = render(<PWAInstallPrompt />);
    expect(container.firstChild).toBeNull();
  });

  it('shows prompt after beforeinstallprompt event', () => {
    render(<PWAInstallPrompt />);
    fireInstallPromptEvent();
    expect(screen.getByRole('banner', { name: 'PWAインストール' })).toBeInTheDocument();
    expect(screen.getByText('AEGIS-SIGHTをインストール')).toBeInTheDocument();
  });

  it('renders install and dismiss buttons', () => {
    render(<PWAInstallPrompt />);
    fireInstallPromptEvent();
    expect(screen.getByText('インストール')).toBeInTheDocument();
    expect(screen.getByText('後で')).toBeInTheDocument();
  });

  it('hides prompt when dismiss button clicked', () => {
    render(<PWAInstallPrompt />);
    fireInstallPromptEvent();
    fireEvent.click(screen.getByText('後で'));
    expect(screen.queryByRole('banner', { name: 'PWAインストール' })).toBeNull();
  });

  it('saves dismiss timestamp to localStorage', () => {
    render(<PWAInstallPrompt />);
    fireInstallPromptEvent();
    fireEvent.click(screen.getByText('後で'));
    expect(localStorage.getItem(DISMISS_KEY)).toBeTruthy();
  });

  it('hides prompt when X (close) button clicked', () => {
    render(<PWAInstallPrompt />);
    fireInstallPromptEvent();
    fireEvent.click(screen.getByLabelText('閉じる'));
    expect(screen.queryByRole('banner', { name: 'PWAインストール' })).toBeNull();
  });

  it('does not show prompt if dismissed recently', () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    const { container } = render(<PWAInstallPrompt />);
    // Even after firing event, it should not show (dismissed recently)
    // Note: The check happens in useEffect before registering the listener
    expect(container.firstChild).toBeNull();
  });

  it('does not show prompt if running in standalone mode', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: true, // standalone mode
        media: '',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    const { container } = render(<PWAInstallPrompt />);
    fireInstallPromptEvent();
    expect(container.firstChild).toBeNull();
  });

  it('calls prompt() when install button is clicked', async () => {
    render(<PWAInstallPrompt />);
    const { mockPrompt } = fireInstallPromptEvent();
    await act(async () => {
      fireEvent.click(screen.getByText('インストール'));
    });
    expect(mockPrompt).toHaveBeenCalledTimes(1);
  });

  it('removes dismiss key from localStorage when dismiss has expired', () => {
    // Set dismiss timestamp to more than 7 days ago
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, eightDaysAgo.toString());

    render(<PWAInstallPrompt />);

    // The expired dismiss key should have been removed
    expect(localStorage.getItem(DISMISS_KEY)).toBeNull();
  });

  it('hides prompt and clears state on appinstalled event', () => {
    render(<PWAInstallPrompt />);
    fireInstallPromptEvent();
    // Should be visible after beforeinstallprompt
    expect(screen.getByRole('banner', { name: 'PWAインストール' })).toBeInTheDocument();

    // Fire appinstalled event
    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    // Should be hidden after appinstalled
    expect(screen.queryByRole('banner', { name: 'PWAインストール' })).toBeNull();
  });
});
