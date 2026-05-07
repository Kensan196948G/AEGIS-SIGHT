'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { DonutChart, BarChart, ProgressBar } from '@/components/ui/chart';
import { fetchSecurityOverview } from '@/lib/api';
import type { BackendSecurityOverview } from '@/lib/api';

const vulnerabilities = [
  { id: 'CVE-2024-21338', severity: 'critical', title: 'Windows Kernel Elevation of Privilege', affected: 47, status: 'patching' },
  { id: 'CVE-2024-21412', severity: 'critical', title: 'Internet Shortcut SmartScreen Bypass', affected: 23, status: 'patching' },
  { id: 'CVE-2024-21351', severity: 'warning', title: 'Windows SmartScreen Security Feature Bypass', affected: 156, status: 'scheduled' },
  { id: 'CVE-2024-20677', severity: 'warning', title: 'Microsoft Office Remote Code Execution', affected: 312, status: 'scheduled' },
  { id: 'CVE-2024-20674', severity: 'info', title: 'Windows Kerberos Security Feature Bypass', affected: 14, status: 'resolved' },
];

const recentEvents = [
  { time: '15:42', type: 'threat', msg: 'マルウェア検出: Trojan:Win32/Emotet - PC-SALES-042', status: '隔離済' },
  { time: '14:18', type: 'policy', msg: 'BitLocker暗号化開始: PC-HR-015', status: '進行中' },
  { time: '13:55', type: 'patch', msg: 'KB5034763 適用失敗: SRV-APP-02', status: '要対応' },
  { time: '12:30', type: 'auth', msg: 'ブルートフォース検出: 5回の失敗ログイン - admin_ext', status: 'ブロック済' },
  { time: '11:15', type: 'patch', msg: '月次パッチ適用完了: 1,105台', status: '完了' },
];

const eventTypeStyles: Record<string, string> = {
  threat: 'bg-red-500',
  policy: 'bg-blue-500',
  patch: 'bg-amber-500',
  auth: 'bg-purple-500',
};

const statusVariants: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'purple'> = {
  '隔離済': 'success',
  '進行中': 'info',
  '要対応': 'danger',
  'ブロック済': 'purple',
  '完了': 'success',
};

