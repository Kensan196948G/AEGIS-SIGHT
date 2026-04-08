import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Pagination } from '@/components/ui/pagination';

function renderPagination(overrides = {}) {
  const defaults = {
    currentPage: 1,
    totalItems: 100,
    pageSize: 10,
    onPageChange: vi.fn(),
  };
  return render(<Pagination {...defaults} {...overrides} />);
}

describe('Pagination', () => {
  it('shows item range text', () => {
    renderPagination({ currentPage: 1, totalItems: 100, pageSize: 10 });
    expect(screen.getByText('1-10 / 100件')).toBeInTheDocument();
  });

  it('shows 0件 when totalItems is 0', () => {
    renderPagination({ totalItems: 0 });
    expect(screen.getByText('0件')).toBeInTheDocument();
  });

  it('shows last partial page correctly', () => {
    renderPagination({ currentPage: 10, totalItems: 95, pageSize: 10 });
    expect(screen.getByText('91-95 / 95件')).toBeInTheDocument();
  });

  it('calls onPageChange when next button clicked', () => {
    const onPageChange = vi.fn();
    renderPagination({ currentPage: 1, totalItems: 50, pageSize: 10, onPageChange });
    fireEvent.click(screen.getByLabelText('次のページ'));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange when prev button clicked', () => {
    const onPageChange = vi.fn();
    renderPagination({ currentPage: 3, totalItems: 50, pageSize: 10, onPageChange });
    fireEvent.click(screen.getByLabelText('前のページ'));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('disables prev button on first page', () => {
    renderPagination({ currentPage: 1 });
    expect(screen.getByLabelText('前のページ')).toBeDisabled();
  });

  it('disables next button on last page', () => {
    renderPagination({ currentPage: 10, totalItems: 100, pageSize: 10 });
    expect(screen.getByLabelText('次のページ')).toBeDisabled();
  });

  it('renders page numbers for ≤7 pages', () => {
    renderPagination({ totalItems: 50, pageSize: 10 });
    // pages 1-5 should be visible
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument();
  });

  it('calls onPageChange when page number clicked', () => {
    const onPageChange = vi.fn();
    renderPagination({ currentPage: 1, totalItems: 30, pageSize: 10, onPageChange });
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('marks current page with aria-current', () => {
    renderPagination({ currentPage: 2, totalItems: 30, pageSize: 10 });
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: '1' })).not.toHaveAttribute('aria-current');
  });

  it('shows ellipsis for large page count', () => {
    renderPagination({ currentPage: 5, totalItems: 200, pageSize: 10 });
    const ellipses = screen.getAllByText('...');
    expect(ellipses.length).toBeGreaterThanOrEqual(1);
  });

  it('renders page size select when onPageSizeChange provided', () => {
    const onPageSizeChange = vi.fn();
    renderPagination({ onPageSizeChange });
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('calls onPageSizeChange when select changes', () => {
    const onPageSizeChange = vi.fn();
    renderPagination({ onPageSizeChange });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '25' } });
    expect(onPageSizeChange).toHaveBeenCalledWith(25);
  });

  it('does not render page size select without onPageSizeChange', () => {
    renderPagination();
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('renders custom pageSizeOptions', () => {
    const onPageSizeChange = vi.fn();
    renderPagination({ onPageSizeChange, pageSizeOptions: [5, 20] });
    expect(screen.getByRole('option', { name: '5件' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '20件' })).toBeInTheDocument();
  });
});
