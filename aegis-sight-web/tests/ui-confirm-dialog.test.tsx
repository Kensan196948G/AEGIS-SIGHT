import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

function renderDialog(overrides = {}) {
  const defaults = {
    isOpen: true,
    title: 'Confirm Action',
    message: 'Are you sure?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };
  return render(<ConfirmDialog {...defaults} {...overrides} />);
}

describe('ConfirmDialog', () => {
  it('does not render when isOpen=false', () => {
    const { container } = renderDialog({ isOpen: false });
    expect(container.firstChild).toBeNull();
  });

  it('renders title and message when open', () => {
    renderDialog();
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('renders default confirm/cancel labels', () => {
    renderDialog();
    expect(screen.getByText('確認')).toBeInTheDocument();
    expect(screen.getByText('キャンセル')).toBeInTheDocument();
  });

  it('renders custom labels', () => {
    renderDialog({ confirmLabel: '削除', cancelLabel: '戻る' });
    expect(screen.getByText('削除')).toBeInTheDocument();
    expect(screen.getByText('戻る')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn();
    renderDialog({ onConfirm });
    fireEvent.click(screen.getByText('確認'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn();
    renderDialog({ onCancel });
    fireEvent.click(screen.getByText('キャンセル'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel on Escape key', () => {
    const onCancel = vi.fn();
    renderDialog({ onCancel });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows loading state with spinner text', () => {
    renderDialog({ loading: true });
    expect(screen.getByText('処理中...')).toBeInTheDocument();
  });

  it('disables buttons when loading', () => {
    renderDialog({ loading: true });
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => expect(btn).toBeDisabled());
  });

  const severities = ['danger', 'warning', 'info'] as const;
  severities.forEach((severity) => {
    it(`renders ${severity} severity`, () => {
      renderDialog({ severity });
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    });
  });

  it('locks body scroll when open', () => {
    renderDialog();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores body scroll on close', () => {
    const { rerender } = renderDialog({ isOpen: true, onConfirm: vi.fn(), onCancel: vi.fn() });
    rerender(
      <ConfirmDialog
        isOpen={false}
        title="T"
        message="M"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(document.body.style.overflow).toBe('');
  });
});
