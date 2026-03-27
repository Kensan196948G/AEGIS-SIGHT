import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { Spinner, Skeleton, PageLoading, TableSkeleton } from '@/components/ui/loading';
import { DataTable } from '@/components/ui/data-table';

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------
describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('applies default variant styling', () => {
    const { container } = render(<Badge>Default</Badge>);
    const span = container.querySelector('span');
    expect(span).toBeTruthy();
    expect(span!.className).toContain('rounded-full');
  });

  it('applies the success variant', () => {
    const { container } = render(<Badge variant="success">OK</Badge>);
    const span = container.querySelector('span');
    expect(span!.className).toContain('bg-emerald-100');
  });

  it('applies the danger variant', () => {
    const { container } = render(<Badge variant="danger">Error</Badge>);
    const span = container.querySelector('span');
    expect(span!.className).toContain('bg-red-100');
  });

  it('renders a dot indicator when dot=true', () => {
    const { container } = render(<Badge dot variant="warning">Warn</Badge>);
    const dots = container.querySelectorAll('span.rounded-full');
    // The outer badge + the inner dot both have rounded-full
    expect(dots.length).toBeGreaterThanOrEqual(2);
  });

  it('does not render a dot by default', () => {
    const { container } = render(<Badge>NoDot</Badge>);
    // Only the outer span has rounded-full
    const innerSpans = container.querySelectorAll('span > span');
    expect(innerSpans.length).toBe(0);
  });

  it('applies size=md class', () => {
    const { container } = render(<Badge size="md">Medium</Badge>);
    const span = container.querySelector('span');
    expect(span!.className).toContain('px-2.5');
  });

  it('merges custom className', () => {
    const { container } = render(<Badge className="custom-class">Custom</Badge>);
    const span = container.querySelector('span');
    expect(span!.className).toContain('custom-class');
  });
});

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------
describe('StatCard', () => {
  const icon = <svg data-testid="test-icon" />;

  it('renders the title and value', () => {
    render(<StatCard title="Total Devices" value={1284} icon={icon} />);
    expect(screen.getByText('Total Devices')).toBeInTheDocument();
    expect(screen.getByText('1284')).toBeInTheDocument();
  });

  it('renders the icon', () => {
    render(<StatCard title="Alerts" value={7} icon={icon} />);
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('shows a positive trend with + sign', () => {
    render(<StatCard title="Licenses" value="94.2%" trend={5} icon={icon} />);
    expect(screen.getByText('+5%')).toBeInTheDocument();
  });

  it('shows a negative trend without + sign', () => {
    render(<StatCard title="Alerts" value={3} trend={-2} icon={icon} />);
    expect(screen.getByText('-2%')).toBeInTheDocument();
  });

  it('does not render trend section when trend is undefined', () => {
    const { container } = render(
      <StatCard title="Simple" value={10} icon={icon} />
    );
    // No trend text like "+X%" or "-X%" or "前月比"
    expect(screen.queryByText('前月比')).not.toBeInTheDocument();
  });

  it('renders string values', () => {
    render(<StatCard title="Rate" value="94.2%" icon={icon} />);
    expect(screen.getByText('94.2%')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Loading components
// ---------------------------------------------------------------------------
describe('Spinner', () => {
  it('renders with role=status', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has accessible aria-label', () => {
    render(<Spinner />);
    const spinner = screen.getByRole('status');
    expect(spinner.getAttribute('aria-label')).toBeTruthy();
  });

  it('applies size classes', () => {
    const { container } = render(<Spinner size="lg" />);
    const div = container.querySelector('[role="status"]');
    expect(div!.className).toContain('h-12');
  });
});

describe('Skeleton', () => {
  it('renders the specified number of lines', () => {
    const { container } = render(<Skeleton lines={3} />);
    const bars = container.querySelectorAll('.animate-pulse > div');
    expect(bars.length).toBe(3);
  });

  it('renders 1 line by default', () => {
    const { container } = render(<Skeleton />);
    const bars = container.querySelectorAll('.animate-pulse > div');
    expect(bars.length).toBe(1);
  });

  it('last line is narrower when lines > 1', () => {
    const { container } = render(<Skeleton lines={3} />);
    const bars = container.querySelectorAll('.animate-pulse > div');
    const lastBar = bars[bars.length - 1];
    expect(lastBar.className).toContain('w-3/4');
  });
});

describe('PageLoading', () => {
  it('renders default loading message', () => {
    render(<PageLoading />);
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('renders custom message', () => {
    render(<PageLoading message="データ取得中..." />);
    expect(screen.getByText('データ取得中...')).toBeInTheDocument();
  });

  it('contains a spinner', () => {
    render(<PageLoading />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

describe('TableSkeleton', () => {
  it('renders the default number of rows', () => {
    const { container } = render(<TableSkeleton />);
    // 5 rows + 1 header row = 6 border-b sections
    const rows = container.querySelectorAll('.border-b');
    expect(rows.length).toBeGreaterThanOrEqual(5);
  });

  it('renders custom rows and cols', () => {
    const { container } = render(<TableSkeleton rows={3} cols={6} />);
    // Header has 6 col placeholders
    const headerCols = container.querySelectorAll(
      '.border-b.border-gray-200 > div > div'
    );
    expect(headerCols.length).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// DataTable
// ---------------------------------------------------------------------------
describe('DataTable', () => {
  interface TestRow {
    id: string;
    name: string;
    status: string;
    [key: string]: unknown;
  }

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'status', header: 'Status' },
  ];

  const data: TestRow[] = [
    { id: '1', name: 'Device A', status: 'Active' },
    { id: '2', name: 'Device B', status: 'Inactive' },
  ];

  const keyExtractor = (item: TestRow) => item.id;

  it('renders column headers', () => {
    render(
      <DataTable columns={columns} data={data} keyExtractor={keyExtractor} />
    );
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders data rows', () => {
    render(
      <DataTable columns={columns} data={data} keyExtractor={keyExtractor} />
    );
    expect(screen.getByText('Device A')).toBeInTheDocument();
    expect(screen.getByText('Device B')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows empty message when data is empty', () => {
    render(
      <DataTable columns={columns} data={[]} keyExtractor={keyExtractor} />
    );
    expect(screen.getByText('データがありません')).toBeInTheDocument();
  });

  it('shows custom empty message', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        keyExtractor={keyExtractor}
        emptyMessage="No results found"
      />
    );
    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    const { container } = render(
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={keyExtractor}
        loading={true}
      />
    );
    // Loading state uses animate-pulse
    const pulsing = container.querySelector('.animate-pulse');
    expect(pulsing).toBeTruthy();
    // Data should NOT be visible in loading state
    expect(screen.queryByText('Device A')).not.toBeInTheDocument();
  });

  it('calls onRowClick when a row is clicked', () => {
    const handleClick = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={keyExtractor}
        onRowClick={handleClick}
      />
    );
    fireEvent.click(screen.getByText('Device A'));
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledWith(data[0]);
  });

  it('uses custom render function for columns', () => {
    const customColumns = [
      {
        key: 'name',
        header: 'Name',
        render: (item: TestRow) => <strong>{item.name}</strong>,
      },
      { key: 'status', header: 'Status' },
    ];
    render(
      <DataTable
        columns={customColumns}
        data={data}
        keyExtractor={keyExtractor}
      />
    );
    // The name should be rendered inside a <strong>
    const strong = screen.getByText('Device A');
    expect(strong.tagName).toBe('STRONG');
  });

  it('applies cursor-pointer class when onRowClick is provided', () => {
    const { container } = render(
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={keyExtractor}
        onRowClick={() => {}}
      />
    );
    const rows = container.querySelectorAll('tbody tr');
    expect(rows[0].className).toContain('cursor-pointer');
  });

  it('does not apply cursor-pointer when onRowClick is absent', () => {
    const { container } = render(
      <DataTable columns={columns} data={data} keyExtractor={keyExtractor} />
    );
    const rows = container.querySelectorAll('tbody tr');
    expect(rows[0].className).not.toContain('cursor-pointer');
  });
});
