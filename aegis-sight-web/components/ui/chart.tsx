'use client';

import { clsx } from 'clsx';

interface BarChartItem {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarChartItem[];
  maxValue?: number;
  height?: number;
  showValues?: boolean;
  className?: string;
}

const defaultColors = [
  'bg-primary-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-red-500',
  'bg-purple-500',
  'bg-cyan-500',
  'bg-pink-500',
  'bg-indigo-500',
];

export function BarChart({
  data,
  maxValue,
  height = 200,
  showValues = true,
  className,
}: BarChartProps) {
  const max = maxValue || Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={clsx('flex items-end gap-2', className)} style={{ height }}>
      {data.map((item, index) => {
        const barHeight = (item.value / max) * 100;
        const color = item.color || defaultColors[index % defaultColors.length];

        return (
          <div key={item.label} className="flex flex-1 flex-col items-center gap-1">
            {showValues && (
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {item.value.toLocaleString()}
              </span>
            )}
            <div className="relative w-full" style={{ height: `${height - 40}px` }}>
              <div
                className={clsx(
                  'absolute bottom-0 w-full rounded-t-md transition-all duration-500',
                  color
                )}
                style={{ height: `${barHeight}%`, minHeight: item.value > 0 ? '4px' : '0' }}
              />
            </div>
            <span className="mt-1 text-[10px] font-medium text-gray-500 dark:text-gray-400 text-center leading-tight truncate w-full">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'auto';
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

const progressColors = {
  blue: 'bg-primary-500',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
};

export function ProgressBar({
  value,
  max = 100,
  color = 'auto',
  size = 'sm',
  showLabel = true,
  className,
}: ProgressBarProps) {
  const percentage = Math.round((value / max) * 100);
  let barColor: string;

  if (color === 'auto') {
    if (percentage > 100) barColor = 'bg-red-500';
    else if (percentage > 80) barColor = 'bg-amber-500';
    else barColor = 'bg-emerald-500';
  } else {
    barColor = progressColors[color];
  }

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <div
        className={clsx(
          'flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700',
          size === 'sm' ? 'h-2' : 'h-3'
        )}
      >
        <div
          className={clsx('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-10 text-right">
          {percentage}%
        </span>
      )}
    </div>
  );
}

interface DonutChartProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  className?: string;
}

export function DonutChart({
  value,
  max = 100,
  size = 120,
  strokeWidth = 10,
  color = '#2563eb',
  label,
  className,
}: DonutChartProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={clsx('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-bold text-gray-900 dark:text-white">
          {Math.round(percentage)}%
        </span>
        {label && (
          <span className="text-[10px] text-gray-500 dark:text-gray-400">{label}</span>
        )}
      </div>
    </div>
  );
}
