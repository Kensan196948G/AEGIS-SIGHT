'use client';

import { Badge } from '@/components/ui/badge';

// ---------------------------------------------------------------------------
// Mock data (to be replaced with API calls)
// ---------------------------------------------------------------------------

const complianceSummary = {
  totalDevices: 1284,
  totalUpdates: 47,
  fullyPatchedDevices: 1105,
  complianceRate: 86.1,
  criticalMissing: 12,
  importantMissing: 34,
  moderateMissing: 18,
  lowMissing: 7,
};

const missingPatches = [
  { id: '1', kbNumber: 'KB5034763', title: '2024-02 Cumulative Update for Windows 11', severity: 'critical', releaseDate: '2024-02-13', missingCount: 47 },
  { id: '2', kbNumber: 'KB5034765', title: '2024-02 Security Update for .NET Framework', severity: 'critical', releaseDate: '2024-02-13', missingCount: 23 },
  { id: '3', kbNumber: 'KB5034441', title: '2024-01 Security Update for Windows RE', severity: 'important', releaseDate: '2024-01-09', missingCount: 132 },
  { id: '4', kbNumber: 'KB5034275', title: '2024-01 Cumulative Update for Windows 11', severity: 'important', releaseDate: '2024-01-09', missingCount: 89 },
  { id: '5', kbNumber: 'KB5033375', title: '2023-12 Cumulative Update Preview', severity: 'moderate', releaseDate: '2023-12-12', missingCount: 56 },
  { id: '6', kbNumber: 'KB5032288', title: '2023-11 Cumulative Update for Windows 11', severity: 'low', releaseDate: '2023-11-14', missingCount: 14 },
];

const vulnerabilities = [
  { id: '1', cveId: 'CVE-2024-21338', title: 'Windows Kernel Elevation of Privilege', severity: 'critical', cvss: 9.8, resolved: false, publishedAt: '2024-02-13' },
  { id: '2', cveId: 'CVE-2024-21412', title: 'Internet Shortcut SmartScreen Bypass', severity: 'critical', cvss: 9.1, resolved: false, publishedAt: '2024-02-13' },
  { id: '3', cveId: 'CVE-2024-21351', title: 'Windows SmartScreen Security Feature Bypass', severity: 'high', cvss: 7.6, resolved: false, publishedAt: '2024-02-13' },
  { id: '4', cveId: 'CVE-2024-20677', title: 'Microsoft Office Remote Code Execution', severity: 'high', cvss: 7.3, resolved: true, publishedAt: '2024-01-09' },
  { id: '5', cveId: 'CVE-2024-20674', title: 'Windows Kerberos Security Feature Bypass', severity: 'medium', cvss: 5.4, resolved: true, publishedAt: '2024-01-09' },
  { id: '6', cveId: 'CVE-2024-20683', title: 'Win32k Elevation of Privilege', severity: 'low', cvss: 3.2, resolved: true, publishedAt: '2024-01-09' },
];