export default function SecurityPage() {
  const [overview, setOverview] = useState<BackendSecurityOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSecurityOverview()
      .then(setOverview)
      .catch(() => setOverview(null))
      .finally(() => setLoading(false));
  }, []);

  const total = overview?.total_devices_with_status ?? 0;
  const defenderEnabled = overview?.defender.enabled_count ?? 0;
  const defenderDisabled = overview?.defender.disabled_count ?? 0;
  const defenderPct = overview?.defender.enabled_percentage ?? 0;

  const bitlockerEnabled = overview?.bitlocker.enabled_count ?? 0;
  const bitlockerDisabled = overview?.bitlocker.disabled_count ?? 0;
  const bitlockerPct = overview?.bitlocker.enabled_percentage ?? 0;

  const devicesFullyPatched = overview?.patches.devices_fully_patched ?? 0;
  const devicesWithPending = overview?.patches.devices_with_pending ?? 0;
  const patchPct = total > 0 ? Math.round((devicesFullyPatched / total) * 100) : 0;

  const overallScore = Math.round((defenderPct + bitlockerPct + patchPct) / 3);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            セキュリティ概要
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Defender、BitLocker、パッチ管理の統合ビュー
          </p>
        </div>
        <button className="aegis-btn-primary">
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
          </svg>
          フルスキャン実行
        </button>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Defender */}
        <div className="aegis-card">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Microsoft Defender
            </h3>
            {loading ? (
              <div className="h-5 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            ) : (
              <Badge variant={defenderPct >= 95 ? 'success' : defenderPct >= 80 ? 'warning' : 'danger'} dot>
                {defenderPct}%
              </Badge>
            )}
          </div>
          <div className="mt-4 flex items-center gap-4">
            {loading ? (
              <div className="h-[90px] w-[90px] animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
            ) : (
              <DonutChart
                value={defenderEnabled}
                max={total || 1}
                size={90}
                strokeWidth={8}
                color="#10b981"
                label="有効"
              />
            )}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-gray-600 dark:text-gray-400">有効: {loading ? '—' : defenderEnabled}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-gray-600 dark:text-gray-400">無効: {loading ? '—' : defenderDisabled}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">合計: {loading ? '—' : total}</span>
              </div>
            </div>
          </div>
        </div>

        {/* BitLocker */}
        <div className="aegis-card">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              BitLocker暗号化
            </h3>
            {loading ? (
              <div className="h-5 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            ) : (
              <Badge variant={bitlockerPct >= 95 ? 'success' : bitlockerPct >= 80 ? 'info' : 'warning'} dot>
                {bitlockerPct}%
              </Badge>
            )}
          </div>
          <div className="mt-4 flex items-center gap-4">
            {loading ? (
              <div className="h-[90px] w-[90px] animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
            ) : (
              <DonutChart
                value={bitlockerEnabled}
                max={total || 1}
                size={90}
                strokeWidth={8}
                color="#2563eb"
                label="暗号化"
              />
            )}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary-500" />
                <span className="text-gray-600 dark:text-gray-400">暗号化済: {loading ? '—' : bitlockerEnabled}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-gray-600 dark:text-gray-400">未暗号化: {loading ? '—' : bitlockerDisabled}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">合計: {loading ? '—' : total}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Patch Status */}
        <div className="aegis-card">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              パッチ適用状況
            </h3>
            {loading ? (
              <div className="h-5 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            ) : (
              <Badge variant={patchPct >= 90 ? 'success' : patchPct >= 70 ? 'warning' : 'danger'} dot>
                {patchPct}%
              </Badge>
            )}
          </div>
          <div className="mt-4 flex items-center gap-4">
            {loading ? (
              <div className="h-[90px] w-[90px] animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
            ) : (
              <DonutChart
                value={devicesFullyPatched}
                max={total || 1}
                size={90}
                strokeWidth={8}
                color="#f59e0b"
                label="最新"
              />
            )}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-gray-600 dark:text-gray-400">最新: {loading ? '—' : devicesFullyPatched}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-gray-600 dark:text-gray-400">適用待: {loading ? '—' : devicesWithPending}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">合計: {loading ? '—' : total}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Score */}
      <div className="aegis-card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            セキュリティスコア
          </h2>
          {!loading && overview && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              対象デバイス: {total.toLocaleString()}台
            </span>
          )}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            { label: 'エンドポイント保護 (Defender)', value: loading ? 0 : Math.round(defenderPct) },
            { label: 'ディスク暗号化 (BitLocker)', value: loading ? 0 : Math.round(bitlockerPct) },
            { label: 'パッチ適用率', value: loading ? 0 : patchPct },
          ].map((metric) => (
            <div key={metric.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">{metric.label}</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {loading ? '—' : `${metric.value}%`}
                </span>
              </div>
              <ProgressBar value={metric.value} max={100} color="auto" size="md" showLabel={false} />
            </div>
          ))}
        </div>
        {!loading && (
          <div className="mt-4 flex items-center justify-end gap-2 border-t border-gray-200 pt-4 dark:border-aegis-border">
            <span className="text-sm text-gray-500 dark:text-gray-400">総合スコア:</span>
            <span className={`text-2xl font-bold ${overallScore >= 90 ? 'text-emerald-600' : overallScore >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
              {overallScore}%
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Vulnerabilities */}
        <div className="aegis-card overflow-hidden p-0">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-aegis-border">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              脆弱性一覧
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-aegis-border">
            {vulnerabilities.map((vuln) => (
              <div key={vuln.id} className="flex items-center gap-4 px-6 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
                <Badge
                  variant={
                    vuln.severity === 'critical' ? 'danger' :
                    vuln.severity === 'warning' ? 'warning' : 'info'
                  }
                  dot
                >
                  {vuln.severity === 'critical' ? '重大' : vuln.severity === 'warning' ? '警告' : '情報'}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {vuln.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {vuln.id} - {vuln.affected}台
                  </p>
                </div>
                <Badge
                  variant={
                    vuln.status === 'resolved' ? 'success' :
                    vuln.status === 'patching' ? 'info' : 'warning'
                  }
                >
                  {vuln.status === 'resolved' ? '解決済' :
                   vuln.status === 'patching' ? '適用中' : '予定'}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Events */}
        <div className="aegis-card overflow-hidden p-0">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-aegis-border">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              セキュリティイベント
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-aegis-border">
            {recentEvents.map((event, i) => (
              <div key={i} className="flex items-start gap-3 px-6 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
                <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${eventTypeStyles[event.type]}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900 dark:text-white">{event.msg}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant={statusVariants[event.status] || 'default'}>
                      {event.status}
                    </Badge>
                    <span className="text-xs text-gray-400">{event.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* OS Distribution Chart */}
      <div className="aegis-card">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          OS別端末分布
        </h2>
        {loading ? (
          <div className="h-[200px] animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        ) : (
          <BarChart
            data={[
              { label: 'Defender有効', value: defenderEnabled, color: 'bg-emerald-500' },
              { label: 'Defender無効', value: defenderDisabled, color: 'bg-red-500' },
              { label: 'BitLocker有効', value: bitlockerEnabled, color: 'bg-blue-500' },
              { label: 'BitLocker無効', value: bitlockerDisabled, color: 'bg-orange-500' },
              { label: 'パッチ最新', value: devicesFullyPatched, color: 'bg-amber-500' },
              { label: 'パッチ待ち', value: devicesWithPending, color: 'bg-gray-400' },
            ]}
            maxValue={Math.max(defenderEnabled, bitlockerEnabled, devicesFullyPatched, 1)}
            height={200}
            showValues
          />
        )}
      </div>
    </div>
  );
}
