'use client';

import { Badge } from '@/components/ui/badge';
import { useCallback, useEffect, useState } from 'react';
import {
  BackendDisposalRequest,
  BackendLifecycleSummary,
  fetchDisposalRequests,
  fetchLifecycleSummary,
} from '@/lib/api';

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

  useEffect(() => {
    load();
  }, [load]);

  const formatDate = (s: string | null) =>
    s ? new Date(s).toLocaleDateString('ja-JP') : '—';

  const shortId = (id: string) => id.slice(0, 8).toUpperCase();

  const statusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: '保留中', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
      case 'approved':
        return { label: '承認済み', className: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'completed':
        return { label: '完了', className: 'bg-green-100 text-green-700 border-green-200' };
      case 'rejected':
        return { label: '却下', className: 'bg-red-100 text-red-700 border-red-200' };
      default:
        return { label: status, className: 'bg-gray-100 text-gray-700 border-gray-200' };
    }
  };

  const summaryCards = summary
    ? [
        { label: '調達済み', value: summary.procured, color: 'text-blue-600' },
        { label: 'デプロイ済み', value: summary.deployed, color: 'text-green-600' },
        { label: 'メンテナンス中', value: summary.maintenance, color: 'text-yellow-600' },
        { label: '廃棄済み', value: summary.disposed, color: 'text-gray-600' },
        { label: '廃棄申請中', value: summary.disposal_pending, color: 'text-orange-600' },
        { label: '廃棄承認済み', value: summary.disposal_approved, color: 'text-red-600' },
      ]
    : [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">資産ライフサイクル管理</h1>
        <p className="text-sm text-gray-500 mt-1">デバイスの調達から廃棄までの管理</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {loading ? (
          <>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white rounded-xl border border-gray-200 p-5">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-8 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </>
        ) : !summary ? (
          <div className="col-span-6 flex items-center justify-center h-32 text-gray-400">
            データなし
          </div>
        ) : (
          summaryCards.map((card) => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className={`text-3xl font-bold mt-1 ${card.color}`}>{card.value}</p>
            </div>
          ))
        )}
      </div>

      {/* Disposal requests table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">廃棄申請一覧</h2>
        </div>
        {loading ? (
          <div className="animate-pulse space-y-2 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded" />
            ))}
          </div>
        ) : disposals.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-400">データなし</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">デバイスID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">廃棄理由</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">廃棄方法</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">申請者</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">廃棄予定日</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">申請日</th>
                </tr>
              </thead>
              <tbody>
                {disposals.map((d) => {
                  const sc = statusConfig(d.status);
                  return (
                    <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono">{shortId(d.device_id)}</td>
                      <td className="px-4 py-3 text-sm">{d.reason}</td>
                      <td className="px-4 py-3 text-sm">{d.method}</td>
                      <td className="px-4 py-3">
                        <Badge className={sc.className}>{sc.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">{d.requested_by ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(d.disposal_date)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(d.created_at)}</td>
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
