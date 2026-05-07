'use client';

import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { DonutChart, BarChart } from '@/components/ui/chart';
import {
  fetchPolicies,
  fetchPolicyViolations,
  fetchPolicyCompliance,
  type BackendDevicePolicy,
  type BackendPolicyViolation,
  type BackendPolicyComplianceSummary,
} from '@/lib/api';

// ---------------------------------------------------------------------------
// Dummy data (shown when API returns empty or errors)
// ---------------------------------------------------------------------------

const DUMMY_COMPLIANCE: BackendPolicyComplianceSummary = {
  total_policies: 8,
  enabled_policies: 7,
  total_violations: 10,
  unresolved_violations: 4,
  compliance_rate: 88.5,
  by_type: {
    usb_control: 3,
    software_restriction: 2,
    patch_requirement: 2,
    security_baseline: 1,
  },
};

const DUMMY_POLICIES: BackendDevicePolicy[] = [
  { id: 'pol-0001-aaaa-bbbb-cccc', name: 'USB外部メディア制御ポリシー', description: '未承認USBデバイスの接続をブロックし、業務承認済みデバイスのみ許可する', policy_type: 'usb_control', rules: { block_unknown: true, allow_list: ['VID_0781', 'VID_059F'] }, target_groups: null, is_enabled: true, priority: 1, created_by: 'admin@aegis.local', created_at: '2026-01-15T09:00:00Z', updated_at: '2026-04-01T11:30:00Z' },
  { id: 'pol-0002-aaaa-bbbb-cccc', name: 'USB読み取り専用ポリシー', description: '一般ユーザーのUSBへの書き込みを禁止し、読み取りのみ許可する', policy_type: 'usb_control', rules: { read_only: true }, target_groups: ['general-users'], is_enabled: true, priority: 2, created_by: 'admin@aegis.local', created_at: '2026-01-20T10:00:00Z', updated_at: '2026-03-15T14:00:00Z' },
  { id: 'pol-0003-aaaa-bbbb-cccc', name: '未承認ソフトウェア実行禁止', description: 'ホワイトリスト外のアプリケーションの起動をブロックする（AppLocker連携）', policy_type: 'software_restriction', rules: { mode: 'whitelist', enforcement: 'block' }, target_groups: null, is_enabled: true, priority: 1, created_by: 'security@aegis.local', created_at: '2026-02-01T08:00:00Z', updated_at: '2026-04-10T09:00:00Z' },
  { id: 'pol-0004-aaaa-bbbb-cccc', name: 'P2Pソフトウェア禁止', description: 'BitTorrent等のP2Pアプリケーションの実行を禁止する', policy_type: 'software_restriction', rules: { category_block: ['p2p', 'torrent'] }, target_groups: null, is_enabled: true, priority: 2, created_by: 'security@aegis.local', created_at: '2026-02-10T09:00:00Z', updated_at: '2026-03-20T10:00:00Z' },
  { id: 'pol-0005-aaaa-bbbb-cccc', name: '重要パッチ72時間適用ポリシー', description: 'CriticalおよびHighパッチは検出から72時間以内に適用必須', policy_type: 'patch_requirement', rules: { critical_hours: 72, high_hours: 168 }, target_groups: null, is_enabled: true, priority: 1, created_by: 'ops@aegis.local', created_at: '2026-01-10T09:00:00Z', updated_at: '2026-04-05T12:00:00Z' },
  { id: 'pol-0006-aaaa-bbbb-cccc', name: 'OS月次パッチ適用ポリシー', description: 'Windowsの月次パッチ（Patch Tuesday）は翌週末までに適用する', policy_type: 'patch_requirement', rules: { monthly_deadline_days: 14 }, target_groups: ['workstations'], is_enabled: true, priority: 2, created_by: 'ops@aegis.local', created_at: '2026-01-25T10:00:00Z', updated_at: '2026-03-25T11:00:00Z' },
  { id: 'pol-0007-aaaa-bbbb-cccc', name: 'Windows Defenderセキュリティ基準', description: 'リアルタイム保護・クラウド保護・自動サンプル送信をすべて有効化する', policy_type: 'security_baseline', rules: { realtime_protection: true, cloud_protection: true, auto_sample: true }, target_groups: null, is_enabled: true, priority: 1, created_by: 'security@aegis.local', created_at: '2026-01-05T09:00:00Z', updated_at: '2026-04-15T08:00:00Z' },
  { id: 'pol-0008-aaaa-bbbb-cccc', name: 'BitLocker暗号化強制ポリシー（廃止検討中）', description: '全デバイスでBitLocker全ディスク暗号化を強制する（次世代MDM移行検討中）', policy_type: 'security_baseline', rules: { bitlocker_required: true, tpm_required: true }, target_groups: null, is_enabled: false, priority: 2, created_by: 'security@aegis.local', created_at: '2026-01-05T09:00:00Z', updated_at: '2026-05-01T16:00:00Z' },
];

