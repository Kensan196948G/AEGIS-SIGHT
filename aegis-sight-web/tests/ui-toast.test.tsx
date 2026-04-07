import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider, useToast } from '@/components/ui/toast';

// crypto.randomUUID polyfill for jsdom
beforeEach(() => {
  let counter = 0;
  vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(
    () => `mock-uuid-${++counter}` as `${string}-${string}-${string}-${string}-${string}`
  );
});

function ToastTrigger({ type = 'success', title = 'Test toast', message }: {
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message?: string;
}) {
  const { addToast } = useToast();
  return (
    <button onClick={() => addToast({ type, title, message })}>
      Add Toast
    </button>
  );
}

function renderWithProvider(props = {}) {
  return render(
    <ToastProvider>
      <ToastTrigger {...props} />
    </ToastProvider>
  );
}

describe('useToast', () => {
  it('throws outside ToastProvider', () => {
    const err = console.error;
    console.error = vi.fn();
    expect(() => render(<ToastTrigger />)).toThrow('useToast must be used within a ToastProvider');
    console.error = err;
  });
});

describe('ToastProvider', () => {
  it('renders children', () => {
    render(<ToastProvider><span>child</span></ToastProvider>);
    expect(screen.getByText('child')).toBeInTheDocument();
  });

  it('adds and displays a success toast', () => {
    renderWithProvider({ type: 'success', title: 'Success!' });
    fireEvent.click(screen.getByText('Add Toast'));
    expect(screen.getByText('Success!')).toBeInTheDocument();
  });

  it('displays optional message', () => {
    renderWithProvider({ title: 'Hi', message: 'Details here' });
    fireEvent.click(screen.getByText('Add Toast'));
    expect(screen.getByText('Details here')).toBeInTheDocument();
  });

  it('removes toast when close button clicked', () => {
    renderWithProvider({ title: 'Closeable' });
    fireEvent.click(screen.getByText('Add Toast'));
    expect(screen.getByText('Closeable')).toBeInTheDocument();
    const closeBtn = screen.getByRole('button', { name: '' }); // svg button
    // Find the × button in the toast (not the trigger)
    const closeButtons = screen.getAllByRole('button');
    // Last button in toasts area is the close button
    fireEvent.click(closeButtons[closeButtons.length - 1]);
    expect(screen.queryByText('Closeable')).toBeNull();
  });

  it('auto-removes toast after 5 seconds', async () => {
    vi.useFakeTimers();
    renderWithProvider({ title: 'Auto-remove' });
    fireEvent.click(screen.getByText('Add Toast'));
    expect(screen.getByText('Auto-remove')).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(5100);
    });
    expect(screen.queryByText('Auto-remove')).toBeNull();
    vi.useRealTimers();
  });

  const toastTypes = ['success', 'error', 'warning', 'info'] as const;
  toastTypes.forEach((type) => {
    it(`renders ${type} toast`, () => {
      renderWithProvider({ type, title: `${type} toast` });
      fireEvent.click(screen.getByText('Add Toast'));
      expect(screen.getByText(`${type} toast`)).toBeInTheDocument();
    });
  });

  it('stacks multiple toasts', () => {
    renderWithProvider({ title: 'Toast' });
    fireEvent.click(screen.getByText('Add Toast'));
    fireEvent.click(screen.getByText('Add Toast'));
    expect(screen.getAllByText('Toast')).toHaveLength(2);
  });
});
