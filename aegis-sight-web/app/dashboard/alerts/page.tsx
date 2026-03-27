'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

type Severity = 'critical' | 'warning' | 'info';
type Category = 'security' | 'license' | 'hardware' | 'network';
type AlertStatus = 'open' | 'acknowledged' | 'resolved';

interface AlertItem {
  id: string;
  severity: Severity;
  category: Category;
  title: string;
  message: string;
  is_acknowledged: boolean;
  resolved_at: string | null;
  created_at: string;
}

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

// Demo data
const demoAlerts: AlertItem[] = [
  {
    id: '1',
    severity: 'critical',
    category: 'security',
    title: '不正アクセス試行を検出',
    message: '外部IPからの複数回ログイン失敗が検出されました。',
    is_acknowledged: false,
    resolved_at: null,
    created_at: '2026-03-27T14:30:00Z',
  },
  {
    id: '2',
    severity: 'critical',
    category: 'hardware',
    title: 'ディスク使用率が95%を超過',
    message: 'SRV-DB-01のディスク使用率が95%を超えています。',
    is_acknowledged: true,
    resolved_at: null,
    created_at: '2026-03-27T13:15:00Z',
  },
  {
    id: '3',
    severity: 'warning',
    category: 'license',
    title: 'Adobe CCライセンス残数不足',
    message: '残りライセンス数が5以下です。追加購入を検討してください。',
    is_acknowledged: false,
    resolved_at: null,
    created_at: '2026-03-27T12:00:00Z',
  },
  {
    id: '4',
    severity: 'warning',
    category: 'network',
    title: 'VPNゲートウェイ応答遅延',
    message: 'VPN-GW-02の応答時間が閾値を超過しています。',
    is_acknowledged: true,
    resolved_at: null,
    created_at: '2026-03-27T11:45:00Z',
  },
  {
    id: '5',
    severity: 'info',
    category: 'security',
    title: 'Windows Defenderパターン更新完了',
    message: '全端末のDefenderパターンファイルが最新に更新されました。',
    is_acknowledged: true,
    resolved_at: '2026-03-27T10:30:00Z',
    created_at: '2026-03-27T09:00:00Z',
  },
  {
    id: '6',
    severity: 'warning',
    category: 'hardware',
    title: 'UPS バッテリー劣化警告',
    message: 'サーバールームUPS-01のバッテリー残容量が60%を下回っています。',
    is_acknowledged: false,
    resolved_at: null,
    created_at: '2026-03-26T16:20:00Z',
  },
  {
    id: '7',
    severity: 'info',
    category: 'license',
    title: 'Microsoft 365ライセンス自動更新完了',
    message: 'E3ライセンス200件の自動更新が完了しました。',
    is_acknowledged: true,
    resolved_at: '2026-03-26T14:00:00Z',
    created_at: '2026-03-26T12:00:00Z',
  },
];

const demoStats = {
  total: 47,
  critical: 8,
  warning: 21,
  info: 18,
  unacknowledged: 15,
  unresolved: 32,
};

function getAlertStatus(alert: AlertItem): AlertStatus {
  if (alert.resolved_at) return 'resolved';
  if (alert.is_acknowledged) return 'acknowledged';
  return 'open';
}

export default function AlertsPage() {
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'all'>('all');

  const filtered = demoAlerts.filter((alert) => {
    if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
    if (categoryFilter !== 'all' && alert.category !== categoryFilter) return false;
    const status = getAlertStatus(alert);
    if (statusFilter !== 'all' && status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          アラート管理
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          システムアラートの一覧と管理
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <div className="aegis-card text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{demoStats.total}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">合計</p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{demoStats.critical}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">重大</p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{demoStats.warning}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">警告</p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{demoStats.info}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">情報</p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{demoStats.unacknowledged}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">未確認</p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{demoStats.unresolved}</p>
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
              {filtered.map((alert) => {
                const status = getAlertStatus(alert);
                return (
                  <tr
                    key={alert.id}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-aegis-surface/50"
                  >
                    <td className="px-6 py-4">
                      <Badge variant={severityVariant[alert.severity]} dot>
                        {severityLabel[alert.severity]}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-700 dark:text-gray-300">
                        {categoryLabel[alert.category]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {alert.title}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          {alert.message}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          status === 'resolved'
                            ? 'success'
                            : status === 'acknowledged'
                              ? 'info'
                              : 'danger'
                        }
                      >
                        {status === 'resolved'
                          ? '解決済'
                          : status === 'acknowledged'
                            ? '確認済'
                            : '未対応'}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500 dark:text-gray-400">
                      {new Date(alert.created_at).toLocaleString('ja-JP')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {!alert.is_acknowledged && (
                          <button className="rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50">
                            確認
                          </button>
                        )}
                        {!alert.resolved_at && (
                          <button className="rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50">
                            解決
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    該当するアラートはありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
