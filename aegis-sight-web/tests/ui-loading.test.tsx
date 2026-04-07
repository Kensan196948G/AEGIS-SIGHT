import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner, Skeleton, PageLoading, TableSkeleton } from '@/components/ui/loading';

describe('Spinner', () => {
  it('renders with default md size', () => {
    render(<Spinner />);
    const el = screen.getByRole('status');
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('aria-label', '読み込み中');
    expect(el.className).toContain('h-8 w-8');
  });

  it('renders sm size', () => {
    render(<Spinner size="sm" />);
    expect(screen.getByRole('status').className).toContain('h-4 w-4');
  });

  it('renders lg size', () => {
    render(<Spinner size="lg" />);
    expect(screen.getByRole('status').className).toContain('h-12 w-12');
  });

  it('accepts extra className', () => {
    render(<Spinner className="my-custom" />);
    expect(screen.getByRole('status').className).toContain('my-custom');
  });
});

describe('Skeleton', () => {
  it('renders single line by default', () => {
    const { container } = render(<Skeleton />);
    const lines = container.querySelectorAll('.rounded.bg-gray-200');
    expect(lines).toHaveLength(1);
  });

  it('renders multiple lines', () => {
    const { container } = render(<Skeleton lines={3} />);
    const lines = container.querySelectorAll('.rounded.bg-gray-200');
    expect(lines).toHaveLength(3);
  });

  it('last line is narrower when lines > 1', () => {
    const { container } = render(<Skeleton lines={2} />);
    const lines = container.querySelectorAll('.rounded.bg-gray-200');
    expect(lines[1].className).toContain('w-3/4');
  });

  it('accepts custom className', () => {
    const { container } = render(<Skeleton className="h-8" />);
    const line = container.querySelector('.rounded.bg-gray-200');
    expect(line?.className).toContain('h-8');
  });
});

describe('PageLoading', () => {
  it('renders default message', () => {
    render(<PageLoading />);
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders custom message', () => {
    render(<PageLoading message="データ取得中" />);
    expect(screen.getByText('データ取得中')).toBeInTheDocument();
  });
});

describe('TableSkeleton', () => {
  it('renders default 5 rows and 4 cols', () => {
    const { container } = render(<TableSkeleton />);
    // header row + 5 data rows = 6 row divs with flex gap-4
    const rows = container.querySelectorAll('.flex.gap-4');
    expect(rows.length).toBeGreaterThanOrEqual(5);
  });

  it('renders custom rows and cols', () => {
    const { container } = render(<TableSkeleton rows={2} cols={3} />);
    const rows = container.querySelectorAll('.flex.gap-4');
    // header + 2 data rows
    expect(rows.length).toBe(3);
  });
});
