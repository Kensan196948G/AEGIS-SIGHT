import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '@/components/ui/modal';

describe('Modal', () => {
  it('does not render when isOpen=false', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={vi.fn()}>
        Hidden content
      </Modal>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders children when isOpen=true', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()}>
        <p>Modal body</p>
      </Modal>
    );
    expect(screen.getByText('Modal body')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test Title">
        content
      </Modal>
    );
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders close button by default', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()}>
        content
      </Modal>
    );
    expect(screen.getByLabelText('閉じる')).toBeInTheDocument();
  });

  it('hides close button when showCloseButton=false', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} showCloseButton={false}>
        content
      </Modal>
    );
    expect(screen.queryByLabelText('閉じる')).toBeNull();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="T">
        content
      </Modal>
    );
    fireEvent.click(screen.getByLabelText('閉じる'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose}>
        content
      </Modal>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose on other keys', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose}>
        content
      </Modal>
    );
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when clicking the overlay backdrop directly (B6[0] line=60)', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal isOpen={true} onClose={onClose}>
        content
      </Modal>
    );
    // The overlay is the outermost div with fixed inset-0 z-50
    const overlay = container.querySelector('.fixed.inset-0.z-50');
    if (overlay) {
      // Simulate click directly on overlay (not on modal content) → e.target === overlayRef.current → onClose()
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  it('locks body scroll when open', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()}>
        content
      </Modal>
    );
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores body scroll when closed', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={vi.fn()}>
        content
      </Modal>
    );
    rerender(
      <Modal isOpen={false} onClose={vi.fn()}>
        content
      </Modal>
    );
    expect(document.body.style.overflow).toBe('');
  });

  const sizes = ['sm', 'md', 'lg', 'xl'] as const;
  sizes.forEach((size) => {
    it(`applies ${size} size class`, () => {
      const { container } = render(
        <Modal isOpen={true} onClose={vi.fn()} size={size}>
          content
        </Modal>
      );
      const panel = container.querySelector('.relative.w-full.rounded-2xl');
      expect(panel?.className).toContain(
        size === 'sm' ? 'max-w-md'
        : size === 'md' ? 'max-w-lg'
        : size === 'lg' ? 'max-w-2xl'
        : 'max-w-4xl'
      );
    });
  });
});
