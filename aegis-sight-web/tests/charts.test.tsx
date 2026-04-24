import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ResizeObserver is not available in jsdom
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

import { PieChart } from '@/components/charts/pie-chart';
import { Sparkline } from '@/components/charts/sparkline';
import { AreaChart } from '@/components/charts/area-chart';
import { LineChart } from '@/components/charts/line-chart';
import { BarChart, ProgressBar, DonutChart } from '@/components/ui/chart';

// ─── PieChart ─────────────────────────────────────────────────────────────
describe('PieChart', () => {
  const data = [
    { label: 'カテゴリA', value: 60, color: '#2563eb' },
    { label: 'カテゴリB', value: 30, color: '#10b981' },
    { label: 'カテゴリC', value: 10, color: '#f59e0b' },
  ];

  it('renders an SVG element', () => {
    const { container } = render(<PieChart data={data} />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renders legend by default with labels and values', () => {
    render(<PieChart data={data} />);
    expect(screen.getByText('カテゴリA')).toBeTruthy();
    expect(screen.getByText('カテゴリB')).toBeTruthy();
    expect(screen.getByText('60')).toBeTruthy();
  });

  it('hides legend when showLegend=false', () => {
    render(<PieChart data={data} showLegend={false} />);
    expect(screen.queryByText('カテゴリA')).toBeNull();
  });

  it('renders title when provided', () => {
    render(<PieChart data={data} title="テストグラフ" />);
    expect(screen.getByText('テストグラフ')).toBeTruthy();
  });

  it('renders slice paths for each data point', () => {
    const { container } = render(<PieChart data={data} />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThanOrEqual(data.length);
  });

  it('renders correctly with single item (full circle)', () => {
    const { container } = render(<PieChart data={[{ label: 'Only', value: 100 }]} />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renders full-circle donut (single item + innerRadius > 0) — covers lines 87-92', () => {
    const { container } = render(<PieChart data={[{ label: 'Only', value: 100 }]} innerRadius={40} />);
    expect(container.querySelectorAll('path').length).toBeGreaterThan(0);
  });

  it('renders donut when innerRadius > 0', () => {
    const { container } = render(<PieChart data={data} innerRadius={40} />);
    expect(container.querySelectorAll('path').length).toBeGreaterThan(0);
  });

  it('renders percentage labels as SVG text when showLabels=true', () => {
    const { container } = render(<PieChart data={data} showLabels={true} />);
    const textElements = container.querySelectorAll('text');
    expect(textElements.length).toBeGreaterThan(0);
  });

  it('assigns default colors when color not specified', () => {
    const noColorData = [{ label: 'A', value: 50 }, { label: 'B', value: 50 }];
    const { container } = render(<PieChart data={noColorData} />);
    expect(container.querySelectorAll('path').length).toBeGreaterThan(0);
  });

  it('renders percentage in legend', () => {
    render(<PieChart data={data} />);
    expect(screen.getByText('(60.0%)')).toBeTruthy();
  });

  it('handles empty data without crashing', () => {
    const { container } = render(<PieChart data={[]} />);
    expect(container.querySelector('svg')).toBeTruthy();
  });
});

// ─── Sparkline ────────────────────────────────────────────────────────────
describe('Sparkline', () => {
  it('renders SVG for valid data', () => {
    const { container } = render(<Sparkline data={[1, 3, 2, 5, 4]} />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('returns null for data with fewer than 2 points', () => {
    const { container } = render(<Sparkline data={[42]} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders area path and line path for multi-point data', () => {
    const { container } = render(<Sparkline data={[1, 2, 3, 4, 5]} />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(2);
  });

  it('applies custom color to stroke', () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} color="#ff0000" />);
    expect(container.querySelector('path[stroke="#ff0000"]')).toBeTruthy();
  });

  it('accepts custom width and height', () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} width={120} height={40} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('120');
    expect(svg?.getAttribute('height')).toBe('40');
  });

  it('applies className prop', () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} className="my-sparkline" />);
    expect(container.querySelector('svg')?.classList.contains('my-sparkline')).toBe(true);
  });

  it('handles flat data (all same values) without crashing', () => {
    const { container } = render(<Sparkline data={[5, 5, 5, 5]} />);
    expect(container.querySelector('svg')).toBeTruthy();
  });
});

