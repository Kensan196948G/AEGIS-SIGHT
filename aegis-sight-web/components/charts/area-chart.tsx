'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { clsx } from 'clsx';

export interface AreaChartDataPoint {
  label: string;
  value: number;
  timestamp?: string;
}

export interface AreaChartSeries {
  name: string;
  data: AreaChartDataPoint[];
  color?: string;
}

interface AreaChartProps {
  series: AreaChartSeries[];
  title?: string;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  className?: string;
}

const DEFAULT_COLORS = [
  { stroke: '#2563eb', fill: '#2563eb' },
  { stroke: '#10b981', fill: '#10b981' },
  { stroke: '#f59e0b', fill: '#f59e0b' },
  { stroke: '#ef4444', fill: '#ef4444' },
];

export function AreaChart({
  series,
  title,
  height = 250,
  showGrid = true,
  showTooltip = true,
  className,
}: AreaChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [svgWidth, setSvgWidth] = useState(600);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    label: string;
    values: { name: string; value: number; color: string }[];
  } | null>(null);

  const padding = { top: 20, right: 20, bottom: 35, left: 45 };

  useEffect(() => {
    if (!svgRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSvgWidth(entry.contentRect.width);
      }
    });
    observer.observe(svgRef.current.parentElement!);
    return () => observer.disconnect();
  }, []);

  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const { minVal, maxVal, labels } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    let maxLabels: AreaChartDataPoint[] = [];
    for (const s of series) {
      for (const d of s.data) {
        if (d.value < min) min = d.value;
        if (d.value > max) max = d.value;
      }
      if (s.data.length > maxLabels.length) maxLabels = s.data;
    }
    const range = max - min || 1;
    return { minVal: Math.max(0, min - range * 0.1), maxVal: max + range * 0.1, labels: maxLabels };
  }, [series]);

  const toX = useCallback(
    (index: number, total: number) =>
      padding.left + (index / Math.max(total - 1, 1)) * chartWidth,
    [padding.left, chartWidth]
  );

  const toY = useCallback(
    (value: number) =>
      padding.top + chartHeight - ((value - minVal) / (maxVal - minVal)) * chartHeight,
    [padding.top, chartHeight, minVal, maxVal]
  );

  const yTicks = useMemo(() => {
    const count = 4;
    const ticks: number[] = [];
    for (let i = 0; i <= count; i++) {
      ticks.push(minVal + ((maxVal - minVal) * i) / count);
    }
    return ticks;
  }, [minVal, maxVal]);

  const buildAreaPath = useCallback(
    (data: AreaChartDataPoint[]) => {
      const lineParts = data.map((d, i) => {
        const x = toX(i, data.length);
        const y = toY(d.value);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      });
      const lastX = toX(data.length - 1, data.length);
      const firstX = toX(0, data.length);
      const baseY = toY(minVal);
      return `${lineParts.join(' ')} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
    },
    [toX, toY, minVal]
  );

  const buildLinePath = useCallback(
    (data: AreaChartDataPoint[]) => {
      return data
        .map((d, i) => {
          const x = toX(i, data.length);
          const y = toY(d.value);
          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        })
        .join(' ');
    },
    [toX, toY]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!showTooltip || !svgRef.current || labels.length === 0) return;
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const index = Math.round(((mouseX - padding.left) / chartWidth) * (labels.length - 1));
      const ci = Math.max(0, Math.min(index, labels.length - 1));
      const values = series.map((s, si) => ({
        name: s.name,
        value: s.data[ci]?.value ?? 0,
        color: s.color || DEFAULT_COLORS[si % DEFAULT_COLORS.length].stroke,
      }));
      setTooltip({ x: toX(ci, labels.length), y: e.clientY - rect.top, label: labels[ci].label, values });
    },
    [showTooltip, labels, padding.left, chartWidth, series, toX]
  );

  return (
    <div className={clsx('relative w-full', className)}>
      {title && (
        <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          {title}
        </h3>
      )}
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        className="select-none"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          {series.map((s, si) => {
            const color = s.color || DEFAULT_COLORS[si % DEFAULT_COLORS.length].fill;
            return (
              <linearGradient
                key={`grad-${si}`}
                id={`area-gradient-${si}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            );
          })}
        </defs>

        {/* Grid */}
        {showGrid &&
          yTicks.map((tick, i) => (
            <line
              key={`grid-${i}`}
              x1={padding.left}
              y1={toY(tick)}
              x2={svgWidth - padding.right}
              y2={toY(tick)}
              className="stroke-gray-200 dark:stroke-gray-700"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          ))}

        {/* Y-axis labels */}
        {yTicks.map((tick, i) => (
          <text
            key={`y-${i}`}
            x={padding.left - 8}
            y={toY(tick) + 4}
            textAnchor="end"
            className="fill-gray-500 text-[10px] dark:fill-gray-400"
          >
            {Math.round(tick).toLocaleString()}
          </text>
        ))}

        {/* X-axis labels */}
        {labels
          .filter((_, i) => {
            const step = Math.max(1, Math.floor(labels.length / 6));
            return i % step === 0 || i === labels.length - 1;
          })
          .map((d) => {
            const idx = labels.indexOf(d);
            return (
              <text
                key={`x-${idx}`}
                x={toX(idx, labels.length)}
                y={height - 8}
                textAnchor="middle"
                className="fill-gray-500 text-[10px] dark:fill-gray-400"
              >
                {d.label}
              </text>
            );
          })}

        {/* Area fills */}
        {series.map((s, si) => (
          <path
            key={`area-${si}`}
            d={buildAreaPath(s.data)}
            fill={`url(#area-gradient-${si})`}
          />
        ))}

        {/* Lines */}
        {series.map((s, si) => {
          const color = s.color || DEFAULT_COLORS[si % DEFAULT_COLORS.length].stroke;
          return (
            <path
              key={`line-${si}`}
              d={buildLinePath(s.data)}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}

        {/* Tooltip crosshair */}
        {tooltip && (
          <line
            x1={tooltip.x}
            y1={padding.top}
            x2={tooltip.x}
            y2={padding.top + chartHeight}
            className="stroke-gray-400 dark:stroke-gray-500"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-aegis-border dark:bg-aegis-surface"
          style={{
            left: Math.min(tooltip.x + 12, svgWidth - 160),
            top: Math.max(tooltip.y - 40, 0),
          }}
        >
          <p className="mb-1 font-semibold text-gray-700 dark:text-gray-300">
            {tooltip.label}
          </p>
          {tooltip.values.map((v, i) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: v.color }}
              />
              <span className="text-gray-500 dark:text-gray-400">{v.name}:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {v.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      {series.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-4">
          {series.map((s, si) => (
            <div key={si} className="flex items-center gap-1.5 text-xs">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{
                  backgroundColor: s.color || DEFAULT_COLORS[si % DEFAULT_COLORS.length].stroke,
                }}
              />
              <span className="text-gray-600 dark:text-gray-400">{s.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
