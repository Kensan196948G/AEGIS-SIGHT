'use client';

import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { BarChart, DonutChart } from '@/components/ui/chart';
import {
  fetchSLADashboard,
  fetchSLADefinitions,
  fetchSLAViolations,
  type BackendSLADashboard,
  type BackendSLADefinition,
  type BackendSLAViolation,
} from '@/lib/api';

// ---------------------------------------------------------------------------
// Dummy fallback data shown when backend returns empty
// ---------------------------------------------------------------------------

const DUMMY_DASHBOARD: BackendSLADashboard = {
  overall_achievement_rate: 94.2,
  total_definitions: 12,
  active_definitions: 10,
  total_violations: 3,
  items: [
    { sla_id: 'sla-001', name: 'システム可用性 (基幹系)', metric_type: 'availability', target_value: 99.9, current_value: 99.95, achievement_rate: 100.0, is_met: true },
    { sla_id: 'sla-002', name: 'インシデント初動対応時間', metric_type: 'response_time', target_value: 15, current_value: 12.3, achievement_rate: 100.0, is_met: true },
    { sla_id: 'sla-003', name: 'パッチ適用率 (重要度: 緊急)', metric_type: 'patch_compliance', target_value: 100, current_value: 97.8, achievement_rate: 97.8, is_met: false },
    { sla_id: 'sla-004', name: 'バックアップ成功率', metric_type: 'backup_success', target_value: 99.0, current_value: 99.4, achievement_rate: 100.0, is_met: true },
    { sla_id: 'sla-005', name: 'セキュリティスキャン完了率', metric_type: 'scan_completion', target_value: 95.0, current_value: 93.1, achievement_rate: 98.0, is_met: false },
    { sla_id: 'sla-006', name: 'ヘルプデスク応答時間 (P1)', metric_type: 'helpdesk_response', target_value: 30, current_value: 22.5, achievement_rate: 100.0, is_met: true },
    { sla_id: 'sla-007', name: 'ネットワーク稼働率', metric_type: 'availability', target_value: 99.5, current_value: 99.8, achievement_rate: 100.0, is_met: true },
    { sla_id: 'sla-008', name: 'SAM ライセンス遵守率', metric_type: 'compliance_rate', target_value: 98.0, current_value: 96.4, achievement_rate: 98.4, is_met: null },
  ],
};

const DUMMY_DEFINITIONS: BackendSLADefinition[] = [
  { id: 'def-001', name: 'システム可用性 (基幹系)', metric_type: 'availability', target_value: 99.9, unit: '%', warning_threshold: 99.5, is_active: true },
  { id: 'def-002', name: 'インシデント初動対応時間', metric_type: 'response_time', target_value: 15, unit: '分', warning_threshold: 20, is_active: true },
  { id: 'def-003', name: 'パッチ適用率 (緊急)', metric_type: 'patch_compliance', target_value: 100, unit: '%', warning_threshold: 95, is_active: true },
  { id: 'def-004', name: 'バックアップ成功率', metric_type: 'backup_success', target_value: 99.0, unit: '%', warning_threshold: 97.0, is_active: true },
  { id: 'def-005', name: 'セキュリティスキャン完了率', metric_type: 'scan_completion', target_value: 95.0, unit: '%', warning_threshold: 90.0, is_active: true },
  { id: 'def-006', name: 'ヘルプデスク応答時間 (P1)', metric_type: 'helpdesk_response', target_value: 30, unit: '分', warning_threshold: 45, is_active: true },
  { id: 'def-007', name: 'ネットワーク稼働率', metric_type: 'availability', target_value: 99.5, unit: '%', warning_threshold: 99.0, is_active: true },
  { id: 'def-008', name: 'SAM ライセンス遵守率', metric_type: 'compliance_rate', target_value: 98.0, unit: '%', warning_threshold: 95.0, is_active: true },
  { id: 'def-009', name: 'クラウドコスト予算遵守', metric_type: 'budget_compliance', target_value: 100, unit: '%', warning_threshold: 110, is_active: true },
  { id: 'def-010', name: 'データ暗号化率', metric_type: 'encryption_rate', target_value: 100, unit: '%', warning_threshold: 98.0, is_active: true },
  { id: 'def-011', name: 'ユーザー教育完了率', metric_type: 'training_completion', target_value: 90.0, unit: '%', warning_threshold: 80.0, is_active: false },
  { id: 'def-012', name: 'レポート配信遅延率', metric_type: 'delivery_failure', target_value: 0, unit: '%', warning_threshold: 5.0, is_active: false },
];

const DUMMY_VIOLATIONS: BackendSLAViolation[] = [
  { id: 'viol-001', sla_id: 'def-003-uuid-1234', measured_value: 97.8, target_value: 100, deviation: -2.2, period_start: '2026-05-01', is_acknowledged: true },
  { id: 'viol-002', sla_id: 'def-005-uuid-5678', measured_value: 93.1, target_value: 95.0, deviation: -1.9, period_start: '2026-05-01', is_acknowledged: false },
  { id: 'viol-003', sla_id: 'def-008-uuid-9012', measured_value: 96.4, target_value: 98.0, deviation: -1.6, period_start: '2026-04-01', is_acknowledged: true },
  { id: 'viol-004', sla_id: 'def-003-uuid-1234', measured_value: 96.5, target_value: 100, deviation: -3.5, period_start: '2026-04-01', is_acknowledged: true },
  { id: 'viol-005', sla_id: 'def-005-uuid-5678', measured_value: 91.0, target_value: 95.0, deviation: -4.0, period_start: '2026-03-01', is_acknowledged: true },
];

