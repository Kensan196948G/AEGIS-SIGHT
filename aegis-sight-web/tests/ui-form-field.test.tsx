import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from '@/components/ui/form-field';

describe('FormField - text input (default)', () => {
  it('renders label and input', () => {
    render(<FormField label="名前" name="name" />);
    expect(screen.getByLabelText('名前')).toBeInTheDocument();
  });

  it('shows required asterisk when required=true', () => {
    render(<FormField label="名前" name="name" required />);
    // The asterisk is a span inside the label
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('does not show asterisk when required=false', () => {
    render(<FormField label="名前" name="name" />);
    expect(screen.queryByText('*')).toBeNull();
  });

  it('renders placeholder', () => {
    render(<FormField label="名前" name="name" placeholder="名前を入力" />);
    expect(screen.getByPlaceholderText('名前を入力')).toBeInTheDocument();
  });

  it('renders controlled value', () => {
    render(<FormField label="名前" name="name" value="テスト" onChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toHaveValue('テスト');
  });

  it('is disabled when disabled=true', () => {
    render(<FormField label="名前" name="name" disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('shows error message', () => {
    render(<FormField label="名前" name="name" error="必須項目です" />);
    expect(screen.getByRole('alert')).toHaveTextContent('必須項目です');
  });

  it('sets aria-invalid when error is present', () => {
    render(<FormField label="名前" name="name" error="エラー" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows hint when no error', () => {
    render(<FormField label="名前" name="name" hint="ヒントです" />);
    expect(screen.getByText('ヒントです')).toBeInTheDocument();
  });

  it('hides hint when error is shown', () => {
    render(<FormField label="名前" name="name" hint="ヒント" error="エラー" />);
    expect(screen.queryByText('ヒント')).toBeNull();
    expect(screen.getByText('エラー')).toBeInTheDocument();
  });

  it('applies extra className to wrapper', () => {
    const { container } = render(<FormField label="名前" name="name" className="my-class" />);
    expect(container.firstChild).toHaveClass('my-class');
  });
});

describe('FormField - email', () => {
  it('renders email input', () => {
    render(<FormField label="メール" name="email" type="email" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');
  });
});

describe('FormField - password', () => {
  it('renders password input (no role=textbox)', () => {
    render(<FormField label="パスワード" name="password" type="password" />);
    // password inputs don't have role=textbox
    const input = document.querySelector('input[type="password"]');
    expect(input).toBeInTheDocument();
  });
});

describe('FormField - number', () => {
  it('renders number input with min/max/step', () => {
    render(<FormField label="数量" name="qty" type="number" min={1} max={100} step={5} />);
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('min', '1');
    expect(input).toHaveAttribute('max', '100');
    expect(input).toHaveAttribute('step', '5');
  });
});

describe('FormField - select', () => {
  const options = [
    { value: 'a', label: 'オプションA' },
    { value: 'b', label: 'オプションB' },
  ];

  it('renders select with options', () => {
    render(<FormField label="選択" name="choice" type="select" options={options} value="a" onChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('オプションA')).toBeInTheDocument();
    expect(screen.getByText('オプションB')).toBeInTheDocument();
  });

  it('renders placeholder as disabled option', () => {
    render(
      <FormField
        label="選択"
        name="choice"
        type="select"
        options={options}
        placeholder="選んでください"
        onChange={vi.fn()}
      />
    );
    const placeholder = screen.getByText('選んでください');
    expect(placeholder).toBeInTheDocument();
    expect(placeholder).toBeDisabled();
  });
});

describe('FormField - textarea', () => {
  it('renders textarea', () => {
    render(<FormField label="説明" name="desc" type="textarea" />);
    expect(screen.getByRole('textbox').tagName).toBe('TEXTAREA');
  });

  it('respects rows prop', () => {
    render(<FormField label="説明" name="desc" type="textarea" rows={5} />);
    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '5');
  });
});