// ─── AreaChart ────────────────────────────────────────────────────────────
describe('AreaChart', () => {
  const series = [
    {
      name: 'シリーズ1',
      data: [
        { label: '1月', value: 100 },
        { label: '2月', value: 150 },
        { label: '3月', value: 120 },
      ],
    },
  ];

  it('renders an SVG element', () => {
    const { container } = render(<AreaChart series={series} />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renders x-axis labels', () => {
    render(<AreaChart series={series} />);
    expect(screen.getByText('1月')).toBeTruthy();
    expect(screen.getByText('3月')).toBeTruthy();
  });

  it('renders title when provided', () => {
    render(<AreaChart series={series} title="エリアグラフ" />);
    expect(screen.getByText('エリアグラフ')).toBeTruthy();
  });

  it('renders legend when multiple series provided', () => {
    const multiSeries = [
      { name: 'シリーズ1', data: [{ label: '1月', value: 100 }] },
      { name: 'シリーズ2', data: [{ label: '1月', value: 50 }] },
    ];
    render(<AreaChart series={multiSeries} />);
    expect(screen.getByText('シリーズ1')).toBeTruthy();
    expect(screen.getByText('シリーズ2')).toBeTruthy();
  });

  it('handles empty series without crashing', () => {
    const { container } = render(<AreaChart series={[]} />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('handles multiple series', () => {
    const multiSeries = [
      { name: 'A', data: [{ label: '1', value: 10 }, { label: '2', value: 20 }] },
      { name: 'B', data: [{ label: '1', value: 5 }, { label: '2', value: 15 }] },
    ];
    render(<AreaChart series={multiSeries} />);
    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.getByText('B')).toBeTruthy();
  });

  it('does not render grid lines when showGrid=false', () => {
    const { container } = render(<AreaChart series={[
      { name: 'A', data: [{ label: '1', value: 10 }, { label: '2', value: 20 }] },
    ]} showGrid={false} />);
    const gridLines = container.querySelectorAll('line[stroke-dasharray="4 4"]');
    expect(gridLines.length).toBe(0);
  });

  it('does not activate tooltip when showTooltip=false', () => {
    const { container } = render(<AreaChart series={[
      { name: 'A', data: [{ label: '1', value: 10 }, { label: '2', value: 20 }] },
    ]} showTooltip={false} />);
    const svg = container.querySelector('svg')!;
    svg.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100, bubbles: true }));
    expect(container.querySelector('.pointer-events-none')).toBeNull();
  });

  it('uses custom color on series instead of DEFAULT_COLORS', () => {
    const { container } = render(<AreaChart series={[
      { name: 'Custom', data: [{ label: '1', value: 10 }, { label: '2', value: 20 }], color: '#ff00ff' },
    ]} />);
    const path = container.querySelector('path[stroke="#ff00ff"]');
    expect(path).toBeTruthy();
  });

  it('does not render legend for single series', () => {
    render(<AreaChart series={[
      { name: 'Solo', data: [{ label: '1', value: 10 }, { label: '2', value: 20 }] },
    ]} />);
    // Legend should not appear for a single series
    expect(screen.queryByText('Solo')).toBeNull();
  });
});

