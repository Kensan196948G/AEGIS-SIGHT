'use client';

import { useMemo } from 'react';
import { clsx } from 'clsx';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillOpacity?: number;
  className?: string;
}

export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = '#2563eb',
  fillOpacity = 0.15,
  className,
}: SparklineProps) {
  const { linePath, areaPath } = useMemo(() => {
    if (data.length < 2) return { linePath: '', areaPath: '' };
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pad = 2;
    const w = width - pad * 2;
    const h = height - pad * 2;

    const points = data.map((v, i) => ({
      x: pad + (i / (data.length - 1)) * w,
      y: pad + h - ((v - min) / range) * h,
    }));

    const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const area = `${line} L ${points[points.length - 1].x} ${height - pad} L ${points[0].x} ${height - pad} Z`;

    return { linePath: line, areaPath: area };
  }, [data, width, height]);

  if (data.length < 2) return null;

  const trend = data[data.length - 1] - data[0];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={clsx('inline-block', className)}
    >
      <path d={areaPath} fill={color} opacity={fillOpacity} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