const devicePatchHeatmap = [
  { hostname: 'PC-SALES-001', critical: 0, important: 1, moderate: 0, status: 'good' },
  { hostname: 'PC-SALES-042', critical: 2, important: 3, moderate: 1, status: 'critical' },
  { hostname: 'PC-HR-015', critical: 0, important: 0, moderate: 2, status: 'good' },
  { hostname: 'SRV-APP-01', critical: 1, important: 0, moderate: 0, status: 'warning' },
  { hostname: 'SRV-APP-02', critical: 3, important: 2, moderate: 1, status: 'critical' },
  { hostname: 'PC-DEV-003', critical: 0, important: 0, moderate: 0, status: 'good' },
  { hostname: 'PC-FIN-007', critical: 0, important: 2, moderate: 1, status: 'warning' },
  { hostname: 'SRV-DB-01', critical: 1, important: 1, moderate: 0, status: 'warning' },
  { hostname: 'PC-MKT-012', critical: 0, important: 0, moderate: 1, status: 'good' },
  { hostname: 'PC-ENG-022', critical: 2, important: 1, moderate: 2, status: 'critical' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const severityColor: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  important: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  moderate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

const heatmapStatusColor: Record<string, string> = {
  critical: 'bg-red-500',
  warning: 'bg-amber-500',
  good: 'bg-emerald-500',
};

function cvssBarColor(score: number): string {
  if (score >= 9.0) return 'bg-red-500';
  if (score >= 7.0) return 'bg-orange-500';
  if (score >= 4.0) return 'bg-yellow-500';
  return 'bg-blue-500';
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function PatchesPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            パッチ管理
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Windows Update適用状況、脆弱性追跡、コンプライアンスの統合ビュー
          </p>
        </div>
        <button className="aegis-btn-primary">
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
          </svg>
          スキャン実行
        </button>
      </div>

      {/* Compliance Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Overall compliance */}
        <div className="aegis-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">適用率</p>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              complianceSummary.complianceRate >= 90
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                : complianceSummary.complianceRate >= 70
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {complianceSummary.fullyPatchedDevices} / {complianceSummary.totalDevices}台
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {complianceSummary.complianceRate}%
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className={`h-full rounded-full transition-all ${
                complianceSummary.complianceRate >= 90
                  ? 'bg-emerald-500'
                  : complianceSummary.complianceRate >= 70
                    ? 'bg-amber-500'
                    : 'bg-red-500'
              }`}
              style={{ width: `${complianceSummary.complianceRate}%` }}
            />
          </div>
        </div>

        {/* Critical missing */}
        <div className="aegis-card p-5">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Critical 未適用</p>
          <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">
            {complianceSummary.criticalMissing}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            デバイス x パッチ件数
          </p>
        </div>

        {/* Important missing */}
        <div className="aegis-card p-5">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Important 未適用</p>
          <p className="mt-2 text-3xl font-bold text-orange-600 dark:text-orange-400">
            {complianceSummary.importantMissing}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            デバイス x パッチ件数
          </p>
        </div>

        {/* Moderate missing */}
        <div className="aegis-card p-5">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Moderate 未適用</p>
          <p className="mt-2 text-3xl font-bold text-yellow-600 dark:text-yellow-400">
            {complianceSummary.moderateMissing}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            デバイス x パッチ件数
          </p>
        </div>
      </div>

      {/* Missing Patches Table */}
      <div className="aegis-card">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-aegis-border">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            未適用パッチ一覧
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            1台以上のデバイスで未適用のWindows Update
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-aegis-border dark:bg-aegis-darker">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  KB番号
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  タイトル
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  重要度
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  リリース日
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  未適用台数
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-aegis-border">
              {missingPatches.map((patch) => (
                <tr key={patch.id} className="hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-mono font-medium text-primary-600 dark:text-primary-400">
                    {patch.kbNumber}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">
                    {patch.title}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${severityColor[patch.severity]}`}>
                      {patch.severity}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {patch.releaseDate}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    {patch.missingCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vulnerabilities */}
      <div className="aegis-card">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-aegis-border">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            CVE 脆弱性一覧
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            追跡中のCVE脆弱性とCVSSスコア
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-aegis-border dark:bg-aegis-darker">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  CVE ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  タイトル
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  重要度
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  CVSS
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  公開日
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  状態
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-aegis-border">
              {vulnerabilities.map((vuln) => (
                <tr key={vuln.id} className="hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-mono font-medium text-primary-600 dark:text-primary-400">
                    {vuln.cveId}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">
                    {vuln.title}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${severityColor[vuln.severity]}`}>
                      {vuln.severity}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                          className={`h-full rounded-full ${cvssBarColor(vuln.cvss)}`}
                          style={{ width: `${(vuln.cvss / 10) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {vuln.cvss}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {vuln.publishedAt}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {vuln.resolved ? (
                      <Badge variant="success">解決済</Badge>
                    ) : (
                      <Badge variant="danger">未解決</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Device Patch Heatmap */}
      <div className="aegis-card">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-aegis-border">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            デバイス別パッチ状態
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            デバイスごとの未適用パッチ数（重要度別）
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {devicePatchHeatmap.map((device) => (
              <div
                key={device.hostname}
                className="relative overflow-hidden rounded-lg border border-gray-200 p-4 dark:border-aegis-border"
              >
                {/* Status indicator bar */}
                <div className={`absolute left-0 top-0 h-full w-1 ${heatmapStatusColor[device.status]}`} />

                <p className="ml-2 text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {device.hostname}
                </p>
                <div className="ml-2 mt-2 space-y-1">
                  {device.critical > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Critical: {device.critical}
                      </span>
                    </div>
                  )}
                  {device.important > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-orange-500" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Important: {device.important}
                      </span>
                    </div>
                  )}
                  {device.moderate > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-yellow-500" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Moderate: {device.moderate}
                      </span>
                    </div>
                  )}
                  {device.critical === 0 && device.important === 0 && device.moderate === 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">
                        全て適用済
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center gap-6 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              適用済
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              一部未適用
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              Critical未適用あり
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
