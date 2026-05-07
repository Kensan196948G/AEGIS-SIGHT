'use client';

import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { DonutChart, BarChart } from '@/components/ui/chart';
import {
  fetchAlerts,
  fetchAlertStats,
  acknowledgeAlert,
  resolveAlert,
} from '@/lib/api';
import type { BackendAlert, BackendAlertStats } from '@/lib/api';

type Severity = 'critical' | 'warning' | 'info';
type Category = 'security' | 'license' | 'hardware' | 'network';
type AlertStatus = 'open' | 'acknowledged' | 'resolved';

const severityVariant: Record<Severity, 'danger' | 'warning' | 'info'> = {
  critical: 'danger',
  warning: 'warning',
  info: 'info',
};

const severityLabel: Record<Severity, string> = {
  critical: '重大',
  warning: '警告',
  info: '情報',
};

const categoryLabel: Record<Category, string> = {
  security: 'セキュリティ',
  license: 'ライセンス',
  hardware: 'ハードウェア',
  network: 'ネットワーク',
};

function getAlertStatus(alert: BackendAlert): AlertStatus {
  if (alert.resolved_at) return 'resolved';
  if (alert.is_acknowledged) return 'acknowledged';
  return 'open';
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<BackendAlert[]>([]);
  const [stats, setStats] = useState<BackendAlertStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'all'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const isAck = statusFilter === 'acknowledged' ? true
        : statusFilter === 'open' ? false
        : undefined;
      const [alertData, statsData] = await Promise.all([
        fetchAlerts(0, 100,
          severityFilter !== 'all' ? severityFilter : undefined,
          categoryFilter !== 'all' ? categoryFilter : undefined,
          isAck,
        ),
        fetchAlertStats(),
      ]);
      let items = alertData.items;
      if (statusFilter === 'resolved') {
        items = items.filter(a => a.resolved_at !== null);
      }
      setAlerts(items);
      setStats(statsData);
    } catch {
      // show empty state
    } finally {
      setLoading(false);
    }
  }, [severityFilter, categoryFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function handleAcknowledge(alertId: string) {
    setActionInProgress(alertId);
    try {
      await acknowledgeAlert(alertId);
      await load();
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleResolve(alertId: string) {
    setActionInProgress(alertId);
    try {
      await resolveAlert(alertId);
      await load();
    } finally {
      setActionInProgress(null);
    }
  }

  const total = stats?.total ?? 0;
  const resolvedCount = total - (stats?.unresolved ?? total);
  const resolveRate = total > 0 ? Math.round((resolvedCount / total) * 100) : 0;
  const resolveRateColor = resolveRate >= 80 ? '#10b981' : resolveRate >= 60 ? '#f59e0b' : '#ef4444';
  const severityBarData = [
    { label: '重大', value: stats?.critical ?? 0, color: 'bg-red-500' },
    { label: '警告', value: stats?.warning ?? 0, color: 'bg-amber-500' },
    { label: '情報', value: stats?.info ?? 0, color: 'bg-blue-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">アラート管理</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          システムアラートの一覧と管理
        </p>
      </div>

      {/* アラート概要チャート */}
      <div className="aegis-card">
        <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">アラート概要</h2>
        {loading && !stats ? (
          <div className="animate-pulse h-40 bg-gray-100 dark:bg-gray-800 rounded" />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">解決率</p>
              <DonutChart value={resolveRate} max={100} size={140} strokeWidth={14} color={resolveRateColor} label={`${resolveRate}%`} />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                全 {total} 件中 {resolvedCount} 件解決済（未解決: {stats?.unresolved ?? 0}）
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">重要度別アラート数</p>
              <BarChart
                data={severityBarData}
                maxValue={Math.max(stats?.critical ?? 1, stats?.warning ?? 1, stats?.info ?? 1)}
                height={160}
                showValues
              />
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <div className="aegis-card text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.total ?? '—'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">合計</p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats?.critical ?? '—'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">重大</p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats?.warning ?? '—'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">警告</p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats?.info ?? '—'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">情報</p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats?.unacknowledged ?? '—'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">未確認</p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats?.unresolved ?? '—'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">未解決</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as Severity | 'all')}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 dark:border-aegis-border dark:bg-aegis-surface dark:text-gray-300"
        >
          <option value="all">全重要度</option>
          <option value="critical">重大</option>
          <option value="warning">警告</option>
          <option value="info">情報</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as Category | 'all')}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 dark:border-aegis-border dark:bg-aegis-surface dark:text-gray-300"
        >
          <option value="all">全カテゴリ</option>
          <option value="security">セキュリティ</option>
          <option value="license">ライセンス</option>
          <option value="hardware">ハードウェア</option>
          <option value="network">ネットワーク</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as AlertStatus | 'all')}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 dark:border-aegis-border dark:bg-aegis-surface dark:text-gray-300"
        >
          <option value="all">全状態</option>
          <option value="open">未対応</option>
          <option value="acknowledged">確認済</option>
          <option value="resolved">解決済</option>
        </select>
      </div>

      {/* Alerts Table */}
      <div className="aegis-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-aegis-border dark:bg-aegis-darker">
              <tr>
                <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400">重要度</th>
                <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400">カテゴリ</th>
                <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400">タイトル</th>
                <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400">状態</th>
                <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400">作成日時</th>
                <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-4">
                      <div className="h-4 rounded bg-gray-200 dark:bg-gray-700" />
                    </td>
                  </tr>
                ))
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    該当するアラートはありません
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => {
                  const status = getAlertStatus(alert);
                  const sev = alert.severity as Severity;
                  const cat = alert.category as Category;
                  const isActing = actionInProgress === String(alert.id);
                  return (
                    <tr key={String(alert.id)} className="transition-colors hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
                      <td className="px-6 py-4">
                        <Badge variant={severityVariant[sev] ?? 'info'} dot>
                          {severityLabel[sev] ?? sev}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-700 dark:text-gray-300">
                          {categoryLabel[cat] ?? cat}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{alert.title}</p>
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{alert.message}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            status === 'resolved' ? 'success'
                            : status === 'acknowledged' ? 'info'
                            : 'danger'
                          }
                        >
                          {status === 'resolved' ? '解決済'
                           : status === 'acknowledged' ? '確認済'
                           : '未対応'}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-500 dark:text-gray-400">
                        {new Date(alert.created_at).toLocaleString('ja-JP')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {!alert.is_acknowledged && (
                            <button
                              disabled={isActing}
                              onClick={() => handleAcknowledge(String(alert.id))}
                              className="rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                            >
                              確認
                            </button>
                          )}
                          {!alert.resolved_at && (
                            <button
                              disabled={isActing}
                              onClick={() => handleResolve(String(alert.id))}
                              className="rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
                            >
                              解決
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
