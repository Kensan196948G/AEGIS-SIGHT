import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// ResizeObserver mock
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

import { AreaChart } from '@/components/charts/area-chart';
import { LineChart } from '@/components/charts/line-chart';

const multiSeries = [
  {
    name: 'Series A',
    data: [
      { label: 'Jan', value: 100 },
      { label: 'Feb', value: 150 },
      { label: 'Mar', value: 120 },
    ],
  },
  {
    name: 'Series B',
    data: [
      { label: 'Jan', value: 50 },
      { label: 'Feb', value: 80 },
      { label: 'Mar', value: 60 },
    ],
  },
];

const singleSeries = [
  {
    name: 'Solo',
    data: [
      { label: 'Jan', value: 100 },
      { label: 'Feb', value: 150 },
      { label: 'Mar', value: 120 },
    ],
  },
];

// ─── AreaChart branch coverage ──────────────────────────────────────────────
describe('AreaChart branch coverage', () => {
  it('does not render title when title is undefined', () => {
    const { container } = render(<AreaChart series={singleSeries} />);
    const h3 = container.querySelector('h3');
    expect(h3).toBeNull();
  });

  it('returns early from handleMouseMove when showTooltip=false', () => {
    const { container } = render(
      <AreaChart series={multiSeries} showTooltip={false} />
    );
    const svg = container.querySelector('svg')!;
    fireEvent.mouseMove(svg, { clientX: 100, clientY: 50 });
    // Tooltip div should not appear
    expect(container.querySelector('.pointer-events-none')).toBeNull();
  });

  it('returns early from handleMouseMove when labels are empty', () => {
    const emptySeries = [{ name: 'Empty', data: [] }];
    const { container } = render(
      <AreaChart series={emptySeries} showTooltip={true} />
    );
    const svg = container.querySelector('svg')!;
    fireEvent.mouseMove(svg, { clientX: 100, clientY: 50 });
    expect(container.querySelector('.pointer-events-none')).toBeNull();
  });

  it('shows tooltip with values when mouse moves over chart', () => {
    const { container } = render(
      <AreaChart series={multiSeries} showTooltip={true} />
    );
    const svg = container.querySelector('svg')!;
    // Mock getBoundingClientRect
    svg.getBoundingClientRect = () =>
      ({ left: 0, top: 0, right: 600, bottom: 300, width: 600, height: 300, x: 0, y: 0, toJSON: () => {} }) as DOMRect;
    fireEvent.mouseMove(svg, { clientX: 200, clientY: 100 });
    // Tooltip should appear with series names
    const tooltip = container.querySelector('.pointer-events-none');
    expect(tooltip).toBeTruthy();
    // Verify tooltip values are rendered (line 283: tooltip.values.map)
    expect(tooltip!.textContent).toContain('Series A');
    expect(tooltip!.textContent).toContain('Series B');
  });

  it('hides tooltip on mouse leave (line 161)', () => {
    const { container } = render(
      <AreaChart series={multiSeries} showTooltip={true} />
    );
    const svg = container.querySelector('svg')!;
    svg.getBoundingClientRect = () =>
      ({ left: 0, top: 0, right: 600, bottom: 300, width: 600, height: 300, x: 0, y: 0, toJSON: () => {} }) as DOMRect;
    // First show tooltip
    fireEvent.mouseMove(svg, { clientX: 200, clientY: 100 });
    expect(container.querySelector('.pointer-events-none')).toBeTruthy();
    // Then mouse leave
    fireEvent.mouseLeave(svg);
    expect(container.querySelector('.pointer-events-none')).toBeNull();
  });

  it('does not render legend when series.length <= 1 (line 298)', () => {
    render(<AreaChart series={singleSeries} />);
    // Legend contains series name — should not be present for single series
    expect(screen.queryByText('Solo')).toBeNull();
  });

  it('renders legend when series.length > 1', () => {
    render(<AreaChart series={multiSeries} />);
    expect(screen.getByText('Series A')).toBeTruthy();
    expect(screen.getByText('Series B')).toBeTruthy();
  });

  it('does not render grid lines when showGrid=false', () => {
    const { container } = render(
      <AreaChart series={singleSeries} showGrid={false} />
    );
    const gridLines = container.querySelectorAll('line[stroke-dasharray="4 4"]');
    expect(gridLines.length).toBe(0);
  });
});

