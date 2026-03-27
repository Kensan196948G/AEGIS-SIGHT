'use client';

import { useEffect, useState, useCallback } from 'react';
import { StatCard } from '@/components/ui/stat-card';
import { fetchDashboardStats, fetchAlerts, ApiError } from '@/lib/api';
import type { DashboardStats, Alert } from '@/lib/types';

const severityStyles = {
  critical: 'border-l-red-500 bg-red-50 dark:bg-red-900/10',
  warning: 'border-l-amber-500 bg-amber-50 dark:bg-amber-900/10',
  info: 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10',
};

const severityBadge = {
  critical: 'aegis-badge-danger',
  warning: 'aegis-badge-warning',
  info: 'aegis-badge-info',
};

const severityLabel = {
  critical: '重大',
  warning: '警告',
  info: '情報',
};

// フォールバック用モックデータ
const fallbackStats: DashboardStats = {
  totalDevices: 1284,
  activeAlerts: 7,
  licenseComplianceRate: 94.2,
  pendingProcurements: 12,
  devicesTrend: 3.2,
  alertsTrend: -15,
  complianceTrend: 1.5,
  procurementsTrend: 8,
};

const fallbackAlerts: (Alert & { time?: string })[] = [
  {
    id: '1',
    type: 'compliance',
    severity: 'critical',
    title: 'Adobe Creative Suite ライセンス超過',
    message: '購入数50に対し、インストール数が58台検出されました',
    source: 'SAMスキャン',
    acknowledged: false,
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    id: '2',
    type: 'performance',
    severity: 'warning',
    title: 'サーバー CPU 使用率 90% 超過',
    message: 'srv-prod-03 の CPU 使用率が継続的に高い状態です',
    source: '監視エージェント',
    acknowledged: false,
    createdAt: new Date(Date.now() - 32 * 60000).toISOString(),
  },
  {
    id: '3',
    type: 'inventory',
    severity: 'warning',
    title: 'Windows 10 サポート終了まで 90日',
    message: '47台の端末が Windows 10 を使用中です',
    source: '資産管理',
    acknowledged: false,
    createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
  },
  {
    id: '4',
    type: 'inventory',
    severity: 'info',
    title: '調達申請 #PR-2024-089 承認済み',
    message: 'Dell Latitude 5540 x 20台の調達が承認されました',
    source: '調達管理',
    acknowledged: true,
    createdAt: new Date(Date.now() - 120 * 60000).toISOString(),
  },
  {
    id: '5',
    type: 'inventory',
    severity: 'info',
    title: '新規デバイス検出',
    message: '3台の新規デバイスがネットワークに接続されました',
    source: '資産スキャン',
    acknowledged: false,
    createdAt: new Date(Date.now() - 180 * 60000).toISOString(),
  },
];

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'たった今';
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  return `${days}日前`;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(fallbackStats);
  const [alerts, setAlerts] = useState<Alert[]>(fallbackAlerts);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [statsRes, alertsRes] = await Promise.allSettled([
        fetchDashboardStats(),
        fetchAlerts(1, 5),
      ]);

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data);
      }
      if (alertsRes.status === 'fulfilled') {
        setAlerts(alertsRes.value.data);
      }

      // 両方失敗した場合のみエラー表示（フォールバックデータは維持）
      if (statsRes.status === 'rejected' && alertsRes.status === 'rejected') {
        const err = statsRes.reason;
        if (err instanceof ApiError && err.status !== 401) {
          setError('データの取得に失敗しました。フォールバックデータを表示しています。');
        }
      }
    } catch {
      setError('データの取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // 60秒ごとに自動リフレッシュ
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ダッシュボード</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            IT資産管理の概要とアラート
          </p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            更新中...
          </div>
        )}
      </div>

      {/* エラー通知 */}
      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <p className="text-sm text-amber-800 dark:text-amber-200">{error}</p>
            <button
              onClick={loadData}
              className="ml-auto text-sm font-medium text-amber-700 hover:text-amber-900 dark:text-amber-300"
            >
              再試行
            </button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="管理端末数"
          value={stats.totalDevices.toLocaleString()}
          trend={stats.devicesTrend}
          iconColor="blue"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z" />
            </svg>
          }
        />
        <StatCard
          title="アクティブアラート"
          value={stats.activeAlerts}
          trend={stats.alertsTrend}
          iconColor="red"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          }
        />
        <StatCard
          title="ライセンス遵守率"
          value={`${stats.licenseComplianceRate}%`}
          trend={stats.complianceTrend}
          iconColor="green"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          }
        />
        <StatCard
          title="調達申請数"
          value={stats.pendingProcurements}
          trend={stats.procurementsTrend}
          iconColor="amber"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
            </svg>
          }
        />
      </div>

      {/* Recent Alerts */}
      <div className="aegis-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">最近のアラート</h2>
          <a
            href="/dashboard/monitoring"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            すべて表示 &rarr;
          </a>
        </div>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-lg border-l-4 p-4 ${severityStyles[alert.severity]}`}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={severityBadge[alert.severity]}>
                      {severityLabel[alert.severity]}
                    </span>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {alert.title}
                    </h3>
                  </div>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {alert.message}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                    <span>{alert.source}</span>
                    <span>&middot;</span>
                    <span>{formatRelativeTime(alert.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
