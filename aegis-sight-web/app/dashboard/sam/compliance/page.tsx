'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { DonutChart, BarChart } from '@/components/ui/chart';

const complianceData = [
  {
    id: '1',
    softwareName: 'Adobe Creative Cloud',
    vendor: 'Adobe',
    licensed: 50,
    installed: 58,
    gap: 8,
    status: 'over-deployed' as const,
    risk: 'high' as const,
    lastScan: '2024-03-15 14:30',
    action: '追加ライセンス購入またはアンインストール',
  },
  {
    id: '2',
    softwareName: 'AutoCAD LT 2024',
    vendor: 'Autodesk',
    licensed: 30,
    installed: 33,
    gap: 3,
    status: 'over-deployed' as const,
    risk: 'medium' as const,
    lastScan: '2024-03-15 14:30',
    action: 'ライセンス追加申請中',
  },
  {
    id: '3',
    softwareName: 'Visio Professional',
    vendor: 'Microsoft',
    licensed: 20,
    installed: 22,
    gap: 2,
    status: 'over-deployed' as const,
    risk: 'medium' as const,
    lastScan: '2024-03-15 14:30',
    action: '利用状況ヒアリング中',
  },
  {
    id: '4',
    softwareName: 'Photoshop Elements',
    vendor: 'Adobe',
    licensed: 15,
    installed: 16,
    gap: 1,
    status: 'over-deployed' as const,
    risk: 'low' as const,
    lastScan: '2024-03-15 14:30',
    action: '次回更新時に調整予定',
  },
  {
    id: '5',
    softwareName: 'Norton 360',
    vendor: 'Gen Digital',
    licensed: 600,
    installed: 320,
    gap: -280,
    status: 'under-utilized' as const,
    risk: 'info' as const,
    lastScan: '2024-03-15 14:30',
    action: 'ライセンス数削減を検討',
  },
  {
    id: '6',
    softwareName: 'Slack Business+',
    vendor: 'Salesforce',
    licensed: 600,
    installed: 412,
    gap: -188,
    status: 'under-utilized' as const,
    risk: 'info' as const,
    lastScan: '2024-03-15 14:30',
    action: '次回契約更新時にダウンサイズ',
  },
];

const statusConfig = {
  'over-deployed': { label: '超過', variant: 'danger' as const },
  'under-utilized': { label: '低利用', variant: 'warning' as const },
  compliant: { label: '準拠', variant: 'success' as const },
  expired: { label: '期限切れ', variant: 'danger' as const },
};

const riskConfig = {
  high: { label: '高', variant: 'danger' as const },
  medium: { label: '中', variant: 'warning' as const },
  low: { label: '低', variant: 'default' as const },
  info: { label: '情報', variant: 'info' as const },
};

export default function CompliancePage() {
  const [filter, setFilter] = useState<'all' | 'over-deployed' | 'under-utilized'>('all');

  const filtered = filter === 'all'
    ? complianceData
    : complianceData.filter((d) => d.status === filter);

  const overDeployedCount = complianceData.filter((d) => d.status === 'over-deployed').length;
  const underUtilizedCount = complianceData.filter((d) => d.status === 'under-utilized').length;
  const totalGapCost = complianceData
    .filter((d) => d.gap > 0)
    .reduce((sum, d) => sum + d.gap * 12000, 0); // estimate per-license cost

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            コンプライアンスチェック
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            ライセンス超過・低利用の検出結果
          </p>
        </div>
        <div className="flex gap-2">
          <button className="aegis-btn-secondary">
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
            再スキャン
          </button>
          <button className="aegis-btn-primary">
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            レポート出力
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="aegis-card flex items-center gap-4">
          <DonutChart value={94.2} size={80} strokeWidth={8} color="#10b981" label="遵守率" />
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">全体遵守率</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">94.2%</p>
          </div>
        </div>
        <div className="aegis-card text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">超過ライセンス</p>
          <p className="mt-1 text-3xl font-bold text-red-600 dark:text-red-400">{overDeployedCount}</p>
          <p className="mt-1 text-xs text-gray-400">件検出</p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">低利用ライセンス</p>
          <p className="mt-1 text-3xl font-bold text-amber-600 dark:text-amber-400">{underUtilizedCount}</p>
          <p className="mt-1 text-xs text-gray-400">件検出</p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">推定超過コスト</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
            {totalGapCost.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-gray-400">円/年</p>
        </div>
      </div>

      {/* Gap Chart */}
      <div className="aegis-card">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          超過ライセンス数
        </h2>
        <BarChart
          data={complianceData
            .filter((d) => d.gap > 0)
            .map((d) => ({
              label: d.softwareName.split(' ')[0],
              value: d.gap,
              color: d.risk === 'high' ? 'bg-red-500' : d.risk === 'medium' ? 'bg-amber-500' : 'bg-gray-400',
            }))}
          height={180}
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-3 dark:border-aegis-border">
        {[
          { key: 'all', label: 'すべて', count: complianceData.length },
          { key: 'over-deployed', label: '超過', count: overDeployedCount },
          { key: 'under-utilized', label: '低利用', count: underUtilizedCount },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as typeof filter)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-aegis-surface'
            }`}
          >
            {tab.label}
            <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-xs dark:bg-gray-700">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Compliance Table */}
      <div className="aegis-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50 dark:border-aegis-border dark:bg-aegis-dark/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">ソフトウェア</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">ベンダー</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">ライセンス数</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">インストール数</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">差分</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">ステータス</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">リスク</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">対応</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
              {filtered.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    {item.softwareName}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {item.vendor}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                    {item.licensed}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                    {item.installed}
                  </td>
                  <td className={`whitespace-nowrap px-6 py-4 text-right text-sm font-semibold ${
                    item.gap > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {item.gap > 0 ? `+${item.gap}` : item.gap}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Badge variant={statusConfig[item.status].variant} dot>
                      {statusConfig[item.status].label}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Badge variant={riskConfig[item.risk].variant}>
                      {riskConfig[item.risk].label}
                    </Badge>
                  </td>
                  <td className="max-w-xs truncate px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {item.action}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
