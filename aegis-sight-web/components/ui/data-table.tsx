'use client';

import { clsx } from 'clsx';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  loading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  loading = false,
  emptyMessage = 'データがありません',
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="aegis-card overflow-hidden">
        <div className="animate-pulse space-y-4 p-6">
          <div className="h-4 w-1/4 rounded bg-gray-200 dark:bg-gray-700" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4">
              {columns.map((_, j) => (
                <div
                  key={j}
                  className="h-4 flex-1 rounded bg-gray-100 dark:bg-gray-700/50"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="aegis-card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/50 dark:border-aegis-border dark:bg-aegis-dark/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={clsx(
                    'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400',
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={keyExtractor(item)}
                  onClick={() => onRowClick?.(item)}
                  className={clsx(
                    'transition-colors',
                    onRowClick
                      ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-aegis-surface/50'
                      : ''
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={clsx(
                        'whitespace-nowrap px-6 py-4 text-sm text-gray-700 dark:text-gray-300',
                        col.className
                      )}
                    >
                      {col.render
                        ? col.render(item)
                        : (item[col.key] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
