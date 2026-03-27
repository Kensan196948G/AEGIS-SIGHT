import { clsx } from 'clsx';
import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon: ReactNode;
  iconColor?: 'blue' | 'red' | 'green' | 'amber';
}

const iconColorMap = {
  blue: 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
  red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  green: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
};

export function StatCard({ title, value, trend, icon, iconColor = 'blue' }: StatCardProps) {
  return (
    <div className="aegis-card flex items-start justify-between">
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{value}</p>
        {trend !== undefined && (
          <div className="flex items-center gap-1">
            {trend >= 0 ? (
              <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
              </svg>
            ) : (
              <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6 9 12.75l4.286-4.286a11.948 11.948 0 0 1 4.306 6.43l.776 2.898m0 0 3.182-5.511m-3.182 5.51-5.511-3.181" />
              </svg>
            )}
            <span
              className={clsx(
                'text-xs font-medium',
                trend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              )}
            >
              {trend >= 0 ? '+' : ''}{trend}%
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">前月比</span>
          </div>
        )}
      </div>
      <div className={clsx('rounded-xl p-3', iconColorMap[iconColor])}>
        {icon}
      </div>
    </div>
  );
}