// ─── LineChart ────────────────────────────────────────────────────────────
describe('LineChart', () => {
  const series = [
    {
      name: 'ライン1',
      data: [
        { label: 'Jan', value: 40 },
        { label: 'Feb', value: 80 },
        { label: 'Mar', value: 60 },
      ],
    },
  ];

  it('renders an SVG element', () => {
    const { container } = render(<LineChart series={series} />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renders x-axis labels', () => {
    render(<LineChart series={series} />);
    expect(screen.getByText('Jan')).toBeTruthy();
    expect(screen.getByText('Feb')).toBeTruthy();
    expect(screen.getByText('Mar')).toBeTruthy();
  });

  it('renders title when provided', () => {
    render(<LineChart series={series} title="ラインチャート" />);
    expect(screen.getByText('ラインチャート')).toBeTruthy();
  });

  it('renders legend when multiple series provided', () => {
    const multiSeries = [
      { name: 'ライン1', data: [{ label: 'Jan', value: 40 }, { label: 'Feb', value: 80 }] },
      { name: 'ライン2', data: [{ label: 'Jan', value: 20 }, { label: 'Feb', value: 60 }] },
    ];
    render(<LineChart series={multiSeries} />);
    expect(screen.getByText('ライン1')).toBeTruthy();
    expect(screen.getByText('ライン2')).toBeTruthy();
  });

  it('handles empty series without crashing', () => {
    const { container } = render(<LineChart series={[]} />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('handles multiple series', () => {
    const multi = [
      { name: 'X', data: [{ label: '1', value: 10 }, { label: '2', value: 20 }] },
      { name: 'Y', data: [{ label: '1', value: 5 }, { label: '2', value: 15 }] },
    ];
    render(<LineChart series={multi} />);
    expect(screen.getByText('X')).toBeTruthy();
    expect(screen.getByText('Y')).toBeTruthy();
  });

  it('does not render grid lines when showGrid=false', () => {
    const { container } = render(<LineChart series={[
      { name: 'A', data: [{ label: '1', value: 10 }, { label: '2', value: 20 }] },
    ]} showGrid={false} />);
    const lines = container.querySelectorAll('line[stroke-dasharray="4 4"]');
    expect(lines.length).toBe(0);
  });

  it('does not activate tooltip when showTooltip=false', () => {
    const { container } = render(<LineChart series={[
      { name: 'A', data: [{ label: '1', value: 10 }, { label: '2', value: 20 }] },
    ]} showTooltip={false} />);
    const svg = container.querySelector('svg')!;
    // Fire mouse move - tooltip should not appear
    svg.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100, bubbles: true }));
    expect(container.querySelector('.pointer-events-none')).toBeNull();
  });

  it('does not render axis labels when showAxisLabels=false', () => {
    const { container } = render(<LineChart series={[
      { name: 'A', data: [{ label: 'Jan', value: 10 }, { label: 'Feb', value: 20 }] },
    ]} showAxisLabels={false} />);
    // X-axis labels should not be rendered
    expect(screen.queryByText('Jan')).toBeNull();
    expect(screen.queryByText('Feb')).toBeNull();
    // Y-axis labels (text elements inside SVG for tick values) should also be absent
    const svg = container.querySelector('svg')!;
    const textElements = svg.querySelectorAll('text');
    expect(textElements.length).toBe(0);
  });

  it('uses custom color on series instead of default', () => {
    const { container } = render(<LineChart series={[
      { name: 'Custom', data: [{ label: '1', value: 10 }, { label: '2', value: 20 }], color: '#ff00ff' },
    ]} />);
    const path = container.querySelector('path[stroke="#ff00ff"]');
    expect(path).toBeTruthy();
  });

  it('handles single data point without crashing', () => {
    const { container } = render(<LineChart series={[
      { name: 'Single', data: [{ label: 'Only', value: 42 }] },
    ]} />);
    expect(container.querySelector('svg')).toBeTruthy();
    expect(container.querySelector('circle')).toBeTruthy();
  });

  it('does not render legend for single series', () => {
    const { container } = render(<LineChart series={[
      { name: 'Solo', data: [{ label: '1', value: 10 }, { label: '2', value: 20 }] },
    ]} />);
    expect(screen.queryByText('Solo')).toBeNull();
  });
});

// ─── BarChart (ui/chart) ─────────────────────────────────────────────────
describe('BarChart', () => {
  const data = [
    { label: 'A', value: 50 },
    { label: 'B', value: 30 },
    { label: 'C', value: 20 },
  ];

  it('renders bars for each data item', () => {
    const { container } = render(<BarChart data={data} />);
    // Each item gets a column div
    const labels = screen.getAllByText(/^[ABC]$/);
    expect(labels.length).toBe(3);
  });

  it('shows values by default (showValues=true)', () => {
    render(<BarChart data={data} />);
    expect(screen.getByText('50')).toBeTruthy();
    expect(screen.getByText('30')).toBeTruthy();
  });

  it('hides values when showValues=false', () => {
    render(<BarChart data={data} showValues={false} />);
    expect(screen.queryByText('50')).toBeNull();
    expect(screen.queryByText('30')).toBeNull();
  });

  it('uses item.color when provided instead of defaultColors', () => {
    const colorData = [
      { label: 'X', value: 10, color: 'bg-sky-500' },
    ];
    const { container } = render(<BarChart data={colorData} />);
    const bar = container.querySelector('.bg-sky-500');
    expect(bar).toBeTruthy();
  });

  it('falls back to defaultColors when item.color is not provided', () => {
    const noColorData = [{ label: 'X', value: 10 }];
    const { container } = render(<BarChart data={noColorData} />);
    // First default color is bg-primary-500
    const bar = container.querySelector('.bg-primary-500');
    expect(bar).toBeTruthy();
  });

  it('sets minHeight to 0 when item.value is 0', () => {
    const zeroData = [{ label: 'Zero', value: 0 }];
    const { container } = render(<BarChart data={zeroData} />);
    const bar = container.querySelector('.rounded-t-md') as HTMLElement;
    expect(bar).toBeTruthy();
    expect(bar.style.minHeight).toBe('0px');
  });

  it('sets minHeight to 4px when item.value > 0', () => {
    const posData = [{ label: 'Pos', value: 5 }];
    const { container } = render(<BarChart data={posData} />);
    const bar = container.querySelector('.rounded-t-md') as HTMLElement;
    expect(bar).toBeTruthy();
    expect(bar.style.minHeight).toBe('4px');
  });

  it('accepts custom maxValue', () => {
    const { container } = render(<BarChart data={[{ label: 'A', value: 50 }]} maxValue={200} />);
    const bar = container.querySelector('.rounded-t-md') as HTMLElement;
    // 50/200 = 25%
    expect(bar.style.height).toBe('25%');
  });

  it('accepts custom height and className', () => {
    const { container } = render(<BarChart data={data} height={300} className="my-chart" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.height).toBe('300px');
    expect(wrapper.classList.contains('my-chart')).toBe(true);
  });
});

// ─── ProgressBar (ui/chart) ──────────────────────────────────────────────
describe('ProgressBar', () => {
  it('renders with auto color green when percentage <= 80', () => {
    const { container } = render(<ProgressBar value={50} />);
    expect(container.querySelector('.bg-emerald-500')).toBeTruthy();
  });

  it('renders with auto color amber when percentage > 80 and <= 100', () => {
    const { container } = render(<ProgressBar value={85} />);
    expect(container.querySelector('.bg-amber-500')).toBeTruthy();
  });

  it('renders with auto color red when percentage > 100', () => {
    const { container } = render(<ProgressBar value={150} max={100} />);
    expect(container.querySelector('.bg-red-500')).toBeTruthy();
  });

  it('renders with explicit blue color', () => {
    const { container } = render(<ProgressBar value={50} color="blue" />);
    expect(container.querySelector('.bg-primary-500')).toBeTruthy();
  });

  it('renders with explicit green color', () => {
    const { container } = render(<ProgressBar value={50} color="green" />);
    expect(container.querySelector('.bg-emerald-500')).toBeTruthy();
  });

  it('renders with explicit amber color', () => {
    const { container } = render(<ProgressBar value={50} color="amber" />);
    expect(container.querySelector('.bg-amber-500')).toBeTruthy();
  });

  it('renders with explicit red color', () => {
    const { container } = render(<ProgressBar value={50} color="red" />);
    expect(container.querySelector('.bg-red-500')).toBeTruthy();
  });

  it('shows label by default', () => {
    render(<ProgressBar value={75} />);
    expect(screen.getByText('75%')).toBeTruthy();
  });

  it('hides label when showLabel=false', () => {
    render(<ProgressBar value={75} showLabel={false} />);
    expect(screen.queryByText('75%')).toBeNull();
  });

  it('renders md size', () => {
    const { container } = render(<ProgressBar value={50} size="md" />);
    expect(container.querySelector('.h-3')).toBeTruthy();
    expect(container.querySelector('.h-2')).toBeNull();
  });

  it('renders sm size by default', () => {
    const { container } = render(<ProgressBar value={50} />);
    expect(container.querySelector('.h-2')).toBeTruthy();
  });

  it('uses custom max value', () => {
    render(<ProgressBar value={25} max={50} />);
    // 25/50 = 50%
    expect(screen.getByText('50%')).toBeTruthy();
  });

  it('applies className', () => {
    const { container } = render(<ProgressBar value={50} className="my-progress" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.classList.contains('my-progress')).toBe(true);
  });
});

// ─── DonutChart (ui/chart) ───────────────────────────────────────────────
describe('DonutChart', () => {
  it('renders SVG with circles', () => {
    const { container } = render(<DonutChart value={75} />);
    expect(container.querySelector('svg')).toBeTruthy();
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(2);
  });

  it('displays percentage', () => {
    render(<DonutChart value={75} />);
    expect(screen.getByText('75%')).toBeTruthy();
  });

  it('renders label when provided', () => {
    render(<DonutChart value={60} label="Compliance" />);
    expect(screen.getByText('Compliance')).toBeTruthy();
    expect(screen.getByText('60%')).toBeTruthy();
  });

  it('does not render label when not provided', () => {
    const { container } = render(<DonutChart value={60} />);
    // Only the percentage text should exist, no label text
    const texts = container.querySelectorAll('span');
    expect(texts.length).toBe(1); // just the percentage
  });

  it('uses custom max value for percentage calculation', () => {
    render(<DonutChart value={50} max={200} />);
    // 50/200 = 25%
    expect(screen.getByText('25%')).toBeTruthy();
  });

  it('caps percentage at 100% even when value exceeds max', () => {
    render(<DonutChart value={150} max={100} />);
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('accepts custom size and strokeWidth', () => {
    const { container } = render(<DonutChart value={50} size={80} strokeWidth={6} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('80');
    expect(svg?.getAttribute('height')).toBe('80');
    const circle = container.querySelector('circle');
    expect(circle?.getAttribute('stroke-width')).toBe('6');
  });

  it('accepts custom color', () => {
    const { container } = render(<DonutChart value={50} color="#ff0000" />);
    const circles = container.querySelectorAll('circle');
    // Second circle is the value arc
    expect(circles[1]?.getAttribute('stroke')).toBe('#ff0000');
  });

  it('applies className', () => {
    const { container } = render(<DonutChart value={50} className="my-donut" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.classList.contains('my-donut')).toBe(true);
  });
});
