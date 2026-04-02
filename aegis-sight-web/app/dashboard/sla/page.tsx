'use client';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { DonutChart, BarChart } from '@/components/ui/chart';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type MetricType = 'availability' | 'response_time' | 'resolution_time' | 'patch_compliance';
type MeasurementPeriod = 'daily' | 'weekly' | 'monthly';
type ViolationSeverity = 'warning' | 'breach';

interface SLADashboardItem {
  sla_id: string;
  name: string;
  metric_type: MetricType;
  target_value: number;
  current_value: number | null;
  achievement_rate: number | null;
  is_met: boolean | null;
  measurement_period: MeasurementPeriod;
  total_measurements: number;
  met_count: number;
  violation_count: number;
}

interface SLADashboard {
  overall_achievement_rate: number | null;
  total_definitions: number;
  active_definitions: number;
  total_violations: number;
  items: SLADashboardItem[];
}

interface SLADefinition {
  id: string;
  name: string;
  description: string | null;
  metric_type: MetricType;
  target_value: number;
  unit: string;
  measurement_period: MeasurementPeriod;
  warning_threshold: number;
  is_active: boolean;
  created_at: string;
}

interface SLAMeasurement {
  id: string;
  sla_id: string;
  measured_value: number;
  target_value: number;
  is_met: boolean;
  period_start: string;
  period_end: string;
  detail: Record<string, unknown> | null;
  measured_at: string;
}

