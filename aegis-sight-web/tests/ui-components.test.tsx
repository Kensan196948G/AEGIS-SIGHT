import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../components/ui/badge';
import { Spinner, Skeleton, PageLoading, TableSkeleton } from '../components/ui/loading';
import { StatCard } from '../components/ui/stat-card';

// ─── Badge ─────────────────────────────────────────────────────────────────

describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge>テスト</Badge>);
    expect(screen.getByText('テスト')).toBeInTheDocument();
  });

  it('renders with default variant', () => {
    render(<Badge>default</Badge>);
    const el = screen.getByText('default');
    expect(el).toBeInTheDocument();
  });

  it('renders success variant', () => {
    render(<Badge variant="success">成功</Badge>);
    const el = screen.getByText('成功');
    expect(el.className).toContain('emerald');
  });

  it('renders warning variant', () => {
    render(<Badge variant="warning">警告</Badge>);
    const el = screen.getByText('警告');
    expect(el.className).toContain('amber');
  });

  it('renders danger variant', () => {
    render(<Badge variant="danger">危険</Badge>);
    const el = screen.getByText('危険');
    expect(el.className).toContain('red');
  });

  it('renders info variant', () => {
    render(<Badge variant="info">情報</Badge>);
    const el = screen.getByText('情報');
    expect(el.className).toContain('blue');
  });

  it('renders purple variant', () => {
    render(<Badge variant="purple">紫</Badge>);
    const el = screen.getByText('紫');
    expect(el.className).toContain('purple');
  });

  it('renders outline variant', () => {
    render(<Badge variant="outline">枠</Badge>);
    const el = screen.getByText('枠');
    expect(el.className).toContain('border');
  });

  it('renders md size', () => {
    render(<Badge size="md">MD</Badge>);
    const el = screen.getByText('MD');
    expect(el.className).toContain('px-2.5');
  });

  it('renders sm size', () => {
    render(<Badge size="sm">SM</Badge>);
    const el = screen.getByText('SM');
    expect(el.className).toContain('px-2');
  });

  it('renders dot indicator when dot=true', () => {
    const { container } = render(<Badge dot>ドット</Badge>);
    // dot renders a span sibling inside the badge
    const spans = container.querySelectorAll('span span');
    expect(spans.length).toBeGreaterThan(0);
  });

  it('does not render dot when dot=false', () => {
    const { container } = render(<Badge dot={false}>ノードット</Badge>);
    const spans = container.querySelectorAll('span span');
    expect(spans.length).toBe(0);
  });

  it('applies custom className', () => {
    render(<Badge className="custom-class">カスタム</Badge>);
    const el = screen.getByText('カスタム');
    expect(el.className).toContain('custom-class');
  });
});

// ─── Spinner ────────────────────────────────────────────────────────────────

describe('Spinner', () => {
  it('renders with aria-label', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('読み込み中')).toBeInTheDocument();
  });

  it('renders sm size', () => {
    const { container } = render(<Spinner size="sm" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('h-4');
  });

  it('renders lg size', () => {
    const { container } = render(<Spinner size="lg" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('h-12');
  });

  it('applies custom className', () => {
    const { container } = render(<Spinner className="my-spinner" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('my-spinner');
  });
});

// ─── Skeleton ────────────────────────────────────────────────────────────────

describe('Skeleton', () => {
  it('renders single line by default', () => {
    const { container } = render(<Skeleton />);
    const lines = container.querySelectorAll('.rounded.bg-gray-200');
    expect(lines.length).toBe(1);
  });

  it('renders multiple lines when lines prop is provided', () => {
    const { container } = render(<Skeleton lines={3} />);
    const lines = container.querySelectorAll('.rounded.bg-gray-200');
    expect(lines.length).toBe(3);
  });
});

// ─── PageLoading ─────────────────────────────────────────────────────────────

describe('PageLoading', () => {
  it('renders default loading message', () => {
    render(<PageLoading />);
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('renders custom message', () => {
    render(<PageLoading message="データを取得中..." />);
    expect(screen.getByText('データを取得中...')).toBeInTheDocument();
  });
});

// ─── TableSkeleton ───────────────────────────────────────────────────────────

describe('TableSkeleton', () => {
  it('renders without errors', () => {
    const { container } = render(<TableSkeleton />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders with custom rows and cols', () => {
    const { container } = render(<TableSkeleton rows={3} cols={2} />);
    expect(container.firstChild).not.toBeNull();
  });
});

// ─── StatCard ─────────────────────────────────────────────────────────────────

describe('StatCard', () => {
  const TestIcon = () => <svg data-testid="icon" />;

  it('renders title and value', () => {
    render(<StatCard title="管理端末数" value="1,284" icon={<TestIcon />} />);
    expect(screen.getByText('管理端末数')).toBeInTheDocument();
    expect(screen.getByText('1,284')).toBeInTheDocument();
  });

  it('renders icon', () => {
    render(<StatCard title="テスト" value="42" icon={<TestIcon />} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('shows positive trend', () => {
    render(<StatCard title="A" value="10" trend={5} icon={<TestIcon />} />);
    expect(screen.getByText('+5%')).toBeInTheDocument();
    expect(screen.getByText('前月比')).toBeInTheDocument();
  });

  it('shows negative trend', () => {
    render(<StatCard title="A" value="10" trend={-3} icon={<TestIcon />} />);
    expect(screen.getByText('-3%')).toBeInTheDocument();
  });

  it('does not render trend section when trend is undefined', () => {
    render(<StatCard title="A" value="10" icon={<TestIcon />} />);
    expect(screen.queryByText('前月比')).not.toBeInTheDocument();
  });

  it('applies iconColor blue by default', () => {
    const { container } = render(<StatCard title="A" value="10" icon={<TestIcon />} />);
    // default iconColor = 'blue' → bg-primary-100
    const iconWrapper = container.querySelector('.rounded-xl');
    expect(iconWrapper).not.toBeNull();
  });

  it('applies iconColor red', () => {
    const { container } = render(
      <StatCard title="A" value="10" icon={<TestIcon />} iconColor="red" />
    );
    const iconWrapper = container.querySelector('.rounded-xl');
    expect(iconWrapper?.className).toContain('red');
  });

  it('applies iconColor green', () => {
    const { container } = render(
      <StatCard title="A" value="10" icon={<TestIcon />} iconColor="green" />
    );
    const iconWrapper = container.querySelector('.rounded-xl');
    expect(iconWrapper?.className).toContain('emerald');
  });
});
