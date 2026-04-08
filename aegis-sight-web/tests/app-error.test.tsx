import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorPage from '@/app/error';

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('ErrorPage', () => {
  const defaultError = Object.assign(new Error('Something went wrong'), {
    digest: 'abc123',
  });

  it('renders the error heading', () => {
    render(<ErrorPage error={defaultError} reset={vi.fn()} />);
    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
  });

  it('renders the error description', () => {
    render(<ErrorPage error={defaultError} reset={vi.fn()} />);
    expect(
      screen.getByText(/予期しないエラーが発生しました/)
    ).toBeInTheDocument();
  });

  it('renders the error message when present', () => {
    render(<ErrorPage error={defaultError} reset={vi.fn()} />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('does not render error details block when message is empty', () => {
    const emptyError = Object.assign(new Error(''), { digest: undefined });
    render(<ErrorPage error={emptyError} reset={vi.fn()} />);
    // The error details container should not be rendered
    expect(screen.queryByText('Digest:')).not.toBeInTheDocument();
  });

  it('renders digest when present', () => {
    render(<ErrorPage error={defaultError} reset={vi.fn()} />);
    expect(screen.getByText(/Digest: abc123/)).toBeInTheDocument();
  });

  it('does not render digest when absent', () => {
    const noDigestError = Object.assign(new Error('Some error'), {
      digest: undefined,
    });
    render(<ErrorPage error={noDigestError} reset={vi.fn()} />);
    expect(screen.getByText('Some error')).toBeInTheDocument();
    expect(screen.queryByText(/Digest:/)).not.toBeInTheDocument();
  });

  it('calls reset function when retry button is clicked', () => {
    const resetFn = vi.fn();
    render(<ErrorPage error={defaultError} reset={resetFn} />);
    fireEvent.click(screen.getByText('リトライ'));
    expect(resetFn).toHaveBeenCalledTimes(1);
  });

  it('renders dashboard link with correct href', () => {
    render(<ErrorPage error={defaultError} reset={vi.fn()} />);
    const link = screen.getByText('ダッシュボードへ');
    expect(link).toHaveAttribute('href', '/dashboard');
  });

  it('logs the error via useEffect', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorPage error={defaultError} reset={vi.fn()} />);
    expect(consoleSpy).toHaveBeenCalledWith('AEGIS-SIGHT error:', defaultError);
  });

  it('renders branding text', () => {
    render(<ErrorPage error={defaultError} reset={vi.fn()} />);
    expect(
      screen.getByText('AEGIS-SIGHT IT Management Platform')
    ).toBeInTheDocument();
  });
});
