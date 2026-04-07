import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';

describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('applies default variant styles', () => {
    render(<Badge>Default</Badge>);
    const el = screen.getByText('Default');
    expect(el.className).toContain('bg-gray-100');
  });

  const variants = ['success', 'warning', 'danger', 'info', 'purple', 'outline'] as const;
  variants.forEach((variant) => {
    it(`applies ${variant} variant`, () => {
      render(<Badge variant={variant}>{variant}</Badge>);
      expect(screen.getByText(variant)).toBeInTheDocument();
    });
  });

  it('renders dot indicator when dot=true', () => {
    const { container } = render(<Badge dot>With dot</Badge>);
    const dot = container.querySelector('.h-1\\.5.w-1\\.5.rounded-full');
    expect(dot).toBeInTheDocument();
  });

  it('does not render dot when dot=false', () => {
    const { container } = render(<Badge dot={false}>No dot</Badge>);
    const dot = container.querySelector('.h-1\\.5');
    expect(dot).toBeNull();
  });

  it('applies sm size by default', () => {
    render(<Badge>Sm</Badge>);
    expect(screen.getByText('Sm').className).toContain('px-2 py-0.5');
  });

  it('applies md size', () => {
    render(<Badge size="md">Md</Badge>);
    expect(screen.getByText('Md').className).toContain('px-2.5 py-1');
  });

  it('accepts extra className', () => {
    render(<Badge className="my-extra">Extra</Badge>);
    expect(screen.getByText('Extra').className).toContain('my-extra');
  });
});
