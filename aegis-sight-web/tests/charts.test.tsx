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
});
