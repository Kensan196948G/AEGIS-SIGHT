'use client';

import { clsx } from 'clsx';

interface ProcurementStatus {
  label: string;
  count: number;
  color: string;
}

interface MonthlyTrend {
  month: string;
  count: number;
}

interface ProcurementSummaryData {
  statuses: ProcurementStatus[];
  monthly: MonthlyTrend[];
}

interface ProcurementSummaryWidgetProps {
  data?: ProcurementSummaryData;
}

const defaultData: ProcurementSummaryData = {
  statuses: [
    { label: '申請中', count: 5, color: '#3b82f6' },
    { label: '承認待ち', count: 3, color: '#f59e0b' },
    { label: '発注済', count: 8, color: '#8b5cf6' },
    { label: '納品済', count: 12, color: '#10b981' },
    { label: '却下', count: 2, color: '#ef4444' },
  ],
  monthly: [
    { month: '10月', count: 8 },
    { month: '11月', count: 12 },
    { month: '12月', count: 6 },
    { month: '1月', count: 15 },
    { month: '2月', count: 10 },
    { month: '3月', count: 18 },
  ],
};

export function ProcurementSummaryWidget({ data = defaultData }: ProcurementSummaryWidgetProps) {
  const totalRequests = data.statuses.reduce((sum, s) => sum + s.count, 0);
  const maxMonthly = Math.max(...data.monthly.map((m) => m.count), 1);

  return (
    <div className="aegis-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          調達サマリ
        </h2>
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          合計 {totalRequests}件
        </span>
      </div>

      {/* Status breakdown */}
      <div className="mb-4 grid grid-cols-5 gap-1">
        {data.statuses.map((status, i) => (
          <div key={i} className="text-center">
            <p
              className="text-xl font-bold"
              style={{ color: status.color }}
            >
              {status.count}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              {status.label}
            </p>
          </div>
        ))}
      </div>

      {/* Stacked bar showing proportions */}
      <div className="mb-4 flex h-3 overflow-hidden rounded-full">
        {data.statuses.map((status, i) => (
          <div
            key={i}
            className="transition-all duration-300"
            style={{
              width: `${(status.count / totalRequests) * 100}%`,
              backgroundColor: status.color,
            }}
          />
        ))}
      </div>

      {/* Monthly trend bar chart */}
      <div className="mt-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          月次トレンド
        </h3>
        <div className="flex items-end gap-2" style={{ height: 100 }}>
          {data.monthly.map((m, i) => {
            const barHeight = (m.count / maxMonthly) * 80;
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">
                  {m.count}
                </span>
                <div
                  className="w-full rounded-t bg-primary-500 transition-all duration-300 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-500"
                  style={{ height: barHeight }}
                />
                <span className="text-[9px] text-gray-500 dark:text-gray-400">
                  {m.month}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
