import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SkipLink } from '@/components/ui/skip-link';

describe('SkipLink', () => {
  it('renders default label and target', () => {
    render(<SkipLink />);
    const link = screen.getByRole('link');
    expect(link).toHaveTextContent('メインコンテンツへスキップ');
    expect(link).toHaveAttribute('href', '#main-content');
  });

  it('renders custom targetId', () => {
    render(<SkipLink targetId="content" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '#content');
  });

  it('renders custom label', () => {
    render(<SkipLink label="Skip to nav" />);
    expect(screen.getByRole('link')).toHaveTextContent('Skip to nav');
  });
});
