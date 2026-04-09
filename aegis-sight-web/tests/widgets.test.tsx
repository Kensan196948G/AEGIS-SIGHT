import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock PieChart so SVG rendering doesn't break jsdom
vi.mock('@/components/charts/pie-chart', () => ({
  PieChart: ({ data }: { data: { label: string; value: number }[] }) => (
    <div data-testid="pie-chart">
      {data.map((d) => (
        <span key={d.label}>{d.label}:{d.value}</span>
      ))}
    </div>
  ),
}));

import { ActivityFeedWidget } from '@/components/widgets/activity-feed-widget';
import { DeviceStatusWidget } from '@/components/widgets/device-status-widget';
import { LicenseComplianceWidget } from '@/components/widgets/license-compliance-widget';
import { ProcurementSummaryWidget } from '@/components/widgets/procurement-summary-widget';
import { SecurityScoreWidget } from '@/components/widgets/security-score-widget';

// ─── ActivityFeedWidget ───────────────────────────────────────────────────
describe('ActivityFeedWidget', () => {
  it('renders heading', () => {
    render(<ActivityFeedWidget />);
    expect(screen.getByText('アクティビティ')).toBeTruthy();
  });

  it('renders default events up to maxVisible=6', () => {
    render(<ActivityFeedWidget />);
    // Default has 8 events but only 6 shown
    expect(screen.getByText('CPU使用率アラート')).toBeTruthy();
    expect(screen.getByText('資産スキャン完了')).toBeTruthy();
  });

  it('shows "further" button when events exceed maxVisible', () => {
    render(<ActivityFeedWidget maxVisible={3} />);
    // 8 default events, showing 3 → show "さらに表示 (5件)"
    expect(screen.getByText(/さらに表示/)).toBeTruthy();
  });

  it('filter buttons are rendered for each type', () => {
    render(<ActivityFeedWidget />);
    expect(screen.getByRole('button', { name: '全て' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'アラート' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'スキャン' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '調達' })).toBeTruthy();
  });

  it('filtering by type shows only matching events', () => {
    const events = [
      { id: '1', type: 'alert' as const, title: 'アラートA', description: 'desc', time: '1分前' },
      { id: '2', type: 'scan' as const, title: 'スキャンB', description: 'desc', time: '2分前' },
    ];
    render(<ActivityFeedWidget events={events} />);
    fireEvent.click(screen.getByRole('button', { name: 'アラート' }));
    expect(screen.getByText('アラートA')).toBeTruthy();
    expect(screen.queryByText('スキャンB')).toBeNull();
  });

  it('shows empty message when no events match filter', () => {
    const events = [
      { id: '1', type: 'alert' as const, title: 'A', description: 'D', time: '1分前' },
    ];
    render(<ActivityFeedWidget events={events} />);
    fireEvent.click(screen.getByRole('button', { name: 'スキャン' }));
    expect(screen.getByText('該当するイベントはありません')).toBeTruthy();
  });

  it('accepts custom events prop', () => {
    const events = [
      { id: 'x', type: 'user' as const, title: 'カスタムイベント', description: 'desc', time: '今' },
    ];
    render(<ActivityFeedWidget events={events} />);
    expect(screen.getByText('カスタムイベント')).toBeTruthy();
  });
});

// ─── DeviceStatusWidget ──────────────────────────────────────────────────
describe('DeviceStatusWidget', () => {
  it('renders heading', () => {
    render(<DeviceStatusWidget />);
    expect(screen.getByText('デバイスステータス')).toBeTruthy();
  });

  it('renders PieChart', () => {
    render(<DeviceStatusWidget />);
    expect(screen.getByTestId('pie-chart')).toBeTruthy();
  });

  it('calculates online rate with default data (1142/1284 ≈ 88.9%)', () => {
    render(<DeviceStatusWidget />);
    // 1142 / (1142+89+53) * 100 = 88.9%
    expect(screen.getByText('88.9%')).toBeTruthy();
  });

  it('shows online/offline/maintenance counts', () => {
    render(<DeviceStatusWidget />);
    expect(screen.getByText('1,142')).toBeTruthy();
    expect(screen.getByText('89')).toBeTruthy();
    expect(screen.getByText('53')).toBeTruthy();
  });

  it('accepts custom data prop', () => {
    const data = {
      online: 100,
      offline: 0,
      maintenance: 0,
      lastChecked: '2026-01-01T00:00:00',
    };
    render(<DeviceStatusWidget data={data} />);
    expect(screen.getByText('100.0%')).toBeTruthy();
  });

  it('handles zero total gracefully', () => {
    const data = { online: 0, offline: 0, maintenance: 0, lastChecked: '2026-01-01T00:00:00' };
    render(<DeviceStatusWidget data={data} />);
    expect(screen.getByText('0%')).toBeTruthy();
  });
});

