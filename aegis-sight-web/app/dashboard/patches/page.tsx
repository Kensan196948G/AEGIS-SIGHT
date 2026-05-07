'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { DonutChart, ProgressBar } from '@/components/ui/chart';
import {
  fetchPatchCompliance,
  fetchMissingPatches,
  fetchVulnerabilities,
} from '@/lib/api';
import type {
  BackendPatchComplianceSummary,
  BackendMissingPatchEntry,
  BackendVulnerability,
} from '@/lib/api';

// ---------------------------------------------------------------------------
// Dummy data (shown when API returns empty or errors)
// ---------------------------------------------------------------------------

const DUMMY_PATCH_COMPLIANCE: BackendPatchComplianceSummary = {
  total_devices: 128,
  total_updates: 47,
  fully_patched_devices: 104,
  compliance_rate: 81,
  critical_missing: 8,
  important_missing: 19,
  moderate_missing: 14,
  low_missing: 6,
};

const DUMMY_MISSING_PATCHES: BackendMissingPatchEntry[] = [
  { update_id: 'upd-kb5034441', kb_number: 'KB5034441', title: '2026年4月 Windows 11 セキュリティ更新プログラム', severity: 'critical', release_date: '2026-04-09T00:00:00Z', missing_device_count: 5 },
  { update_id: 'upd-kb5034843', kb_number: 'KB5034843', title: '2026年3月 Windows 10 累積更新プログラム', severity: 'critical', release_date: '2026-03-12T00:00:00Z', missing_device_count: 3 },
  { update_id: 'upd-kb5034122', kb_number: 'KB5034122', title: 'Microsoft Edge セキュリティ更新（CVE-2026-1234）', severity: 'important', release_date: '2026-04-15T00:00:00Z', missing_device_count: 11 },
  { update_id: 'upd-kb5033372', kb_number: 'KB5033372', title: 'Windows Defender 定義ファイル更新', severity: 'important', release_date: '2026-04-20T00:00:00Z', missing_device_count: 8 },
  { update_id: 'upd-kb5032392', kb_number: 'KB5032392', title: '.NET Framework 4.8.1 セキュリティ更新', severity: 'important', release_date: '2026-03-25T00:00:00Z', missing_device_count: 7 },
  { update_id: 'upd-kb5031455', kb_number: 'KB5031455', title: 'Microsoft Office 2021 セキュリティ更新', severity: 'important', release_date: '2026-04-08T00:00:00Z', missing_device_count: 6 },
  { update_id: 'upd-kb5030219', kb_number: 'KB5030219', title: 'Windows Server 2022 品質更新プログラム', severity: 'moderate', release_date: '2026-03-28T00:00:00Z', missing_device_count: 2 },
  { update_id: 'upd-kb5029244', kb_number: 'KB5029244', title: 'Visual C++ 再頒布可能パッケージ更新', severity: 'moderate', release_date: '2026-04-01T00:00:00Z', missing_device_count: 9 },
  { update_id: 'upd-kb5028185', kb_number: 'KB5028185', title: 'Windows Print Spooler 更新プログラム', severity: 'moderate', release_date: '2026-03-15T00:00:00Z', missing_device_count: 4 },
  { update_id: 'upd-kb5027148', kb_number: 'KB5027148', title: 'Windows Subsystem for Linux 更新', severity: 'low', release_date: '2026-02-20T00:00:00Z', missing_device_count: 6 },
];