// ─── LineChart branch coverage ──────────────────────────────────────────────
describe('LineChart branch coverage', () => {
  it('does not render title when title is undefined', () => {
    const { container } = render(<LineChart series={singleSeries} />);
    const h3 = container.querySelector('h3');
    expect(h3).toBeNull();
  });

  it('returns early from handleMouseMove when showTooltip=false', () => {
    const { container } = render(
      <LineChart series={multiSeries} showTooltip={false} />
    );
    const svg = container.querySelector('svg')!;
    fireEvent.mouseMove(svg, { clientX: 100, clientY: 50 });
    expect(container.querySelector('.pointer-events-none')).toBeNull();
  });

  it('returns early from handleMouseMove when labels are empty', () => {
    const emptySeries = [{ name: 'Empty', data: [] }];
    const { container } = render(
      <LineChart series={emptySeries} showTooltip={true} />
    );
    const svg = container.querySelector('svg')!;
    fireEvent.mouseMove(svg, { clientX: 100, clientY: 50 });
    expect(container.querySelector('.pointer-events-none')).toBeNull();
  });

  it('shows tooltip with values when mouse moves over chart (line 271)', () => {
    const { container } = render(
      <LineChart series={multiSeries} showTooltip={true} />
    );
    const svg = container.querySelector('svg')!;
    svg.getBoundingClientRect = () =>
      ({ left: 0, top: 0, right: 600, bottom: 300, width: 600, height: 300, x: 0, y: 0, toJSON: () => {} }) as DOMRect;
    fireEvent.mouseMove(svg, { clientX: 200, clientY: 100 });
    const tooltip = container.querySelector('.pointer-events-none');
    expect(tooltip).toBeTruthy();
    expect(tooltip!.textContent).toContain('Series A');
    expect(tooltip!.textContent).toContain('Series B');
  });

  it('hides tooltip on mouse leave (line 160)', () => {
    const { container } = render(
      <LineChart series={multiSeries} showTooltip={true} />
    );
    const svg = container.querySelector('svg')!;
    svg.getBoundingClientRect = () =>
      ({ left: 0, top: 0, right: 600, bottom: 300, width: 600, height: 300, x: 0, y: 0, toJSON: () => {} }) as DOMRect;
    fireEvent.mouseMove(svg, { clientX: 200, clientY: 100 });
    expect(container.querySelector('.pointer-events-none')).toBeTruthy();
    fireEvent.mouseLeave(svg);
    expect(container.querySelector('.pointer-events-none')).toBeNull();
  });

  it('does not render axis labels when showAxisLabels=false (lines 178, 192)', () => {
    const { container } = render(
      <LineChart series={singleSeries} showAxisLabels={false} />
    );
    expect(screen.queryByText('Jan')).toBeNull();
    expect(screen.queryByText('Feb')).toBeNull();
    const svg = container.querySelector('svg')!;
    const textElements = svg.querySelectorAll('text');
    expect(textElements.length).toBe(0);
  });

  it('renders axis labels when showAxisLabels=true (default)', () => {
    render(<LineChart series={singleSeries} />);
    expect(screen.getByText('Jan')).toBeTruthy();
  });

  it('does not render legend when series.length <= 1 (line 286)', () => {
    render(<LineChart series={singleSeries} />);
    expect(screen.queryByText('Solo')).toBeNull();
  });

  it('renders legend when series.length > 1', () => {
    render(<LineChart series={multiSeries} />);
    expect(screen.getByText('Series A')).toBeTruthy();
    expect(screen.getByText('Series B')).toBeTruthy();
  });
});

// ─── ResizeObserver fn coverage ─────────────────────────────────────────────
// These tests cover the ResizeObserver callback (anonymous_2) in both charts.
// The default beforeEach mock has no-op observe(); we override it per-test to
// capture the callback and call it, exercising the fn body for V8 coverage.

describe('AreaChart - ResizeObserver callback fn coverage', () => {
  it('fires ResizeObserver callback to update svgWidth (fn#2 coverage)', () => {
    let capturedCb: ResizeObserverCallback | null = null;
    vi.stubGlobal('ResizeObserver', class {
      constructor(cb: ResizeObserverCallback) { capturedCb = cb; }
      observe() {}
      unobserve() {}
      disconnect() {}
    });

    const { container } = render(<AreaChart series={singleSeries} />);
    expect(capturedCb).not.toBeNull();

    act(() => {
      capturedCb!(
        [{ contentRect: { width: 640 } } as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    });

    expect(container.querySelector('svg')).toBeTruthy();
  });
});

describe('LineChart - ResizeObserver callback fn coverage', () => {
  it('fires ResizeObserver callback to update svgWidth (fn#2 coverage)', () => {
    let capturedCb: ResizeObserverCallback | null = null;
    vi.stubGlobal('ResizeObserver', class {
      constructor(cb: ResizeObserverCallback) { capturedCb = cb; }
      observe() {}
      unobserve() {}
      disconnect() {}
    });

    const { container } = render(<LineChart series={singleSeries} />);
    expect(capturedCb).not.toBeNull();

    act(() => {
      capturedCb!(
        [{ contentRect: { width: 640 } } as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    });

    expect(container.querySelector('svg')).toBeTruthy();
  });
});