// 6-month achievement trend
const MONTHLY_TREND = [
  { label: '12月', value: 88.4, color: 'bg-amber-500' },
  { label: '1月',  value: 90.1, color: 'bg-amber-500' },
  { label: '2月',  value: 91.5, color: 'bg-blue-500' },
  { label: '3月',  value: 92.8, color: 'bg-blue-500' },
  { label: '4月',  value: 93.3, color: 'bg-blue-500' },
  { label: '5月',  value: 94.2, color: 'bg-emerald-500' },
];

// Category breakdown
const CATEGORY_BREAKDOWN = [
  { label: '可用性',     met: 2, total: 2 },
  { label: '応答時間',   met: 2, total: 2 },
  { label: 'コンプライアンス', met: 1, total: 3 },
  { label: 'セキュリティ', met: 1, total: 2 },
  { label: 'バックアップ', met: 1, total: 1 },
];

// ---------------------------------------------------------------------------
// Gauge component
// ---------------------------------------------------------------------------
function GaugeChart({ value, label }: { value: number | null; label: string }) {
  const displayValue = value !== null ? value : 0;
  const angle = (displayValue / 100) * 180;
  const gaugeColor =
    displayValue >= 99
      ? 'text-emerald-500'
      : displayValue >= 95
        ? 'text-yellow-500'
        : 'text-red-500';

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-20 w-40 overflow-hidden">
        <svg viewBox="0 0 200 100" className="h-full w-full">
          <path d="M 10 100 A 90 90 0 0 1 190 100" fill="none" stroke="currentColor" strokeWidth="12" className="text-gray-200 dark:text-gray-700" />
          <path d="M 10 100 A 90 90 0 0 1 190 100" fill="none" stroke="currentColor" strokeWidth="12" strokeDasharray={`${(angle / 180) * 283} 283`} className={gaugeColor} />
        </svg>
        <div className="absolute inset-0 flex items-end justify-center pb-1">
          <span className={`text-2xl font-bold ${gaugeColor}`}>
            {value !== null ? `${value.toFixed(1)}%` : 'N/A'}
          </span>
        </div>
      </div>
      <p className="mt-1 text-xs font-medium text-gray-600 dark:text-gray-400">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton helpers
// ---------------------------------------------------------------------------
function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </td>
      ))}
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function SLAPage() {
  const [dashboard, setDashboard] = useState<BackendSLADashboard | null>(null);
  const [definitions, setDefinitions] = useState<BackendSLADefinition[]>([]);
  const [violations, setViolations] = useState<BackendSLAViolation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, defs, viols] = await Promise.all([
        fetchSLADashboard(),
        fetchSLADefinitions(0, 100),
        fetchSLAViolations(0, 100),
      ]);
      setDashboard(dash && dash.total_definitions > 0 ? dash : DUMMY_DASHBOARD);
      setDefinitions(defs.items.length > 0 ? defs.items : DUMMY_DEFINITIONS);
      setViolations(viols.items.length > 0 ? viols.items : DUMMY_VIOLATIONS);
    } catch {
      setDashboard(DUMMY_DASHBOARD);
      setDefinitions(DUMMY_DEFINITIONS);
      setViolations(DUMMY_VIOLATIONS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeDash = dashboard ?? DUMMY_DASHBOARD;

  function isMetBadge(isMet: boolean | null) {
    if (isMet === null) return <Badge variant="default">計測中</Badge>;
    return isMet ? <Badge variant="success">達成</Badge> : <Badge variant="danger">未達成</Badge>;
  }

  const metCount = activeDash.items.filter((i) => i.is_met === true).length;
  const donutColor = activeDash.overall_achievement_rate >= 99
    ? '#10b981' : activeDash.overall_achievement_rate >= 95
    ? '#f59e0b' : '#ef4444';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SLA 管理</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            サービスレベル合意の達成状況・違反管理 — 計測期間: 2026年5月
          </p>
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500">最終更新: {new Date().toLocaleString('ja-JP')}</div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="aegis-card flex flex-col items-center justify-center py-4">
          {loading ? (
            <div className="h-20 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          ) : (
            <GaugeChart value={activeDash.overall_achievement_rate} label="全体達成率" />
          )}
        </div>

        <div className="aegis-card text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">定義数 / アクティブ</p>
          {loading ? (
            <div className="mx-auto mt-2 h-8 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          ) : (
            <>
              <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{activeDash.active_definitions}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">全 {activeDash.total_definitions} 定義中</p>
            </>
          )}
        </div>

        <div className="aegis-card text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">達成 SLA 数</p>
          {loading ? (
            <div className="mx-auto mt-2 h-8 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          ) : (
            <>
              <p className="mt-1 text-3xl font-bold text-emerald-600 dark:text-emerald-400">{metCount}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">/ {activeDash.items.length} 項目</p>
            </>
          )}
        </div>

        <div className="aegis-card text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">違反件数</p>
          {loading ? (
            <div className="mx-auto mt-2 h-8 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          ) : (
            <>
              <p className={`mt-1 text-3xl font-bold ${activeDash.total_violations > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {activeDash.total_violations}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">今月累計</p>
            </>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Monthly trend */}
        <div className="aegis-card">
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">月次達成率トレンド</h2>
          <BarChart
            data={MONTHLY_TREND}
            maxValue={100}
            height={180}
            showValues
          />
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 text-right">目標ライン: 95%</p>
        </div>

        {/* Category breakdown */}
        <div className="aegis-card">
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">カテゴリ別達成状況</h2>
          <div className="space-y-3">
            {CATEGORY_BREAKDOWN.map((cat) => {
              const rate = Math.round((cat.met / cat.total) * 100);
              const barColor = rate === 100 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-500' : 'bg-red-500';
              return (
                <div key={cat.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{cat.label}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{cat.met}/{cat.total} 達成</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-aegis-dark">
                    <div className={`h-2 rounded-full ${barColor} transition-all`} style={{ width: `${rate}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-center">
            <DonutChart
              value={metCount}
              max={activeDash.items.length}
              size={100}
              strokeWidth={12}
              color={donutColor}
              label={`${metCount}/${activeDash.items.length}`}
            />
          </div>
        </div>
      </div>

      {/* SLA Items Table */}
      <div className="aegis-card overflow-hidden p-0">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-aegis-border flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">SLA 達成状況</h2>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />達成</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />未達成</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gray-400" />計測中</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50 dark:border-aegis-border dark:bg-aegis-dark/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">名称</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">メトリクス</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">目標値</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">現在値</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">達成率</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">状態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
              {loading ? (
                <><SkeletonRow cols={6} /><SkeletonRow cols={6} /><SkeletonRow cols={6} /></>
              ) : (
                activeDash.items.map((item) => {
                  const rate = item.achievement_rate ?? 0;
                  const barColor = rate >= 100 ? 'bg-emerald-500' : rate >= 95 ? 'bg-amber-500' : 'bg-red-500';
                  return (
                    <tr key={item.sla_id} className="transition-colors hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          {item.metric_type}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">{item.target_value}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">{item.current_value ?? '—'}</td>
                      <td className="px-6 py-4 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-aegis-dark">
                            <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${Math.min(rate, 100)}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-12 text-right">
                            {item.achievement_rate !== null ? `${item.achievement_rate.toFixed(1)}%` : '—'}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">{isMetBadge(item.is_met)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Violations + Definitions row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Violations */}
        <div className="aegis-card overflow-hidden p-0">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-aegis-border">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              SLA 違反一覧
              {violations.length > 0 && (
                <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  {violations.length}件
                </span>
              )}
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-aegis-border">
            {loading ? (
              <div className="space-y-2 p-4">
                {[...Array(3)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />)}
              </div>
            ) : violations.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-sm text-emerald-600 dark:text-emerald-400 gap-2">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                違反なし — 全 SLA 達成中
              </div>
            ) : (
              violations.map((v) => (
                <div key={v.id} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{v.sla_id.slice(0, 8)}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{v.period_start}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        計測値: <strong>{v.measured_value}</strong> / 目標: {v.target_value}
                      </span>
                      <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                        {v.deviation > 0 ? `+${v.deviation}` : v.deviation}
                      </span>
                    </div>
                  </div>
                  <Badge variant={v.is_acknowledged ? 'default' : 'warning'}>
                    {v.is_acknowledged ? '確認済' : '未確認'}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Definitions */}
        <div className="aegis-card overflow-hidden p-0">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-aegis-border">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">SLA 定義一覧</h2>
          </div>
          <div className="overflow-x-auto max-h-[340px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-50 dark:bg-aegis-dark">
                <tr className="border-b border-gray-200 dark:border-aegis-border">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">名称</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">目標</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">警告</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">状態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
                {loading ? (
                  <><SkeletonRow cols={4} /><SkeletonRow cols={4} /></>
                ) : (
                  definitions.map((def) => (
                    <tr key={def.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
                      <td className="px-4 py-2.5 text-sm text-gray-900 dark:text-white">{def.name}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right text-sm text-gray-600 dark:text-gray-400">
                        {def.target_value}{def.unit}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right text-sm text-amber-600 dark:text-amber-400">
                        {def.warning_threshold}{def.unit}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <Badge variant={def.is_active ? 'success' : 'default'}>
                          {def.is_active ? '有効' : '無効'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Unacknowledged violations alert */}
      {!loading && violations.filter((v) => !v.is_acknowledged).length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-6 py-4 dark:border-amber-800/40 dark:bg-amber-900/20">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                未確認の SLA 違反が {violations.filter((v) => !v.is_acknowledged).length} 件あります
              </p>
              <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
                担当者による確認・対処を行ってください。未対処の違反はレポートに記録されます。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
