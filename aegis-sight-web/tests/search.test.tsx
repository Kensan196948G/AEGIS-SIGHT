import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock next/navigation before importing the component
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => (key === 'q' ? '' : 'all'),
  }),
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

import SearchPage from '@/app/dashboard/search/page';

describe('SearchPage', () => {
  it('renders the search heading', async () => {
    render(<SearchPage />);
    // Suspense resolves synchronously in jsdom
    expect(await screen.findByText('統合検索')).toBeInTheDocument();
  });

  it('renders the search input with placeholder', async () => {
    render(<SearchPage />);
    const input = await screen.findByPlaceholderText(
      'デバイス名、ライセンス、調達番号、アラートを検索...'
    );
    expect(input).toBeInTheDocument();
  });

  it('renders the search button', async () => {
    render(<SearchPage />);
    expect(await screen.findByRole('button', { name: '検索' })).toBeInTheDocument();
  });

  it('renders all type filter tabs', async () => {
    render(<SearchPage />);
    expect(await screen.findByRole('button', { name: /すべて/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /デバイス/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ライセンス/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /調達/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /アラート/ })).toBeInTheDocument();
  });

  it('shows empty state prompt when no search performed', async () => {
    render(<SearchPage />);
    expect(
      await screen.findByText('検索キーワードを入力してください')
    ).toBeInTheDocument();
  });
});

describe('highlightMatch (via rendered output)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('shows empty state description text', async () => {
    render(<SearchPage />);
    expect(
      await screen.findByText(
        'デバイス名、IPアドレス、ソフトウェア名、調達番号、アラートタイトルで検索できます'
      )
    ).toBeInTheDocument();
  });
});
