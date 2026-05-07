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
      setPolicies(policiesRes.items);
      setViolations(violationsRes.items);
      setCompliance(complianceRes);
    } catch {
      setPolicies([]);
      setViolations([]);
      setCompliance(null);
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
