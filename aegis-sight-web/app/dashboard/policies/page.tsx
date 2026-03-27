'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PolicyType = 'usb_control' | 'software_restriction' | 'patch_requirement' | 'security_baseline';

interface Policy {
  id: string;
  name: string;
  description: string | null;
  policy_type: PolicyType;
  rules: Record<string, unknown> | null;
  target_groups: string[] | null;
  is_enabled: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

interface Violation {
  id: string;
  policy_id: string;
  policy_name: string;
  device_id: string;
  device_hostname: string;
  violation_type: string;
  detail: Record<string, unknown> | null;
  detected_at: string;
  resolved_at: string | null;
  is_resolved: boolean;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockPolicies: Policy[] = [
  {
    id: '1',
    name: 'USB ストレージ禁止',
    description: '全デバイスでUSBストレージデバイスのマウントを禁止',
    policy_type: 'usb_control',
    rules: { action: 'block', device_class: 'mass_storage' },
    target_groups: null,
    is_enabled: true,
    priority: 100,
    created_at: '2026-01-15T09:00:00Z',
    updated_at: '2026-03-10T14:30:00Z',
  },
  {
    id: '2',
    name: '未承認ソフトウェア制限',
    description: 'ホワイトリスト外のソフトウェアインストールを検出',
    policy_type: 'software_restriction',
    rules: { mode: 'whitelist', notify: true },
    target_groups: ['group-sales', 'group-hr'],
    is_enabled: true,
    priority: 90,
    created_at: '2026-02-01T10:00:00Z',
    updated_at: '2026-03-20T11:00:00Z',
  },
  {
    id: '3',
    name: 'Critical パッチ強制',
    description: 'リリースから14日以内にCriticalパッチの適用を強制',
    policy_type: 'patch_requirement',
    rules: { max_days: 14, severity: ['critical'] },
    target_groups: null,
    is_enabled: true,
    priority: 95,
    created_at: '2026-02-10T08:00:00Z',
    updated_at: '2026-03-25T09:00:00Z',
  },
  {
    id: '4',
    name: 'BitLocker 暗号化必須',
    description: '全デバイスでBitLocker暗号化を有効化',
    policy_type: 'security_baseline',
    rules: { check: 'bitlocker', required: true },
    target_groups: null,
    is_enabled: true,
    priority: 100,
    created_at: '2026-01-20T09:00:00Z',
    updated_at: '2026-03-15T16:00:00Z',
  },
  {
    id: '5',
    name: 'プリンタ制御（無効）',
    description: '特定プリンタへの印刷を制限（現在無効）',
    policy_type: 'usb_control',
    rules: { action: 'audit', device_class: 'printer' },
    target_groups: ['group-finance'],
    is_enabled: false,
    priority: 50,
    created_at: '2026-03-01T12:00:00Z',
    updated_at: '2026-03-01T12:00:00Z',
  },
];

const mockViolations: Violation[] = [
  { id: 'v1', policy_id: '1', policy_name: 'USB ストレージ禁止', device_id: 'd1', device_hostname: 'PC-SALES-042', violation_type: 'usb_mass_storage_connected', detail: { usb_vendor: 'SanDisk', usb_product: 'Ultra USB 3.0' }, detected_at: '2026-03-26T14:23:00Z', resolved_at: null, is_resolved: false },
  { id: 'v2', policy_id: '2', policy_name: '未承認ソフトウェア制限', device_id: 'd2', device_hostname: 'PC-HR-015', violation_type: 'unapproved_software_installed', detail: { software: 'Dropbox 198.4.7490' }, detected_at: '2026-03-25T10:12:00Z', resolved_at: null, is_resolved: false },
  { id: 'v3', policy_id: '3', policy_name: 'Critical パッチ強制', device_id: 'd3', device_hostname: 'SRV-APP-02', violation_type: 'critical_patch_overdue', detail: { kb: 'KB5034763', days_overdue: 21 }, detected_at: '2026-03-24T08:00:00Z', resolved_at: null, is_resolved: false },
  { id: 'v4', policy_id: '4', policy_name: 'BitLocker 暗号化必須', device_id: 'd4', device_hostname: 'PC-DEV-003', violation_type: 'bitlocker_disabled', detail: { drive: 'C:', status: 'FullyDecrypted' }, detected_at: '2026-03-23T16:45:00Z', resolved_at: null, is_resolved: false },
  { id: 'v5', policy_id: '1', policy_name: 'USB ストレージ禁止', device_id: 'd5', device_hostname: 'PC-FIN-007', violation_type: 'usb_mass_storage_connected', detail: { usb_vendor: 'Kingston', usb_product: 'DataTraveler' }, detected_at: '2026-03-22T09:30:00Z', resolved_at: '2026-03-22T10:15:00Z', is_resolved: true },
  { id: 'v6', policy_id: '3', policy_name: 'Critical パッチ強制', device_id: 'd6', device_hostname: 'PC-MKT-012', violation_type: 'critical_patch_overdue', detail: { kb: 'KB5034765', days_overdue: 7 }, detected_at: '2026-03-21T08:00:00Z', resolved_at: '2026-03-24T12:00:00Z', is_resolved: true },
];

const complianceSummary = {
  totalPolicies: 5,
  enabledPolicies: 4,
  totalViolations: 6,
  unresolvedViolations: 4,
  complianceRate: 33.3,
  byType: {
    usb_control: 1,
    software_restriction: 1,
    patch_requirement: 1,
    security_baseline: 1,
  } as Record<string, number>,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const policyTypeBadge: Record<PolicyType, { label: string; className: string }> = {
  usb_control: {
    label: 'USB制御',
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  },
  software_restriction: {
    label: 'ソフトウェア制限',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  patch_requirement: {
    label: 'パッチ要件',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  },
  security_baseline: {
    label: 'セキュリティ基準',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
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
  const [activeTab, setActiveTab] = useState<'policies' | 'violations'>('policies');
  const [violationFilter, setViolationFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPolicy, setNewPolicy] = useState({
    name: '',
    description: '',
    policy_type: 'usb_control' as PolicyType,
    rules: '{}',
    priority: 0,
    is_enabled: true,
  });

  const filteredViolations = mockViolations.filter((v) => {
    if (violationFilter === 'unresolved') return !v.is_resolved;
    if (violationFilter === 'resolved') return v.is_resolved;
    return true;
  });

  return (
    <div className="space-y-6">
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
        <div className="flex gap-3">
          <button className="aegis-btn-secondary">
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
            評価実行
          </button>
          <button
            className="aegis-btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            ポリシー作成
          </button>
        </div>
      </div>

      {/* Compliance Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Compliance rate */}
        <div className="aegis-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">遵守率</p>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              complianceSummary.complianceRate >= 80
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                : complianceSummary.complianceRate >= 50
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {complianceSummary.totalViolations - complianceSummary.unresolvedViolations} / {complianceSummary.totalViolations} 解決
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {complianceSummary.complianceRate}%
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className={`h-full rounded-full transition-all ${
                complianceSummary.complianceRate >= 80
                  ? 'bg-emerald-500'
                  : complianceSummary.complianceRate >= 50
                    ? 'bg-amber-500'
                    : 'bg-red-500'
              }`}
              style={{ width: `${complianceSummary.complianceRate}%` }}
            />
          </div>
        </div>

        {/* Active policies */}
        <div className="aegis-card p-5">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">有効ポリシー</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {complianceSummary.enabledPolicies}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            全 {complianceSummary.totalPolicies} ポリシー中
          </p>
        </div>

        {/* Unresolved violations */}
        <div className="aegis-card p-5">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">未解決違反</p>
          <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">
            {complianceSummary.unresolvedViolations}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            全 {complianceSummary.totalViolations} 件中
          </p>
        </div>

        {/* Violations by type */}
        <div className="aegis-card p-5">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">種別別未解決</p>
          <div className="mt-2 space-y-1.5">
            {Object.entries(complianceSummary.byType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${policyTypeBadge[type as PolicyType]?.className}`}>
                  {policyTypeBadge[type as PolicyType]?.label}
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{count}</span>
              </div>
            ))}
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
          {complianceSummary.unresolvedViolations > 0 && (
            <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {complianceSummary.unresolvedViolations}
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
                    対象グループ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    更新日
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-aegis-border">
                {mockPolicies.map((policy) => {
                  const badge = policyTypeBadge[policy.policy_type];
                  return (
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
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}>
                          {badge.label}
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
                        {policy.target_groups ? `${policy.target_groups.length} グループ` : '全デバイス'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(policy.updated_at)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <button className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
                          編集
                        </button>
                        <span className="mx-2 text-gray-300 dark:text-gray-600">|</span>
                        <button className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                          削除
                        </button>
                      </td>
                    </tr>
                  );
                })}
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
                    デバイス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    ポリシー
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    違反内容
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    詳細
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
                {filteredViolations.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-mono font-medium text-primary-600 dark:text-primary-400">
                      {v.device_hostname}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">
                      {v.policy_name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {v.violation_type}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                      {v.detail ? JSON.stringify(v.detail) : '-'}
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
                ))}
                {filteredViolations.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                      該当する違反はありません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Policy Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl dark:bg-aegis-darker">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                新規ポリシー作成
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-aegis-surface dark:hover:text-gray-200"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  ポリシー名
                </label>
                <input
                  type="text"
                  value={newPolicy.name}
                  onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-aegis-border dark:bg-aegis-surface dark:text-white"
                  placeholder="例: USB ストレージ禁止"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  説明
                </label>
                <textarea
                  value={newPolicy.description}
                  onChange={(e) => setNewPolicy({ ...newPolicy, description: e.target.value })}
                  rows={2}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-aegis-border dark:bg-aegis-surface dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  ポリシー種別
                </label>
                <select
                  value={newPolicy.policy_type}
                  onChange={(e) => setNewPolicy({ ...newPolicy, policy_type: e.target.value as PolicyType })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-aegis-border dark:bg-aegis-surface dark:text-white"
                >
                  <option value="usb_control">USB制御</option>
                  <option value="software_restriction">ソフトウェア制限</option>
                  <option value="patch_requirement">パッチ要件</option>
                  <option value="security_baseline">セキュリティ基準</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  ルール (JSON)
                </label>
                <textarea
                  value={newPolicy.rules}
                  onChange={(e) => setNewPolicy({ ...newPolicy, rules: e.target.value })}
                  rows={4}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-xs shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-aegis-border dark:bg-aegis-surface dark:text-white"
                  placeholder='{"action": "block", "device_class": "mass_storage"}'
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    優先度
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newPolicy.priority}
                    onChange={(e) => setNewPolicy({ ...newPolicy, priority: parseInt(e.target.value) || 0 })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-aegis-border dark:bg-aegis-surface dark:text-white"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newPolicy.is_enabled}
                      onChange={(e) => setNewPolicy({ ...newPolicy, is_enabled: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      有効にする
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="aegis-btn-secondary"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  // In production: POST /api/v1/policies
                  setShowCreateModal(false);
                }}
                className="aegis-btn-primary"
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
