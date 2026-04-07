import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SearchInput } from '@/components/ui/search-input';

describe('SearchInput', () => {
  it('renders with default placeholder', () => {
    render(<SearchInput onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('検索...')).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(<SearchInput onChange={vi.fn()} placeholder="名前を検索" />);
    expect(screen.getByPlaceholderText('名前を検索')).toBeInTheDocument();
  });

  it('displays controlled value', () => {
    render(<SearchInput value="hello" onChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toHaveValue('hello');
  });

  it('syncs when controlled value changes', () => {
    const { rerender } = render(<SearchInput value="a" onChange={vi.fn()} />);
    rerender(<SearchInput value="b" onChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toHaveValue('b');
  });

  it('calls onChange with debounce', async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<SearchInput onChange={onChange} debounceMs={300} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } });
    expect(onChange).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(300); });
    expect(onChange).toHaveBeenCalledWith('test');
    vi.useRealTimers();
  });

  it('shows clear button when value is not empty', () => {
    render(<SearchInput value="hello" onChange={vi.fn()} />);
    expect(screen.getByLabelText('検索をクリア')).toBeInTheDocument();
  });

  it('does not show clear button when value is empty', () => {
    render(<SearchInput value="" onChange={vi.fn()} />);
    expect(screen.queryByLabelText('検索をクリア')).toBeNull();
  });

  it('clears value and calls onChange immediately on clear click', () => {
    const onChange = vi.fn();
    render(<SearchInput value="hello" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('検索をクリア'));
    expect(onChange).toHaveBeenCalledWith('');
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('is disabled when disabled=true', () => {
    render(<SearchInput onChange={vi.fn()} disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('does not show clear button when disabled and has value', () => {
    render(<SearchInput value="hello" onChange={vi.fn()} disabled />);
    expect(screen.queryByLabelText('検索をクリア')).toBeNull();
  });

  it('accepts extra className', () => {
    const { container } = render(<SearchInput onChange={vi.fn()} className="my-class" />);
    expect(container.firstChild).toHaveClass('my-class');
  });
});
