import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable } from '@/components/ui/data-table';

type Item = Record<string, unknown>;

const columns = [
  { key: 'name', header: '名前' },
  { key: 'status', header: 'ステータス' },
];

const data: Item[] = [
  { name: 'アイテムA', status: '有効' },
  { name: 'アイテムB', status: '無効' },
];

function keyExtractor(item: Item) {
  return String(item.name);
}

describe('DataTable', () => {
  it('renders column headers', () => {
    render(<DataTable columns={columns} data={data} keyExtractor={keyExtractor} />);
    expect(screen.getByText('名前')).toBeInTheDocument();
    expect(screen.getByText('ステータス')).toBeInTheDocument();
  });

  it('renders data rows', () => {
    render(<DataTable columns={columns} data={data} keyExtractor={keyExtractor} />);
    expect(screen.getByText('アイテムA')).toBeInTheDocument();
    expect(screen.getByText('アイテムB')).toBeInTheDocument();
    expect(screen.getByText('有効')).toBeInTheDocument();
    expect(screen.getByText('無効')).toBeInTheDocument();
  });

  it('shows empty message when data is empty', () => {
    render(<DataTable columns={columns} data={[]} keyExtractor={keyExtractor} />);
    expect(screen.getByText('データがありません')).toBeInTheDocument();
  });

  it('shows custom empty message', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        keyExtractor={keyExtractor}
        emptyMessage="結果なし"
      />
    );
    expect(screen.getByText('結果なし')).toBeInTheDocument();
  });

  it('shows loading skeleton when loading=true', () => {
    const { container } = render(
      <DataTable columns={columns} data={data} keyExtractor={keyExtractor} loading />
    );
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    // データ行は表示されない
    expect(screen.queryByText('アイテムA')).toBeNull();
  });

  it('calls onRowClick with item when row is clicked', () => {
    const onRowClick = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={keyExtractor}
        onRowClick={onRowClick}
      />
    );
    fireEvent.click(screen.getByText('アイテムA').closest('tr')!);
    expect(onRowClick).toHaveBeenCalledWith(data[0]);
  });

  it('does not call onRowClick when not provided', () => {
    // no error thrown
    render(<DataTable columns={columns} data={data} keyExtractor={keyExtractor} />);
    fireEvent.click(screen.getByText('アイテムA').closest('tr')!);
  });

  it('uses custom render function for column', () => {
    const customColumns = [
      {
        key: 'name',
        header: '名前',
        render: (item: Item) => <strong>{String(item.name)}-custom</strong>,
      },
    ];
    render(<DataTable columns={customColumns} data={data} keyExtractor={keyExtractor} />);
    expect(screen.getByText('アイテムA-custom')).toBeInTheDocument();
  });

  it('applies column className', () => {
    const customColumns = [
      { key: 'name', header: '名前', className: 'text-right' },
    ];
    render(<DataTable columns={customColumns} data={data} keyExtractor={keyExtractor} />);
    const header = screen.getByText('名前');
    expect(header).toHaveClass('text-right');
  });

  it('renders table structure', () => {
    render(<DataTable columns={columns} data={data} keyExtractor={keyExtractor} />);
    expect(screen.getAllByRole('columnheader').length).toBe(2);
    expect(screen.getAllByRole('row').length).toBe(3); // 1 header + 2 data rows
  });
});
