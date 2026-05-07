'use client';

import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  fetchSLADashboard,
  fetchSLADefinitions,
  fetchSLAViolations,
  type BackendSLADashboard,
  type BackendSLADefinition,
  type BackendSLAViolation,
} from '@/lib/api';

// ---------------------------------------------------------------------------
// Gauge component (preserved from original)
// ---------------------------------------------------------------------------
function GaugeChart({ value, label }: { value: number | null; label: string }) {
  const displayValue = value !== null ? value : 0;
  const angle = (displayValue / 100) * 180;
  const gaugeColor =
    displayValue >= 99
      ? 'text-green-500'
      : displayValue >= 95
        ? 'text-yellow-500'
        : 'text-red-500';

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
      setDashboard(dash);
      setDefinitions(defs.items);
      setViolations(viols.items);
    } catch {
      setDashboard(null);
      setDefinitions([]);
      setViolations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── is_met badge ─────────────────────────────────────────────────────────
  function isMetBadge(isMet: boolean | null) {
    if (isMet === null) return <Badge variant="default">計測中</Badge>;
    return isMet ? (
      <Badge variant="success">達成</Badge>
    ) : (
      <Badge variant="danger">未達成</Badge>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SLA 管理</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          サービスレベル合意の達成状況・違反管理
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Gauge card for achievement rate */}
        <div className="aegis-card flex flex-col items-center justify-center py-4">
          {loading ? (
            <div className="h-20 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          ) : (
            <GaugeChart value={dashboard?.overall_achievement_rate ?? null} label="全体達成率" />
          )}
        </div>

        {/* Total definitions */}
        <div className="aegis-card text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">定義数</p>
          {loading ? (
            <div className="mx-auto mt-2 h-8 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          ) : (
            <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
              {dashboard?.total_definitions ?? '—'}
            </p>
          )}
        </div>

        {/* Active definitions */}
        <div className="aegis-card text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">アクティブ定義</p>
          {loading ? (
            <div className="mx-auto mt-2 h-8 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          ) : (
            <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
              {dashboard?.active_definitions ?? '—'}
            </p>
          )}
        </div>

        {/* Total violations */}
        <div className="aegis-card text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">違反件数</p>
          {loading ? (
            <div className="mx-auto mt-2 h-8 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          ) : (
            <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
              {dashboard?.total_violations ?? '—'}
            </p>
          )}
        </div>
      </div>

      {/* SLA Items Table (from dashboard) */}
      <div className="aegis-card overflow-hidden p-0">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-3 dark:border-aegis-border dark:bg-aegis-dark/50">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">SLA 達成状況</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50 dark:border-aegis-border dark:bg-aegis-dark/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">名称</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">メトリクス</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">目標値</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">現在値</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">達成率</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">状態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
              {loading ? (
                <>
                  <SkeletonRow cols={6} />
                  <SkeletonRow cols={6} />
                  <SkeletonRow cols={6} />
                </>
              ) : !dashboard?.items.length ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    データなし
                  </td>
                </tr>
              ) : (
                dashboard.items.map((item) => (
                  <tr key={item.sla_id} className="transition-colors hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {item.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {item.metric_type}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                      {item.target_value}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                      {item.current_value ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                      {item.achievement_rate !== null ? `${item.achievement_rate.toFixed(1)}%` : '—'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {isMetBadge(item.is_met)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Definitions Table */}
      <div className="aegis-card overflow-hidden p-0">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-3 dark:border-aegis-border dark:bg-aegis-dark/50">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">SLA 定義一覧</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50 dark:border-aegis-border dark:bg-aegis-dark/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">名称</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">メトリクス</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">目標値</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">警告閾値</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">状態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
              {loading ? (
                <>
                  <SkeletonRow cols={5} />
                  <SkeletonRow cols={5} />
                  <SkeletonRow cols={5} />
                </>
              ) : definitions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    データなし
                  </td>
                </tr>
              ) : (
                definitions.map((def) => (
                  <tr key={def.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {def.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {def.metric_type}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                      {def.target_value} {def.unit}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                      {def.warning_threshold} {def.unit}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {def.is_active ? (
                        <Badge variant="success">有効</Badge>
                      ) : (
                        <Badge variant="default">無効</Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Violations Table */}
      <div className="aegis-card overflow-hidden p-0">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-3 dark:border-aegis-border dark:bg-aegis-dark/50">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">SLA 違反一覧</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50 dark:border-aegis-border dark:bg-aegis-dark/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">SLA ID</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">計測値</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">目標値</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">偏差</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">期間開始</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">確認済</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
              {loading ? (
                <>
                  <SkeletonRow cols={6} />
                  <SkeletonRow cols={6} />
                  <SkeletonRow cols={6} />
                </>
              ) : violations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    データなし
                  </td>
                </tr>
              ) : (
                violations.map((v) => (
                  <tr key={v.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
                    <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-gray-900 dark:text-white">
                      {v.sla_id.slice(0, 8)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                      {v.measured_value}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                      {v.target_value}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-red-600 dark:text-red-400">
                      {v.deviation > 0 ? `+${v.deviation}` : v.deviation}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {v.period_start}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {v.is_acknowledged ? (
                        <Badge variant="success">確認済</Badge>
                      ) : (
                        <Badge variant="warning">未確認</Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