// ─── LicenseComplianceWidget ─────────────────────────────────────────────
describe('LicenseComplianceWidget', () => {
  it('renders heading', () => {
    render(<LicenseComplianceWidget />);
    expect(screen.getByText('ライセンス遵守状況')).toBeTruthy();
  });

  it('shows compliance rate', () => {
    render(<LicenseComplianceWidget />);
    expect(screen.getByText('94.2%')).toBeTruthy();
  });

  it('renders over-deployed licenses section', () => {
    render(<LicenseComplianceWidget />);
    expect(screen.getByText('超過ライセンス TOP3')).toBeTruthy();
    expect(screen.getByText('Adobe Creative Cloud')).toBeTruthy();
  });

  it('shows excess count badges (+N)', () => {
    render(<LicenseComplianceWidget />);
    // Adobe Creative Cloud: used 58, total 50 → +8
    expect(screen.getByText('+8')).toBeTruthy();
  });

  it('renders expiring licenses section', () => {
    render(<LicenseComplianceWidget />);
    expect(screen.getByText('期限切れ間近')).toBeTruthy();
    expect(screen.getByText('Norton 360')).toBeTruthy();
  });

  it('shows daysLeft for expiring licenses', () => {
    render(<LicenseComplianceWidget />);
    expect(screen.getByText('残り15日')).toBeTruthy();
    expect(screen.getByText('残り30日')).toBeTruthy();
  });

  it('accepts custom data prop', () => {
    const data = {
      complianceRate: 50,
      overDeployed: [{ name: 'TestApp', total: 10, used: 15 }],
      expiring: [{ name: 'ExpApp', daysLeft: 5 }],
    };
    render(<LicenseComplianceWidget data={data} />);
    expect(screen.getByText('50%')).toBeTruthy();
    expect(screen.getByText('TestApp')).toBeTruthy();
    expect(screen.getByText('残り5日')).toBeTruthy();
  });

  it('shows amber color for complianceRate in 70-89 range (GaugeBar amber branch)', () => {
    const data = {
      complianceRate: 80,
      overDeployed: [],
      expiring: [],
    };
    const { container } = render(<LicenseComplianceWidget data={data} />);
    expect(screen.getByText('80%')).toBeTruthy();
    // amber bar should be present for 70-89 range
    expect(container.querySelector('.bg-amber-500')).toBeTruthy();
  });

  it('shows red color for complianceRate below 70 (GaugeBar red branch)', () => {
    const data = {
      complianceRate: 60,
      overDeployed: [],
      expiring: [],
    };
    const { container } = render(<LicenseComplianceWidget data={data} />);
    expect(screen.getByText('60%')).toBeTruthy();
    expect(container.querySelector('.bg-red-500')).toBeTruthy();
  });

  it('shows red badge for license expiring in 14 days or fewer', () => {
    const data = {
      complianceRate: 90,
      overDeployed: [],
      expiring: [{ name: 'UrgentApp', daysLeft: 10 }],
    };
    render(<LicenseComplianceWidget data={data} />);
    expect(screen.getByText('残り10日')).toBeTruthy();
    // daysLeft <= 14 → red badge
    const badge = screen.getByText('残り10日');
    expect(badge.className).toContain('red');
  });
});

