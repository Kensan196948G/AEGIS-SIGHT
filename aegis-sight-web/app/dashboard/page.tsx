'use client';

import { useEffect, useState } from 'react';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { DonutChart, BarChart } from '@/components/ui/chart';
import { fetchDashboardStats, fetchRecentAlerts } from '@/lib/api';
import type { BackendDashboardStats, BackendAlert } from '@/lib/api';

type AlertSeverity = 'critical' | 'warning' | 'info';

const categoryLabel: Record<string, string> = {
  security: 'セキュリティ',
  license: 'ライセンス',
  hardware: 'ハードウェア',
  network: 'ネットワーク',
};

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  return `${Math.floor(hours / 24)}日前`;
}

const severityStyles: Record<AlertSeverity, string> = {
  critical: 'border-l-red-500 bg-red-50 dark:bg-red-900/10',
  warning: 'border-l-amber-500 bg-amber-50 dark:bg-amber-900/10',
  info: 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10',
};

const severityConfig: Record<AlertSeverity, { variant: 'danger' | 'warning' | 'info'; label: string }> = {
  critical: { variant: 'danger',  label: '重大' },
  warning:  { variant: 'warning', label: '警告' },
  info:     { variant: 'info',    label: '情報' },
};

export function getCompColor(rate: number): string {
  return rate >= 90 ? '#10b981' : rate >= 70 ? '#f59e0b' : '#ef4444';
}

function StatsSkeleton() {
  return (
    <div className="animate-pulse grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="aegis-card h-28 bg-gray-100 dark:bg-gray-800" />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<BackendDashboardStats | null>(null);
  const [alerts, setAlerts] = useState<BackendAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [statsData, alertsData] = await Promise.all([
          fetchDashboardStats(),
          fetchRecentAlerts(5),
        ]);
        if (!mounted) return;
        setStats(statsData);
        setAlerts(alertsData.items);
      } catch {
        // leave nulls; UI shows fallback zeros
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const totalDevices = stats?.total_devices ?? 0;
  const activeAlerts = stats?.active_alerts ?? 0;
  const complianceRate = stats?.compliance_rate ?? 0;
  const pendingProcurements = stats?.pending_procurements ?? 0;
  const compRate = Math.round(complianceRate);
  const compColor = getCompColor(compRate);

  const overviewBarData = [
    { label: '管理端末', value: totalDevices, color: 'bg-blue-500' },
    { label: 'アラート', value: activeAlerts, color: 'bg-red-500' },
    { label: '調達待ち', value: pendingProcurements, color: 'bg-amber-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ダッシュボード</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          IT資産管理の概要とアラート
        </p>
      </div>

      {/* システム概要チャート */}
      <div className="aegis-card">
        <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">システム概要</h2>
        {loading ? (
          <div className="animate-pulse h-40 bg-gray-100 dark:bg-gray-800 rounded" />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">ライセンスコンプライアンス率</p>
              <DonutChart value={compRate} max={100} size={140} strokeWidth={14} color={compColor} label={`${compRate}%`} />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {totalDevices} 管理端末 / {activeAlerts} アクティブアラート
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">主要指標</p>
              <BarChart data={overviewBarData} maxValue={Math.max(...overviewBarData.map(d => d.value), 1)} height={160} showValues />
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      {loading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="管理端末数"
            value={totalDevices.toLocaleString()}
            iconColor="blue"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z" />
              </svg>
            }
          />
          <StatCard
            title="アクティブアラート"
            value={activeAlerts}
            iconColor="red"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            }
          />
          <StatCard
            title="ライセンス遵守率"
            value={`${compRate}%`}
            iconColor="green"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            }
          />
          <StatCard
            title="調達申請数"
            value={pendingProcurements}
            iconColor="amber"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
              </svg>
            }
          />
        </div>
      )}

      {/* Recent Alerts */}
      <div className="aegis-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">最近のアラート</h2>
          <a
            href="/dashboard/alerts"
            className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            すべて表示 &rarr;
          </a>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse h-16 rounded-lg bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">アラートはありません</p>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const sev = (alert.severity as AlertSeverity) in severityStyles
                ? (alert.severity as AlertSeverity)
                : 'info';
              return (
                <div
                  key={alert.id}
                  className={`rounded-lg border-l-4 p-4 ${severityStyles[sev]}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={severityConfig[sev].variant} dot size="sm">
                          {severityConfig[sev].label}
                        </Badge>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {alert.title}
                        </h3>
                      </div>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {alert.message}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                        <span>{categoryLabel[alert.category] ?? alert.category}</span>
                        <span>&middot;</span>
                        <span>{formatRelativeTime(alert.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