interface SLAViolation {
  id: string;
  sla_id: string;
  measurement_id: string;
  violation_detail: string;
  severity: ViolationSeverity;
  notified: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Label maps
// ---------------------------------------------------------------------------
const metricTypeLabel: Record<MetricType, string> = {
  availability: '可用性',
  response_time: '応答時間',
  resolution_time: '解決時間',
  patch_compliance: 'パッチ適用率',
};

const periodLabel: Record<MeasurementPeriod, string> = {
  daily: '日次',
  weekly: '週次',
  monthly: '月次',
};

const severityVariant: Record<ViolationSeverity, 'warning' | 'danger'> = {
  warning: 'warning',
  breach: 'danger',
};

const severityLabel: Record<ViolationSeverity, string> = {
  warning: '警告',
  breach: '違反',
};

// ---------------------------------------------------------------------------
// API helper
// ---------------------------------------------------------------------------
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function apiFetch<T>(path: string, token?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Gauge component
// ---------------------------------------------------------------------------
function GaugeChart({ value, label, color }: { value: number | null; label: string; color: string }) {
  const displayValue = value !== null ? value : 0;
  const angle = (displayValue / 100) * 180;
  const gaugeColor =
    displayValue >= 99 ? 'text-green-500' :
    displayValue >= 95 ? 'text-yellow-500' :
    'text-red-500';

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-20 w-40 overflow-hidden">
        <svg viewBox="0 0 200 100" className="h-full w-full">
          {/* Background arc */}
          <path
            d="M 10 100 A 90 90 0 0 1 190 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Value arc */}
          <path
            d="M 10 100 A 90 90 0 0 1 190 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            strokeDasharray={`${(angle / 180) * 283} 283`}
            className={gaugeColor}
          />
        </svg>
        <div className="absolute inset-0 flex items-end justify-center pb-1">
          <span className={`text-2xl font-bold ${gaugeColor}`}>
            {value !== null ? `${value}%` : 'N/A'}
          </span>
        </div>
      </div>
      <p className="mt-1 text-xs font-medium text-gray-600 dark:text-gray-400">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trend bar (simple bar chart for monthly trend)
// ---------------------------------------------------------------------------
function TrendBar({ measurements }: { measurements: SLAMeasurement[] }) {
  if (measurements.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">計測データなし</p>;
  }

  // Group by month and calculate average met rate
  const monthlyData: Record<string, { met: number; total: number }> = {};
  measurements.forEach((m) => {
    const month = m.period_start.substring(0, 7); // YYYY-MM
    if (!monthlyData[month]) monthlyData[month] = { met: 0, total: 0 };
    monthlyData[month].total += 1;
    if (m.is_met) monthlyData[month].met += 1;
  });

  const sorted = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6);

  return (
    <div className="flex items-end gap-2 h-32">
      {sorted.map(([month, data]) => {
        const rate = Math.round((data.met / data.total) * 100);
        const height = Math.max(rate, 5);
        const barColor =
          rate >= 99 ? 'bg-green-500' :
          rate >= 95 ? 'bg-yellow-500' :
          'bg-red-500';

        return (
          <div key={month} className="flex flex-col items-center flex-1">
            <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1">
              {rate}%
            </span>
            <div
              className={`w-full rounded-t ${barColor}`}
              style={{ height: `${height}%` }}
            />
            <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
              {month.substring(5)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function SLAPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'definitions' | 'measurements' | 'violations'>('dashboard');
  const [dashboard, setDashboard] = useState<SLADashboard | null>(null);
  const [definitions, setDefinitions] = useState<SLADefinition[]>([]);
  const [measurements, setMeasurements] = useState<SLAMeasurement[]>([]);
  const [violations, setViolations] = useState<SLAViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, defRes, measRes, violRes] = await Promise.all([
        apiFetch<SLADashboard>('/api/v1/sla/dashboard', token || undefined),
        apiFetch<{ items: SLADefinition[]; total: number }>('/api/v1/sla/definitions?limit=200', token || undefined),
        apiFetch<{ items: SLAMeasurement[]; total: number }>('/api/v1/sla/measurements?limit=200', token || undefined),
        apiFetch<{ items: SLAViolation[]; total: number }>('/api/v1/sla/violations?limit=200', token || undefined),
      ]);
      setDashboard(dashRes);
      setDefinitions(defRes.items);
      setMeasurements(measRes.items);
      setViolations(violRes.items);
    } catch {
      // API unavailable — use demo data
      setDashboard({
        overall_achievement_rate: 87,
        total_definitions: 4,
        active_definitions: 4,
        total_violations: 3,
        items: [
          { sla_id: '1', name: '可用性 99.9%', metric_type: 'availability', target_value: 99.9, current_value: 99.95, achievement_rate: 100, is_met: true, measurement_period: 'monthly', total_measurements: 30, met_count: 29, violation_count: 1 },
          { sla_id: '2', name: '応答時間 200ms以下', metric_type: 'response_time', target_value: 200, current_value: 185, achievement_rate: 92, is_met: true, measurement_period: 'daily', total_measurements: 90, met_count: 83, violation_count: 7 },
          { sla_id: '3', name: '解決時間 4h以内', metric_type: 'resolution_time', target_value: 240, current_value: 210, achievement_rate: 88, is_met: true, measurement_period: 'weekly', total_measurements: 12, met_count: 10, violation_count: 2 },
          { sla_id: '4', name: 'パッチ適用率 95%', metric_type: 'patch_compliance', target_value: 95, current_value: 86, achievement_rate: 68, is_met: false, measurement_period: 'monthly', total_measurements: 6, met_count: 4, violation_count: 2 },
        ],
      });
      setDefinitions([]);
      setMeasurements([]);
      setViolations([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const tabs = [
    { key: 'dashboard' as const, label: 'SLAダッシュボード' },
    { key: 'definitions' as const, label: 'SLA定義' },
    { key: 'measurements' as const, label: '計測履歴' },
    { key: 'violations' as const, label: '違反一覧' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SLA管理</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            サービスレベル目標の監視と管理
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-aegis-border">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Dashboard Tab */}
      {!loading && !error && activeTab === 'dashboard' && dashboard && (
        <div className="space-y-6">
          {/* SLA 概要チャート */}
          {(() => {
            const rate = dashboard.overall_achievement_rate ?? 0;
            const rateColor = rate >= 90 ? '#10b981' : rate >= 70 ? '#f59e0b' : '#ef4444';
            const metricBarData = (['availability', 'response_time', 'resolution_time', 'patch_compliance'] as MetricType[]).map(type => {
              const typeItems = dashboard.items.filter(i => i.metric_type === type);
              const avg = typeItems.length > 0
                ? Math.round(typeItems.reduce((s, i) => s + (i.achievement_rate ?? 0), 0) / typeItems.length)
                : 0;
              return {
                label: metricTypeLabel[type],
                value: avg,
                color: avg >= 90 ? 'bg-emerald-500' : avg >= 70 ? 'bg-amber-500' : 'bg-red-500',
              };
            });
            return (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-aegis-border dark:bg-aegis-surface">
                <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">SLA 概要</h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">全体達成率</p>
                    <DonutChart value={rate} max={100} size={140} strokeWidth={14} color={rateColor} label={`${rate}%`} />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      定義 {dashboard.total_definitions} 件（有効: {dashboard.active_definitions}）
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">メトリクス種別別達成率</p>
                    <BarChart data={metricBarData} maxValue={100} height={160} showValues />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-aegis-border dark:bg-aegis-surface">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">全体達成率</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {dashboard.overall_achievement_rate !== null
                  ? `${dashboard.overall_achievement_rate}%`
                  : 'N/A'}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-aegis-border dark:bg-aegis-surface">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">SLA定義数</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {dashboard.total_definitions}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                有効: {dashboard.active_definitions}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-aegis-border dark:bg-aegis-surface">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">計測回数</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {measurements.length}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-aegis-border dark:bg-aegis-surface">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">違反件数</p>
              <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">
                {dashboard.total_violations}
              </p>
            </div>
          </div>

          {/* Gauges by category */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-aegis-border dark:bg-aegis-surface">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              カテゴリ別達成率
            </h2>
            <div className="flex flex-wrap items-center justify-around gap-6">
              {(['availability', 'response_time', 'resolution_time', 'patch_compliance'] as MetricType[]).map(
                (type) => {
                  const typeItems = dashboard.items.filter((i) => i.metric_type === type);
                  const total = typeItems.reduce((s, i) => s + i.total_measurements, 0);
                  const met = typeItems.reduce((s, i) => s + i.met_count, 0);
                  const rate = total > 0 ? Math.round((met / total) * 10000) / 100 : null;
                  return (
                    <GaugeChart key={type} value={rate} label={metricTypeLabel[type]} color="" />
                  );
                }
              )}
            </div>
          </div>

          {/* Per-SLA cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {dashboard.items.map((item) => (
              <div
                key={item.sla_id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-aegis-border dark:bg-aegis-surface"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{item.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {metricTypeLabel[item.metric_type]} / {periodLabel[item.measurement_period]}
                    </p>
                  </div>
                  {item.is_met !== null && (
                    <Badge variant={item.is_met ? 'success' : 'danger'}>
                      {item.is_met ? '達成' : '未達'}
                    </Badge>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">目標値</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{item.target_value}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">実測値</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {item.current_value ?? 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">達成率</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {item.achievement_rate !== null ? `${item.achievement_rate}%` : 'N/A'}
                    </p>
                  </div>
                </div>
                {item.violation_count > 0 && (
                  <p className="mt-2 text-xs text-red-500">
                    違反: {item.violation_count}件
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Monthly trend */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-aegis-border dark:bg-aegis-surface">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              月次トレンド
            </h2>
            <TrendBar measurements={measurements} />
          </div>
        </div>
      )}

      {/* Definitions Tab */}
      {!loading && !error && activeTab === 'definitions' && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-aegis-border dark:bg-aegis-surface">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-aegis-border">
            <thead className="bg-gray-50 dark:bg-aegis-darker">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">名前</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">メトリクス</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">目標値</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">単位</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">期間</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">警告閾値</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">状態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-aegis-border">
              {definitions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    SLA定義がありません
                  </td>
                </tr>
              ) : (
                definitions.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-aegis-darker/50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{d.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {metricTypeLabel[d.metric_type]}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{d.target_value}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{d.unit}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {periodLabel[d.measurement_period]}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{d.warning_threshold}</td>
                    <td className="px-4 py-3">
                      <Badge variant={d.is_active ? 'success' : 'default'}>
                        {d.is_active ? '有効' : '無効'}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Measurements Tab */}
      {!loading && !error && activeTab === 'measurements' && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-aegis-border dark:bg-aegis-surface">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-aegis-border">
            <thead className="bg-gray-50 dark:bg-aegis-darker">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">SLA</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">実測値</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">目標値</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">判定</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">期間</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">計測日時</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-aegis-border">
              {measurements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    計測データがありません
                  </td>
                </tr>
              ) : (
                measurements.map((m) => {
                  const defn = definitions.find((d) => d.id === m.sla_id);
                  return (
                    <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-aegis-darker/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {defn?.name ?? m.sla_id.substring(0, 8)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{m.measured_value}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{m.target_value}</td>
                      <td className="px-4 py-3">
                        <Badge variant={m.is_met ? 'success' : 'danger'}>
                          {m.is_met ? '達成' : '未達'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {m.period_start} ~ {m.period_end}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {new Date(m.measured_at).toLocaleString('ja-JP')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Violations Tab */}
      {!loading && !error && activeTab === 'violations' && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-aegis-border dark:bg-aegis-surface">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-aegis-border">
            <thead className="bg-gray-50 dark:bg-aegis-darker">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">SLA</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">詳細</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">重大度</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">通知済み</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">発生日時</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-aegis-border">
              {violations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    違反はありません
                  </td>
                </tr>
              ) : (
                violations.map((v) => {
                  const defn = definitions.find((d) => d.id === v.sla_id);
                  return (
                    <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-aegis-darker/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {defn?.name ?? v.sla_id.substring(0, 8)}
                      </td>
                      <td className="max-w-md truncate px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {v.violation_detail}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={severityVariant[v.severity]}>
                          {severityLabel[v.severity]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={v.notified ? 'success' : 'default'}>
                          {v.notified ? '通知済み' : '未通知'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {new Date(v.created_at).toLocaleString('ja-JP')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
