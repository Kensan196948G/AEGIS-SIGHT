'use client';

import {
  StatCard, DonutChart, MiniBarChart, ProgressBar, AlertItem,
} from '@/components/ui/design-components';

const STATS = {
  totalDevices: 1284, activeAlerts: 7, complianceRate: 94.2, pendingProcurements: 12,
  devicesTrend: 3.2, alertsTrend: -15, complianceTrend: 1.5, procurementsTrend: 8,
};

const OS_DATA = [
  { label: 'Win 11', value: 680, color: '#3b82f6' },
  { label: 'Win 10', value: 420, color: '#60a5fa' },
  { label: 'macOS',  value: 124, color: '#8b5cf6' },
  { label: 'Linux',  value: 60,  color: '#f59e0b' },
];

const DEPT_DATA = [
  { label: 'エンジニア', value: 280, color: '#2563eb' },
  { label: '営業',       value: 240, color: '#10b981' },
  { label: '管理',       value: 180, color: '#f59e0b' },
  { label: '建設現場',   value: 340, color: '#8b5cf6' },
  { label: 'その他',     value: 244, color: '#94a3b8' },
];

const RECENT_ALERTS = [
  { severity: 'critical' as const, title: 'Adobe Creative Suite ライセンス超過', message: '購入数50に対し、インストール数58台検出', source: 'SAMスキャン', time: '15分前' },
  { severity: 'warning'  as const, title: 'サーバー CPU 使用率 90% 超過', message: 'srv-prod-03 の CPU 使用率が継続的に高い状態', source: '監視エージェント', time: '32分前' },
  { severity: 'warning'  as const, title: 'Windows 10 サポート終了まで 90日', message: '47台の端末が Windows 10 を使用中', source: '資産管理', time: '1時間前' },
  { severity: 'info'     as const, title: '調達申請 #PR-2024-089 承認済み', message: 'Dell Latitude 5540 x 20台の調達が承認', source: '調達管理', time: '2時間前' },
  { severity: 'info'     as const, title: '新規デバイス検出', message: '3台の新規デバイスがネットワークに接続', source: '資産スキャン', time: '3時間前' },
];

const ACTIVITY_FEED = [
  { user: '田中 一郎', action: 'PC-TANAKA-001 にパッチ KB5034765 を適用', time: '10分前' },
  { user: 'システム',   action: 'SAMライセンス自動同期完了（M365 Graph API）', time: '25分前' },
  { user: '佐藤 花子', action: '調達申請 #PR-2024-090 を提出', time: '45分前' },
  { user: '管理者',     action: 'デバイスグループ「営業部-支社」を更新', time: '1時間前' },
  { user: 'システム',   action: 'セキュリティスキャン完了（脆弱性: 0件）', time: '2時間前' },
];

const SECURITY_METRICS = [
  { label: 'Defender 有効率', score: 95 },
  { label: 'BitLocker 暗号化率', score: 78 },
  { label: 'パッチ適用率', score: 72 },
  { label: 'ファイアウォール準拠率', score: 88 },
];

function DeviceIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" />
    </svg>
  );
}
function AlertIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}
function CartIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  );
}

export default function DashboardPage() {
  const compColor = STATS.complianceRate >= 90 ? '#10b981' : STATS.complianceRate >= 70 ? '#f59e0b' : '#ef4444';
  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">ダッシュボード</h1>
          <p className="page-subtitle">IT資産管理の概要とアラート — {today}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4">
        <StatCard title="管理端末数" value={STATS.totalDevices.toLocaleString()} trend={STATS.devicesTrend}
          icon={<DeviceIcon />} iconBg="#eff6ff" accentColor="#2563eb" />
        <StatCard title="アクティブアラート" value={STATS.activeAlerts} trend={STATS.alertsTrend}
          icon={<AlertIcon />} iconBg="#fef2f2" accentColor="#ef4444" />
        <StatCard title="ライセンス遵守率" value={`${STATS.complianceRate}%`} trend={STATS.complianceTrend}
          icon={<ShieldIcon />} iconBg="#ecfdf5" accentColor="#10b981" />
        <StatCard title="調達申請数" value={STATS.pendingProcurements} trend={STATS.procurementsTrend}
          icon={<CartIcon />} iconBg="#fffbeb" accentColor="#f59e0b" />
      </div>

      {/* Charts */}
      <div className="grid-2">
        <div className="card">
          <h2 className="card-title">システム概要</h2>
          <div className="chart-row">
            <div className="chart-center">
              <p className="chart-label">ライセンスコンプライアンス率</p>
              <DonutChart value={STATS.complianceRate} max={100} size={140} strokeWidth={14} color={compColor} />
              <p className="chart-sublabel">{STATS.totalDevices} 管理端末 / {STATS.activeAlerts} アラート</p>
            </div>
            <div style={{ flex: 1 }}>
              <p className="chart-label">主要指標</p>
              <MiniBarChart
                data={[
                  { label: '管理端末', value: STATS.totalDevices, color: '#2563eb' },
                  { label: 'アラート', value: STATS.activeAlerts, color: '#ef4444' },
                  { label: '調達待ち', value: STATS.pendingProcurements, color: '#f59e0b' },
                ]}
                maxValue={STATS.totalDevices}
                height={160}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">セキュリティスコア</h2>
          <div className="chart-center" style={{ marginBottom: 16 }}>
            <DonutChart value={82} max={100} size={110} strokeWidth={10} color="#10b981" label="82" />
          </div>
          <div className="security-metrics">
            {SECURITY_METRICS.map((m, i) => (
              <div key={i} className="metric-row">
                <div className="metric-header">
                  <span className="metric-label">{m.label}</span>
                  <span className={`metric-value ${m.score >= 90 ? 'text-green' : m.score >= 70 ? 'text-amber' : 'text-red'}`}>{m.score}%</span>
                </div>
                <ProgressBar value={m.score} color={m.score >= 90 ? '#10b981' : m.score >= 70 ? '#f59e0b' : '#ef4444'} label={false} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* OS + Dept */}
      <div className="grid-2">
        <div className="card">
          <h2 className="card-title">OS別端末数</h2>
          <MiniBarChart data={OS_DATA} height={180} />
        </div>
        <div className="card">
          <h2 className="card-title">部門別端末数</h2>
          <MiniBarChart data={DEPT_DATA} height={180} />
        </div>
      </div>

      {/* Alerts + Activity */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header-row">
            <h2 className="card-title">最近のアラート</h2>
            <button className="link-btn">すべて表示 →</button>
          </div>
          <div className="alert-list">
            {RECENT_ALERTS.map((a, i) => <AlertItem key={i} {...a} />)}
          </div>
        </div>

        <div className="card">
          <div className="card-header-row">
            <h2 className="card-title">アクティビティ</h2>
            <button className="link-btn">すべて表示 →</button>
          </div>
          <div className="activity-list">
            {ACTIVITY_FEED.map((a, i) => (
              <div key={i} className="activity-item">
                <div className="activity-dot" />
                <div className="activity-content">
                  <p className="activity-text"><strong>{a.user}</strong> {a.action}</p>
                  <p className="activity-time">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
