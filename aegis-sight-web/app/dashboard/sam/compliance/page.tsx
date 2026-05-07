'use client';

import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { fetchSAMCompliance, type BackendSAMComplianceCheck } from '@/lib/api';

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
export default function CompliancePage() {
  const [data, setData] = useState<BackendSAMComplianceCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'compliant' | 'non-compliant'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchSAMCompliance();
      setData(res);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const totalChecked = data.length;
  const compliantCount = data.filter((d) => d.is_compliant).length;
  const nonCompliantCount = data.filter((d) => !d.is_compliant).length;
  const totalOverDeployed = data.reduce((sum, d) => sum + d.over_deployed, 0);

  // ── Filtered rows ─────────────────────────────────────────────────────────
  const filtered =
    filter === 'all'
      ? data
      : filter === 'compliant'
        ? data.filter((d) => d.is_compliant)
        : data.filter((d) => !d.is_compliant);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            コンプライアンスチェック
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            ライセンスコンプライアンス状況の確認
          </p>
        </div>
        <button onClick={load} className="aegis-btn-secondary">
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
            />
          </svg>
          再読み込み
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="aegis-card text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">チェック総数</p>
          {loading ? (
            <div className="mx-auto mt-2 h-8 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          ) : (
            <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{totalChecked}</p>
          )}
        </div>
        <div className="aegis-card text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">準拠</p>
          {loading ? (
            <div className="mx-auto mt-2 h-8 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          ) : (
            <p className="mt-1 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {compliantCount}
            </p>
          )}
        </div>
        <div className="aegis-card text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">違反</p>
          {loading ? (
            <div className="mx-auto mt-2 h-8 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          ) : (
            <p className="mt-1 text-3xl font-bold text-red-600 dark:text-red-400">
              {nonCompliantCount}
            </p>
          )}
        </div>
        <div className="aegis-card text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">超過デプロイ合計</p>
          {loading ? (
            <div className="mx-auto mt-2 h-8 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          ) : (
            <p className="mt-1 text-3xl font-bold text-amber-600 dark:text-amber-400">
              {totalOverDeployed}
            </p>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-3 dark:border-aegis-border">
        {[
          { key: 'all', label: 'すべて', count: totalChecked },
          { key: 'compliant', label: '準拠', count: compliantCount },
          { key: 'non-compliant', label: '違反', count: nonCompliantCount },
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
              {loading ? '…' : tab.count}
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
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">購入数</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">インストール数</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">M365 割当</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">合計使用数</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">状態</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">超過数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
              {loading ? (
                <>
                  <SkeletonRow cols={7} />
                  <SkeletonRow cols={7} />
                  <SkeletonRow cols={7} />
                </>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    データなし
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr
                    key={item.license_id}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-aegis-surface/50"
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {item.software_name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                      {item.purchased_count}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                      {item.installed_count}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                      {item.m365_assigned}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                      {item.total_used}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {item.is_compliant ? (
                        <Badge variant="success">準拠</Badge>
                      ) : (
                        <Badge variant="danger">違反</Badge>
                      )}
                    </td>
                    <td
                      className={`whitespace-nowrap px-6 py-4 text-right text-sm font-semibold ${
                        item.over_deployed > 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {item.over_deployed}
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