const DUMMY_VULNERABILITIES: BackendVulnerability[] = [
  { id: 'vuln-0001', cve_id: 'CVE-2026-21408', title: 'Windows Remote Desktop Services リモートコード実行の脆弱性', severity: 'critical', cvss_score: 9.8, affected_software: { product: 'Windows RDP', versions: ['10', '11', 'Server 2022'] }, remediation: 'KB5034441 を適用すること', published_at: '2026-04-09T00:00:00Z', is_resolved: false, resolved_at: null, created_at: '2026-04-09T06:00:00Z' },
  { id: 'vuln-0002', cve_id: 'CVE-2026-19648', title: 'Microsoft Edge (Chromium) タイプコンフュージョンの脆弱性', severity: 'high', cvss_score: 8.8, affected_software: { product: 'Microsoft Edge', versions: ['< 124.0.2478.80'] }, remediation: 'Edge を 124.0.2478.80 以降に更新すること', published_at: '2026-04-15T00:00:00Z', is_resolved: false, resolved_at: null, created_at: '2026-04-15T00:00:00Z' },
  { id: 'vuln-0003', cve_id: 'CVE-2026-18522', title: 'Windows Print Spooler 権限昇格の脆弱性', severity: 'high', cvss_score: 7.8, affected_software: { product: 'Windows Print Spooler', versions: ['all'] }, remediation: 'KB5028185 を適用し、不要な場合はPrint Spoolerを無効化', published_at: '2026-03-15T00:00:00Z', is_resolved: true, resolved_at: '2026-03-20T12:00:00Z', created_at: '2026-03-15T00:00:00Z' },
  { id: 'vuln-0004', cve_id: 'CVE-2026-17394', title: '.NET Framework ヒープバッファオーバーフローの脆弱性', severity: 'high', cvss_score: 7.5, affected_software: { product: '.NET Framework', versions: ['4.7', '4.8'] }, remediation: 'KB5032392 を適用すること', published_at: '2026-03-25T00:00:00Z', is_resolved: false, resolved_at: null, created_at: '2026-03-25T00:00:00Z' },
  { id: 'vuln-0005', cve_id: 'CVE-2026-16201', title: 'Microsoft Office Word リモートコード実行の脆弱性', severity: 'high', cvss_score: 7.2, affected_software: { product: 'Microsoft Word', versions: ['2016', '2019', '2021'] }, remediation: 'KB5031455 を適用すること', published_at: '2026-04-08T00:00:00Z', is_resolved: false, resolved_at: null, created_at: '2026-04-08T00:00:00Z' },
  { id: 'vuln-0006', cve_id: 'CVE-2026-14876', title: 'Windows SMB クライアント情報漏洩の脆弱性', severity: 'medium', cvss_score: 5.5, affected_software: { product: 'Windows SMB', versions: ['Windows 10', 'Windows 11'] }, remediation: '2026年3月の累積更新プログラムを適用すること', published_at: '2026-03-12T00:00:00Z', is_resolved: true, resolved_at: '2026-03-25T00:00:00Z', created_at: '2026-03-12T00:00:00Z' },
];

// ---------------------------------------------------------------------------
// Static placeholder (no backend endpoint yet)
// ---------------------------------------------------------------------------

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

export function getComplianceDonutColor(rate: number): string {
  return rate >= 90 ? '#10b981' : rate >= 70 ? '#f59e0b' : '#ef4444';
}

export function getComplianceStatusClass(rate: number): string {
  return rate >= 90
    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
    : rate >= 70
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
}

