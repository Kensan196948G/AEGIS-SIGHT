'use client';

import { useMemo } from 'react';
import { clsx } from 'clsx';

export interface PieChartSlice {
  label: string;
  value: number;
  color?: string;
}

interface PieChartProps {
  data: PieChartSlice[];
  size?: number;
  innerRadius?: number;
  showLabels?: boolean;
  showLegend?: boolean;
  title?: string;
  className?: string;
}

const DEFAULT_COLORS = [
  '#2563eb', // blue-600
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#6366f1', // indigo-500
];

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

export function PieChart({
  data,
  size = 200,
  innerRadius = 0,
  showLabels = true,
  showLegend = true,
  title,
  className,
}: PieChartProps) {
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = innerRadius;

  const slices = useMemo(() => {
    return data.reduce<
      Array<PieChartSlice & { startAngle: number; endAngle: number; midAngle: number; color: string; percentage: string }>
    >((acc, d, i) => {
      const prevEnd = acc.length > 0 ? acc[acc.length - 1].endAngle : 0;
      const angle = total > 0 ? (d.value / total) * 360 : 0;
      const startAngle = prevEnd;
      const endAngle = prevEnd + angle;
      const midAngle = startAngle + angle / 2;
      const color = d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
      const percentage = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0';
      acc.push({ ...d, startAngle, endAngle, midAngle, color, percentage });
      return acc;
    }, []);
  }, [data, total]);

  const buildSlicePath = (startAngle: number, endAngle: number) => {
    if (endAngle - startAngle >= 359.99) {
      // Full circle
      const halfAngle = startAngle + (endAngle - startAngle) / 2;
      if (innerR > 0) {
        const outerArc1 = describeArc(cx, cy, outerR, startAngle, halfAngle);
        const outerArc2 = describeArc(cx, cy, outerR, halfAngle, endAngle - 0.01);
        const innerStart = polarToCartesian(cx, cy, innerR, startAngle);
        const innerEnd = polarToCartesian(cx, cy, innerR, endAngle - 0.01);
        const outerEnd = polarToCartesian(cx, cy, outerR, startAngle);
        return `${outerArc1} ${outerArc2} L ${innerEnd.x} ${innerEnd.y} A ${innerR} ${innerR} 0 1 1 ${innerStart.x} ${innerStart.y} Z`;
      }
      const arc1 = describeArc(cx, cy, outerR, startAngle, halfAngle);
      const arc2 = describeArc(cx, cy, outerR, halfAngle, endAngle - 0.01);
      return `${arc1} ${arc2} L ${cx} ${cy} Z`;
    }

    const outerStart = polarToCartesian(cx, cy, outerR, endAngle);
    const outerEnd = polarToCartesian(cx, cy, outerR, startAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    if (innerR > 0) {
      const innerStart = polarToCartesian(cx, cy, innerR, startAngle);
      const innerEnd = polarToCartesian(cx, cy, innerR, endAngle);
      return [
        `M ${outerStart.x} ${outerStart.y}`,
        `A ${outerR} ${outerR} 0 ${largeArc} 0 ${outerEnd.x} ${outerEnd.y}`,
        `L ${innerStart.x} ${innerStart.y}`,
        `A ${innerR} ${innerR} 0 ${largeArc} 1 ${innerEnd.x} ${innerEnd.y}`,
        'Z',
      ].join(' ');
    }

    return [
      `M ${outerStart.x} ${outerStart.y}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 0 ${outerEnd.x} ${outerEnd.y}`,
      `L ${cx} ${cy}`,
      'Z',
    ].join(' ');
  };

  return (
    <div className={clsx('flex flex-col items-center', className)}>
      {title && (
        <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          {title}
        </h3>
      )}
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {slices.map((slice, i) => (
            <path
              key={i}
              d={buildSlicePath(slice.startAngle, slice.endAngle)}
              fill={slice.color}
              className="transition-opacity hover:opacity-80"
              stroke="white"
              strokeWidth={1}
            />
          ))}

          {/* Percentage labels */}
          {showLabels &&
            slices
              .filter((s) => parseFloat(s.percentage) >= 5)
              .map((slice, i) => {
                const labelR = innerR > 0 ? (outerR + innerR) / 2 : outerR * 0.65;
                const pos = polarToCartesian(cx, cy, labelR, slice.midAngle);
                return (
                  <text
                    key={`label-${i}`}
                    x={pos.x}
                    y={pos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="fill-white text-[11px] font-semibold"
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                  >
                    {slice.percentage}%
                  </text>
                );
              })}
        </svg>

        {/* Legend */}
        {showLegend && (
          <div className="flex flex-col gap-1.5">
            {slices.map((slice, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span
                  className="inline-block h-3 w-3 shrink-0 rounded"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="text-gray-600 dark:text-gray-400">{slice.label}</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {slice.value.toLocaleString()}
                </span>
                <span className="text-gray-400 dark:text-gray-500">
                  ({slice.percentage}%)
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