const DUMMY_VIOLATIONS: BackendPolicyViolation[] = [
  { id: 'viol-0001', policy_id: 'pol-0001-aaaa-bbbb-cccc', device_id: 'dev-aabb1100-5678', violation_type: 'usb_control', detail: { device_name: 'Kingston DataTraveler 32GB', vid_pid: '0951:1665' }, detected_at: '2026-05-06T08:32:00Z', resolved_at: '2026-05-06T09:15:00Z', is_resolved: true },
  { id: 'viol-0002', policy_id: 'pol-0001-aaaa-bbbb-cccc', device_id: 'dev-ccdd2200-1234', violation_type: 'usb_control', detail: { device_name: 'Unknown USB Storage', vid_pid: '1234:5678' }, detected_at: '2026-05-07T10:05:00Z', resolved_at: null, is_resolved: false },
  { id: 'viol-0003', policy_id: 'pol-0003-aaaa-bbbb-cccc', device_id: 'dev-eeff3300-7890', violation_type: 'software_restriction', detail: { app_name: 'uTorrent.exe', path: 'C:\\Users\\user01\\Downloads\\uTorrent.exe' }, detected_at: '2026-05-05T14:22:00Z', resolved_at: '2026-05-05T15:00:00Z', is_resolved: true },
  { id: 'viol-0004', policy_id: 'pol-0005-aaaa-bbbb-cccc', device_id: 'dev-aabb4400-3456', violation_type: 'patch_requirement', detail: { kb_number: 'KB5034441', severity: 'Critical', elapsed_hours: 96 }, detected_at: '2026-05-04T09:00:00Z', resolved_at: null, is_resolved: false },
  { id: 'viol-0005', policy_id: 'pol-0005-aaaa-bbbb-cccc', device_id: 'dev-ccdd5500-9012', violation_type: 'patch_requirement', detail: { kb_number: 'KB5034763', severity: 'Critical', elapsed_hours: 80 }, detected_at: '2026-05-04T11:30:00Z', resolved_at: null, is_resolved: false },
  { id: 'viol-0006', policy_id: 'pol-0007-aaaa-bbbb-cccc', device_id: 'dev-eeff6600-5678', violation_type: 'security_baseline', detail: { setting: 'realtime_protection', expected: true, actual: false }, detected_at: '2026-05-03T07:45:00Z', resolved_at: '2026-05-03T08:30:00Z', is_resolved: true },
  { id: 'viol-0007', policy_id: 'pol-0002-aaaa-bbbb-cccc', device_id: 'dev-aabb7700-1234', violation_type: 'usb_control', detail: { device_name: 'SanDisk Ultra 64GB', vid_pid: '0781:5581', write_attempted: true }, detected_at: '2026-05-06T16:10:00Z', resolved_at: null, is_resolved: false },
  { id: 'viol-0008', policy_id: 'pol-0006-aaaa-bbbb-cccc', device_id: 'dev-ccdd8800-7890', violation_type: 'patch_requirement', detail: { patch_tuesday: '2026-04-09', deadline: '2026-04-23', days_overdue: 14 }, detected_at: '2026-04-24T09:00:00Z', resolved_at: '2026-04-28T12:00:00Z', is_resolved: true },
  { id: 'viol-0009', policy_id: 'pol-0003-aaaa-bbbb-cccc', device_id: 'dev-eeff9900-3456', violation_type: 'software_restriction', detail: { app_name: 'TeamViewer.exe', path: 'C:\\Program Files\\TeamViewer\\TeamViewer.exe' }, detected_at: '2026-05-07T13:50:00Z', resolved_at: null, is_resolved: false },
  { id: 'viol-0010', policy_id: 'pol-0007-aaaa-bbbb-cccc', device_id: 'dev-aabb0010-5678', violation_type: 'security_baseline', detail: { setting: 'cloud_protection', expected: true, actual: false }, detected_at: '2026-05-02T22:00:00Z', resolved_at: '2026-05-03T07:00:00Z', is_resolved: true },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const policyTypeBadgeClass: Record<string, string> = {
  usb_control: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  software_restriction: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  patch_requirement: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  security_baseline: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
};

const policyTypeLabel: Record<string, string> = {
  usb_control: 'USB制御',
  software_restriction: 'ソフトウェア制限',
  patch_requirement: 'パッチ要件',
  security_baseline: 'セキュリティ基準',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<BackendDevicePolicy[]>([]);
  const [violations, setViolations] = useState<BackendPolicyViolation[]>([]);
  const [compliance, setCompliance] = useState<BackendPolicyComplianceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'policies' | 'violations'>('policies');
  const [violationFilter, setViolationFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [policiesRes, violationsRes, complianceRes] = await Promise.all([
        fetchPolicies(0, 100),
        fetchPolicyViolations(0, 100),
        fetchPolicyCompliance(),
      ]);
      const hasPolicies = (policiesRes.items || []).length > 0;
      const hasViolations = (violationsRes.items || []).length > 0;
      const hasCompliance = complianceRes.total_policies > 0 || complianceRes.total_violations > 0;
      setPolicies(hasPolicies ? policiesRes.items : DUMMY_POLICIES);
      setViolations(hasViolations ? violationsRes.items : DUMMY_VIOLATIONS);
      setCompliance(hasCompliance ? complianceRes : DUMMY_COMPLIANCE);
    } catch {
      setPolicies(DUMMY_POLICIES);
      setViolations(DUMMY_VIOLATIONS);
      setCompliance(DUMMY_COMPLIANCE);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="aegis-card h-48 bg-gray-200 dark:bg-aegis-surface" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aegis-card h-28 bg-gray-200 dark:bg-aegis-surface" />
          ))}
        </div>
        <div className="aegis-card h-64 bg-gray-200 dark:bg-aegis-surface" />
      </div>
    );
  }

  const filteredViolations = violations.filter((v) => {
    if (violationFilter === 'unresolved') return !v.is_resolved;
    if (violationFilter === 'resolved') return v.is_resolved;
    return true;
  });

  const complianceRate = compliance?.compliance_rate ?? 0;
  const totalViolations = compliance?.total_violations ?? 0;
  const unresolvedViolations = compliance?.unresolved_violations ?? 0;
  const totalPolicies = compliance?.total_policies ?? 0;
  const enabledPolicies = compliance?.enabled_policies ?? 0;
  const byType = compliance?.by_type ?? {};

  // Chart data
  const compRate = Math.round(complianceRate);
  const compColor = compRate >= 80 ? '#10b981' : compRate >= 50 ? '#f59e0b' : '#ef4444';
  const typeBarData = Object.entries(byType).map(([type, count], i) => ({
    label: policyTypeLabel[type] ?? type.substring(0, 10),
    value: count as number,
    color: ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500'][i] ?? 'bg-gray-400',
  }));

  return (
    <div className="space-y-6">
      {/* ポリシー概要チャート */}
      <div className="aegis-card">
        <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">ポリシー概要</h2>
        {compliance === null ? (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">データなし</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">コンプライアンス率</p>
              <DonutChart value={compRate} max={100} size={140} strokeWidth={14} color={compColor} label={`${compRate}%`} />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                未解決違反: {unresolvedViolations} 件
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">ポリシー種別別件数</p>
              {typeBarData.length > 0 && (
                <BarChart
                  data={typeBarData}
                  maxValue={Math.max(...typeBarData.map((d) => d.value), 1)}
                  height={160}
                  showValues
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            ポリシー管理
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            デバイスポリシーの設定、USB/印刷制御、違反追跡
          </p>
        </div>
      </div>

      {/* Compliance Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Compliance rate */}
        <div className="aegis-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">遵守率</p>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              complianceRate >= 80
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                : complianceRate >= 50
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {totalViolations - unresolvedViolations} / {totalViolations} 解決
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {complianceRate.toFixed(1)}%
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className={`h-full rounded-full transition-all ${
                complianceRate >= 80
                  ? 'bg-emerald-500'
                  : complianceRate >= 50
                    ? 'bg-amber-500'
                    : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(complianceRate, 100)}%` }}
            />
          </div>
        </div>

        {/* Active policies */}
        <div className="aegis-card p-5">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">有効ポリシー</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {enabledPolicies}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            全 {totalPolicies} ポリシー中
          </p>
        </div>

        {/* Unresolved violations */}
        <div className="aegis-card p-5">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">未解決違反</p>
          <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">
            {unresolvedViolations}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            全 {totalViolations} 件中
          </p>
        </div>

        {/* Violations by type */}
        <div className="aegis-card p-5">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">種別別件数</p>
          <div className="mt-2 space-y-1.5">
            {Object.entries(byType).length === 0 ? (
              <p className="text-xs text-gray-400">データなし</p>
            ) : (
              Object.entries(byType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${policyTypeBadgeClass[type] ?? 'bg-gray-100 text-gray-700'}`}>
                    {policyTypeLabel[type] ?? type}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-aegis-darker">
        <button
          onClick={() => setActiveTab('policies')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'policies'
              ? 'bg-white text-gray-900 shadow dark:bg-aegis-surface dark:text-white'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          ポリシー一覧
        </button>
        <button
          onClick={() => setActiveTab('violations')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'violations'
              ? 'bg-white text-gray-900 shadow dark:bg-aegis-surface dark:text-white'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          違反一覧
          {unresolvedViolations > 0 && (
            <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unresolvedViolations}
            </span>
          )}
        </button>
      </div>

      {/* Policies Table */}
      {activeTab === 'policies' && (
        <div className="aegis-card">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-aegis-border">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              デバイスポリシー
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              USB制御、ソフトウェア制限、パッチ要件、セキュリティ基準
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-aegis-border dark:bg-aegis-darker">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    ポリシー名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    種別
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    状態
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    優先度
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    作成日
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-aegis-border">
                {policies.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                      データなし
                    </td>
                  </tr>
                ) : (
                  policies.map((policy) => (
                    <tr key={policy.id} className="hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {policy.name}
                          </p>
                          {policy.description && (
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                              {policy.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${policyTypeBadgeClass[policy.policy_type] ?? 'bg-gray-100 text-gray-700'}`}>
                          {policyTypeLabel[policy.policy_type] ?? policy.policy_type}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            policy.is_enabled
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              policy.is_enabled ? 'bg-emerald-500' : 'bg-gray-400'
                            }`}
                          />
                          {policy.is_enabled ? '有効' : '無効'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center rounded bg-gray-100 px-2 py-0.5 text-xs font-mono font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          {policy.priority}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(policy.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Violations Table */}
      {activeTab === 'violations' && (
        <div className="aegis-card">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-aegis-border">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                ポリシー違反
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                検出されたポリシー違反の一覧
              </p>
            </div>
            <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5 dark:bg-aegis-darker">
              {(['all', 'unresolved', 'resolved'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setViolationFilter(filter)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    violationFilter === filter
                      ? 'bg-white text-gray-900 shadow dark:bg-aegis-surface dark:text-white'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                  }`}
                >
                  {filter === 'all' ? '全て' : filter === 'unresolved' ? '未解決' : '解決済'}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-aegis-border dark:bg-aegis-darker">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    ポリシーID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    デバイスID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    違反内容
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    検出日時
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    状態
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-aegis-border">
                {filteredViolations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                      データなし
                    </td>
                  </tr>
                ) : (
                  filteredViolations.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-mono text-primary-600 dark:text-primary-400">
                        {v.policy_id.slice(0, 8)}…
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-mono text-gray-700 dark:text-gray-300">
                        {v.device_id.slice(0, 8)}…
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {v.violation_type}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(v.detected_at)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {v.is_resolved ? (
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
      )}
    </div>
  );
}
