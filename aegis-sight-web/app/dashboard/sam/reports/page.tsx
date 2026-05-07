'use client';

import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { fetchExpiringLicenses, type BackendExpiringLicense } from '@/lib/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function urgencyClass(days: number): string {
  if (days <= 30) return 'text-red-600 dark:text-red-400 font-semibold';
  if (days <= 60) return 'text-amber-600 dark:text-amber-400 font-semibold';
  return 'text-gray-600 dark:text-gray-400';
}

function costSummary(license: BackendExpiringLicense): string {
  if (license.cost_per_unit === null) return '—';
  const total = license.cost_per_unit * license.purchased_count;
  return `${total.toLocaleString()} ${license.currency}`;
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
export default function SAMReportsPage() {
  const [data, setData] = useState<BackendExpiringLicense[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchExpiringLicenses(90);
      // Sort ascending by days_until_expiry (most urgent first)
      const sorted = [...res].sort((a, b) => a.days_until_expiry - b.days_until_expiry);
      setData(sorted);
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
  const totalExpiring = data.length;
  const expiring30 = data.filter((d) => d.days_until_expiry <= 30).length;
  const expiring60 = data.filter((d) => d.days_until_expiry <= 60).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          期限切れ予定ライセンス
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          今後 90 日以内に期限切れとなるライセンス一覧
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="aegis-card text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">期限切れ予定（90日）</p>
          {loading ? (
            <div className="mx-auto mt-2 h-8 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          ) : (
            <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{totalExpiring}</p>
          )}
        </div>
        <div className="aegis-card text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">30 日以内</p>
          {loading ? (
            <div className="mx-auto mt-2 h-8 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          ) : (
            <p className="mt-1 text-3xl font-bold text-red-600 dark:text-red-400">{expiring30}</p>
          )}
        </div>
        <div className="aegis-card text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">60 日以内</p>
          {loading ? (
            <div className="mx-auto mt-2 h-8 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          ) : (
            <p className="mt-1 text-3xl font-bold text-amber-600 dark:text-amber-400">{expiring60}</p>
          )}
        </div>
      </div>

      {/* Expiring Licenses Table */}
      <div className="aegis-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50 dark:border-aegis-border dark:bg-aegis-dark/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">ソフトウェア</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">ベンダー</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">種別</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">期限日</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">残日数</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">購入数</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">コスト合計</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
              {loading ? (
                <>
                  <SkeletonRow cols={7} />
                  <SkeletonRow cols={7} />
                  <SkeletonRow cols={7} />
                </>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    データなし
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr
                    key={item.id}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-aegis-surface/50"
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {item.software_name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {item.vendor}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <Badge variant="info">{item.license_type}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {item.expiry_date}
                    </td>
                    <td className={`whitespace-nowrap px-6 py-4 text-right text-sm ${urgencyClass(item.days_until_expiry)}`}>
                      {item.days_until_expiry} 日
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                      {item.purchased_count}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                      {costSummary(item)}
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
