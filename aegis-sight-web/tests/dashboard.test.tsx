import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardPage from '@/app/dashboard/page';

describe('DashboardPage', () => {
  it('renders the dashboard title', () => {
    render(<DashboardPage />);
    expect(screen.getByText('ダッシュボード')).toBeInTheDocument();
  });

  it('renders all stat cards', () => {
    render(<DashboardPage />);
    expect(screen.getByText('管理端末数')).toBeInTheDocument();
    expect(screen.getByText('アクティブアラート')).toBeInTheDocument();
    expect(screen.getByText('ライセンス遵守率')).toBeInTheDocument();
    expect(screen.getByText('調達申請数')).toBeInTheDocument();
  });

  it('displays stat values', () => {
    render(<DashboardPage />);
    expect(screen.getAllByText('1,284')[0]).toBeInTheDocument();
    expect(screen.getAllByText('7')[0]).toBeInTheDocument();
    expect(screen.getAllByText('94.2%')[0]).toBeInTheDocument();
    expect(screen.getAllByText('12')[0]).toBeInTheDocument();
  });

  it('renders recent alerts section', () => {
    render(<DashboardPage />);
    expect(screen.getByText('最近のアラート')).toBeInTheDocument();
    expect(screen.getByText('Adobe Creative Suite ライセンス超過')).toBeInTheDocument();
  });

  it('shows alert severity badges', () => {
    render(<DashboardPage />);
    const criticalBadges = screen.getAllByText('重大');
    expect(criticalBadges.length).toBeGreaterThan(0);
  });
});