// ─── ProcurementSummaryWidget ────────────────────────────────────────────
describe('ProcurementSummaryWidget', () => {
  it('renders heading', () => {
    render(<ProcurementSummaryWidget />);
    expect(screen.getByText('調達サマリ')).toBeTruthy();
  });

  it('shows total request count', () => {
    render(<ProcurementSummaryWidget />);
    // 5+3+8+12+2 = 30
    expect(screen.getByText('合計 30件')).toBeTruthy();
  });

  it('renders all status labels', () => {
    render(<ProcurementSummaryWidget />);
    expect(screen.getByText('申請中')).toBeTruthy();
    expect(screen.getByText('承認待ち')).toBeTruthy();
    expect(screen.getByText('発注済')).toBeTruthy();
    expect(screen.getByText('納品済')).toBeTruthy();
    expect(screen.getByText('却下')).toBeTruthy();
  });

  it('renders monthly trend heading', () => {
    render(<ProcurementSummaryWidget />);
    expect(screen.getByText('月次トレンド')).toBeTruthy();
  });

  it('renders monthly labels', () => {
    render(<ProcurementSummaryWidget />);
    expect(screen.getByText('10月')).toBeTruthy();
    expect(screen.getByText('3月')).toBeTruthy();
  });

  it('accepts custom data prop', () => {
    const data = {
      statuses: [{ label: 'テスト', count: 7, color: '#000' }],
      monthly: [{ month: '4月', count: 7 }],
    };
    render(<ProcurementSummaryWidget data={data} />);
    expect(screen.getByText('合計 7件')).toBeTruthy();
    expect(screen.getByText('4月')).toBeTruthy();
  });
});

// ─── SecurityScoreWidget ─────────────────────────────────────────────────
describe('SecurityScoreWidget', () => {
  it('renders heading', () => {
    render(<SecurityScoreWidget />);
    expect(screen.getByText('セキュリティスコア')).toBeTruthy();
  });

  it('renders overall score', () => {
    render(<SecurityScoreWidget />);
    expect(screen.getByText('82')).toBeTruthy();
  });

  it('renders all metric labels', () => {
    render(<SecurityScoreWidget />);
    expect(screen.getByText('Defender 有効率')).toBeTruthy();
    expect(screen.getByText('BitLocker 暗号化率')).toBeTruthy();
    expect(screen.getByText('パッチ適用率')).toBeTruthy();
    expect(screen.getByText('ファイアウォール準拠率')).toBeTruthy();
  });

  it('renders metric percentages', () => {
    render(<SecurityScoreWidget />);
    expect(screen.getByText('95%')).toBeTruthy();
    expect(screen.getByText('78%')).toBeTruthy();
  });

  it('accepts custom data prop', () => {
    const data = {
      overall: 45,
      metrics: [{ label: 'カスタム指標', score: 45, max: 100 }],
    };
    render(<SecurityScoreWidget data={data} />);
    // 45 appears for both overall and metric
    const scores = screen.getAllByText('45');
    expect(scores.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('カスタム指標')).toBeTruthy();
  });

  it('getScoreColor applies correct color for high score (>=90)', () => {
    const data = {
      overall: 95,
      metrics: [{ label: '高スコア', score: 95, max: 100 }],
    };
    const { container } = render(<SecurityScoreWidget data={data} />);
    // emerald bar should be present
    expect(container.querySelector('.bg-emerald-500')).toBeTruthy();
  });

  it('getScoreColor applies amber for medium score (70-89)', () => {
    const data = {
      overall: 75,
      metrics: [{ label: '中スコア', score: 75, max: 100 }],
    };
    const { container } = render(<SecurityScoreWidget data={data} />);
    expect(container.querySelector('.bg-amber-500')).toBeTruthy();
  });

  it('getScoreColor applies red for low score (<70)', () => {
    const data = {
      overall: 50,
      metrics: [{ label: '低スコア', score: 50, max: 100 }],
    };
    const { container } = render(<SecurityScoreWidget data={data} />);
    expect(container.querySelector('.bg-red-500')).toBeTruthy();
  });
});
