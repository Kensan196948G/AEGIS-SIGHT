'use client';

import { Badge } from '@/components/ui/badge';
import { useCallback, useEffect, useState } from 'react';
import {
  BackendDisposalRequest,
  BackendLifecycleSummary,
  fetchDisposalRequests,
  fetchLifecycleSummary,
} from '@/lib/api';

type DisposalStatus = 'pending' | 'approved' | 'completed' | 'rejected';

const disposalStatusConfig: Record<DisposalStatus, { label: string; variant: 'warning' | 'info' | 'success' | 'danger' }> = {
  pending:   { label: '保留中',   variant: 'warning' },
  approved:  { label: '承認済み', variant: 'info'    },
  completed: { label: '完了',     variant: 'success' },
  rejected:  { label: '却下',     variant: 'danger'  },
};

export default function LifecyclePage() {
  const [summary, setSummary] = useState<BackendLifecycleSummary | null>(null);
  const [disposals, setDisposals] = useState<BackendDisposalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, disposalsRes] = await Promise.all([
        fetchLifecycleSummary(),
        fetchDisposalRequests(0, 100),
      ]);
      setSummary(summaryRes);
      setDisposals(disposalsRes.items);
    } catch {
      setSummary(null);
      setDisposals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const formatDate = (s: string | null) =>
    s ? new Date(s).toLocaleDateString('ja-JP') : '—';

  const shortId = (id: string) => id.slice(0, 8).toUpperCase();

  const summaryCards = summary
    ? [
        { label: '調達済み',     value: summary.procured,          color: 'text-blue-600 dark:text-blue-400'   },
        { label: 'デプロイ済み', value: summary.deployed,          color: 'text-green-600 dark:text-green-400' },
        { label: 'メンテナンス', value: summary.maintenance,       color: 'text-amber-600 dark:text-amber-400' },
        { label: '廃棄済み',     value: summary.disposed,          color: 'text-gray-600 dark:text-gray-400'   },
        { label: '廃棄申請中',   value: summary.disposal_pending,  color: 'text-orange-600 dark:text-orange-400' },
        { label: '廃棄承認済み', value: summary.disposal_approved, color: 'text-red-600 dark:text-red-400'     },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">資産ライフサイクル管理</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">デバイスの調達から廃棄までの管理</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse aegis-card">
              <div className="h-3 rounded bg-gray-200 dark:bg-gray-700 w-3/4 mb-3" />
              <div className="h-8 rounded bg-gray-200 dark:bg-gray-700 w-1/2" />
            </div>
          ))
        ) : !summary ? (
          <div className="col-span-6 flex items-center justify-center h-32 text-gray-400 dark:text-gray-600">
            データなし
          </div>
        ) : (
          summaryCards.map((card) => (
            <div key={card.label} className="aegis-card text-center">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
              <p className={`mt-1 text-3xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          ))
        )}
      </div>

      {/* Lifecycle flow diagram */}
      <div className="aegis-card">
        <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">ライフサイクルフロー</h2>
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
          {[
            { label: '調達',       value: summary?.procured ?? '—',          color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'   },
            { label: 'デプロイ',   value: summary?.deployed ?? '—',          color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
            { label: 'メンテ',     value: summary?.maintenance ?? '—',       color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
            { label: '廃棄申請',   value: summary?.disposal_pending ?? '—',  color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
            { label: '廃棄承認',   value: summary?.disposal_approved ?? '—', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'       },
            { label: '廃棄完了',   value: summary?.disposed ?? '—',          color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'       },
          ].map((step, i, arr) => (
            <div key={step.label} className="flex items-center gap-2 shrink-0">
              <div className={`rounded-lg px-4 py-3 text-center min-w-[80px] ${step.color}`}>
                <p className="text-lg font-bold">{step.value}</p>
                <p className="text-xs mt-0.5">{step.label}</p>
              </div>
              {i < arr.length - 1 && (
                <svg className="h-4 w-4 text-gray-400 dark:text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Disposal requests table */}
      <div className="aegis-card overflow-hidden p-0">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-aegis-border">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">廃棄申請一覧</h2>
        </div>
        {loading ? (
          <div className="animate-pulse space-y-2 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 rounded bg-gray-200 dark:bg-gray-700" />
            ))}
          </div>
        ) : disposals.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-400 dark:text-gray-600">
            廃棄申請データなし
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50 dark:border-aegis-border dark:bg-aegis-dark/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">デバイスID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">廃棄理由</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">廃棄方法</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">ステータス</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">申請者</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">廃棄予定日</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">申請日</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
                {disposals.map((d) => {
                  const sc = disposalStatusConfig[d.status as DisposalStatus] ?? { label: d.status, variant: 'info' as const };
                  return (
                    <tr key={d.id} className="transition-colors hover:bg-gray-50/70 dark:hover:bg-aegis-dark/40">
                      <td className="px-4 py-3 font-mono text-sm text-gray-700 dark:text-gray-300">{shortId(d.device_id)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{d.reason}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{d.method}</td>
                      <td className="px-4 py-3">
                        <Badge variant={sc.variant}>{sc.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{d.requested_by ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatDate(d.disposal_date)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatDate(d.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