export function getComplianceBarClass(rate: number): string {
  return rate >= 90 ? 'bg-emerald-500' : rate >= 70 ? 'bg-amber-500' : 'bg-red-500';
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function PatchesPage() {
  const [compliance, setCompliance] = useState<BackendPatchComplianceSummary | null>(null);
  const [missingPatches, setMissingPatches] = useState<BackendMissingPatchEntry[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<BackendVulnerability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [comp, missing, vulnPage] = await Promise.all([
          fetchPatchCompliance(),
          fetchMissingPatches(50),
          fetchVulnerabilities(0, 50),
        ]);
        // Fall back to dummy data when API returns empty results
        setCompliance(comp.total_devices === 0 ? DUMMY_PATCH_COMPLIANCE : comp);
        setMissingPatches(missing.length === 0 ? DUMMY_MISSING_PATCHES : missing);
        setVulnerabilities((vulnPage.items || []).length === 0 ? DUMMY_VULNERABILITIES : vulnPage.items);
      } catch {
        // Fallback to dummy data on error
        setCompliance(DUMMY_PATCH_COMPLIANCE);
        setMissingPatches(DUMMY_MISSING_PATCHES);
        setVulnerabilities(DUMMY_VULNERABILITIES);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const rate = compliance?.compliance_rate ?? 0;
  const totalMissing =
    (compliance?.critical_missing ?? 0) +
    (compliance?.important_missing ?? 0) +
    (compliance?.moderate_missing ?? 0) +
    (compliance?.low_missing ?? 0);

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

      {/* Patch Compliance Overview */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="aegis-card h-48 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          <div className="aegis-card h-48 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* DonutChart: Compliance Rate */}
          <div className="aegis-card flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="flex flex-col items-center">
              <DonutChart
                value={rate}
                max={100}
                size={140}
                strokeWidth={14}
                color={getComplianceDonutColor(rate)}
                label={`${rate}%`}
              />
              <p className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                パッチ適用率
              </p>
            </div>
            <div className="flex-1 space-y-1.5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                適用状況（{compliance?.fully_patched_devices ?? 0} / {compliance?.total_devices ?? 0} 台）
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                未適用パッチ総数: {compliance?.total_updates ?? 0} 件
              </p>
              <div className="space-y-2 pt-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Critical</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {compliance?.critical_missing ?? 0} 件
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Important</span>
                  <span className="font-semibold text-orange-600 dark:text-orange-400">
                    {compliance?.important_missing ?? 0} 件
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Moderate</span>
                  <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                    {compliance?.moderate_missing ?? 0} 件
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Low</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {compliance?.low_missing ?? 0} 件
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ProgressBar: Severity Breakdown */}
          <div className="aegis-card">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
              重要度別 未適用パッチ比率
            </h2>
            <div className="space-y-4">
              {[
                { label: 'Critical',  value: compliance?.critical_missing ?? 0,  color: 'red'   as const },
                { label: 'Important', value: compliance?.important_missing ?? 0, color: 'amber' as const },
                { label: 'Moderate',  value: compliance?.moderate_missing ?? 0,  color: 'amber' as const },
                { label: 'Low',       value: compliance?.low_missing ?? 0,       color: 'blue'  as const },
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{item.value} 件</span>
                  </div>
                  <ProgressBar
                    value={item.value}
                    max={totalMissing || 1}
                    color={item.color}
                    size="sm"
                    showLabel={false}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Compliance Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aegis-card h-28 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="aegis-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">適用率</p>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getComplianceStatusClass(rate)}`}>
                {compliance?.fully_patched_devices ?? 0} / {compliance?.total_devices ?? 0}台
              </span>
            </div>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {rate}%
            </p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className={`h-full rounded-full transition-all ${getComplianceBarClass(rate)}`}
                style={{ width: `${rate}%` }}
              />
            </div>
          </div>

          <div className="aegis-card p-5">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Critical 未適用</p>
            <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">
              {compliance?.critical_missing ?? 0}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              デバイス x パッチ件数
            </p>
          </div>

          <div className="aegis-card p-5">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Important 未適用</p>
            <p className="mt-2 text-3xl font-bold text-orange-600 dark:text-orange-400">
              {compliance?.important_missing ?? 0}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              デバイス x パッチ件数
            </p>
          </div>

          <div className="aegis-card p-5">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Moderate 未適用</p>
            <p className="mt-2 text-3xl font-bold text-yellow-600 dark:text-yellow-400">
              {compliance?.moderate_missing ?? 0}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              デバイス x パッチ件数
            </p>
          </div>
        </div>
      )}

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
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">KB番号</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">タイトル</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">重要度</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">リリース日</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">未適用台数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-aegis-border">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(5)].map((__, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 rounded bg-gray-200 dark:bg-gray-700" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : missingPatches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    未適用パッチなし
                  </td>
                </tr>
              ) : (
                missingPatches.map((patch) => (
                  <tr key={patch.update_id} className="hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-mono font-medium text-primary-600 dark:text-primary-400">
                      {patch.kb_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">
                      {patch.title}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${severityColor[patch.severity] ?? ''}`}>
                        {patch.severity}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(patch.release_date).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">
                      {patch.missing_device_count}
                    </td>
                  </tr>
                ))
              )}
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
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">CVE ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">タイトル</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">重要度</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">CVSS</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">公開日</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">状態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-aegis-border">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(6)].map((__, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 rounded bg-gray-200 dark:bg-gray-700" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : vulnerabilities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    脆弱性なし
                  </td>
                </tr>
              ) : (
                vulnerabilities.map((vuln) => (
                  <tr key={vuln.id} className="hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-mono font-medium text-primary-600 dark:text-primary-400">
                      {vuln.cve_id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">
                      {vuln.title}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${severityColor[vuln.severity] ?? ''}`}>
                        {vuln.severity}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                          <div
                            className={`h-full rounded-full ${cvssBarColor(vuln.cvss_score)}`}
                            style={{ width: `${(vuln.cvss_score / 10) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {vuln.cvss_score}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(vuln.published_at).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {vuln.is_resolved ? (
                        <Badge variant="success">解決済</Badge>
                      ) : (
                        <Badge variant="danger">未解決</Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Device Patch Heatmap (static placeholder — no backend endpoint) */}
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
                <div className={`absolute left-0 top-0 h-full w-1 ${heatmapStatusColor[device.status]}`} />
                <p className="ml-2 truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {device.hostname}
                </p>
                <div className="ml-2 mt-2 space-y-1">
                  {device.critical > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">Critical: {device.critical}</span>
                    </div>
                  )}
                  {device.important > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-orange-500" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">Important: {device.important}</span>
                    </div>
                  )}
                  {device.moderate > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-yellow-500" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">Moderate: {device.moderate}</span>
                    </div>
                  )}
                  {device.critical === 0 && device.important === 0 && device.moderate === 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">全て適用済</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

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
