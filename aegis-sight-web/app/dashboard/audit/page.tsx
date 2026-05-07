'use client';

import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { DonutChart, BarChart } from '@/components/ui/chart';
import { fetchAuditLogs } from '@/lib/api';
import type { BackendAuditLog } from '@/lib/api';

const AUDIT_ACTIONS = ['create', 'update', 'delete', 'login', 'logout', 'export', 'approve', 'reject'] as const;

const actionBadgeVariant = (action: string): 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'default' => {
  switch (action) {
    case 'login':
    case 'logout':
      return 'info';
    case 'create':
      return 'success';
    case 'update':
    case 'approve':
      return 'purple';
    case 'delete':
    case 'reject':
      return 'danger';
    case 'export':
      return 'default';
    default:
      return 'default';
  }
};

const actionLabel = (action: string): string => {
  const map: Record<string, string> = {
    login: 'ログイン',
    logout: 'ログアウト',
    create: '作成',
    update: '更新',
    delete: '削除',
    export: 'エクスポート',
    approve: '承認',
    reject: '却下',
  };
  return map[action] || action;
};

function shortId(uuid: string | null | undefined): string {
  if (!uuid) return '(システム)';
  return uuid.substring(0, 8);
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<BackendAuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const [filterAction, setFilterAction] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [selectedLog, setSelectedLog] = useState<BackendAuditLog | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAuditLogs(
        page * PAGE_SIZE,
        PAGE_SIZE,
        filterAction || undefined,
        undefined,
        filterDateFrom || undefined,
        filterDateTo || undefined,
      );
      setLogs(data.items);
      setTotal(data.total);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, filterAction, filterDateFrom, filterDateTo]);

  useEffect(() => { setPage(0); }, [filterAction, filterDateFrom, filterDateTo]);
  useEffect(() => { load(); }, [load]);

  const handleExport = (format: 'csv' | 'json') => {
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'audit_logs.json';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ['ID', 'Action', 'UserID', 'ResourceType', 'ResourceID', 'IP', 'Timestamp'];
      const rows = logs.map((l) => [
        l.id, l.action, l.user_id ?? '', l.resource_type, l.resource_id ?? '', l.ip_address ?? '', l.created_at,
      ]);
      const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'audit_logs.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const actionCounts: Record<string, number> = {};
  logs.forEach((log) => {
    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
  });
  const uniqueUserIds = new Set(logs.map((l) => l.user_id).filter(Boolean)).size;
  const topActions = Object.entries(actionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([action, count], i) => ({
      label: actionLabel(action),
      value: count,
      color: (['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-red-500', 'bg-gray-500'] as const)[i] || 'bg-gray-400',
    }));

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">監査ログ</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            システム操作の監査証跡を確認・エクスポート
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleExport('csv')} className="aegis-btn-secondary text-sm">
            <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            CSV
          </button>
          <button onClick={() => handleExport('json')} className="aegis-btn-secondary text-sm">
            <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            JSON
          </button>
        </div>
      </div>

      {/* 監査ログ概要チャート */}
      <div className="aegis-card">
        <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">監査ログ概要</h2>
        {loading && logs.length === 0 ? (
          <div className="h-40 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">操作ユーザー数（現在ページ）</p>
              <DonutChart
                value={uniqueUserIds}
                max={Math.max(uniqueUserIds, 1)}
                size={140}
                strokeWidth={14}
                color="#3b82f6"
                label={`${uniqueUserIds}人`}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {uniqueUserIds} ユーザーの操作を記録中（全 {total.toLocaleString()} 件）
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">アクション種別別件数</p>
              {topActions.length > 0 ? (
                <BarChart
                  data={topActions}
                  maxValue={Math.max(...topActions.map((a) => a.value), 1)}
                  height={160}
                  showValues
                />
              ) : (
                <div className="flex h-40 items-center justify-center text-sm text-gray-400">データなし</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="aegis-card">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              アクション種別
            </label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-aegis-border dark:bg-aegis-surface dark:text-white"
            >
              <option value="">すべて</option>
              {AUDIT_ACTIONS.map((a) => (
                <option key={a} value={a}>{actionLabel(a)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              開始日
            </label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-aegis-border dark:bg-aegis-surface dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              終了日
            </label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-aegis-border dark:bg-aegis-surface dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Log Table */}
      <div className="aegis-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-aegis-surface">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">アクション</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">ユーザーID</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">リソース</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">IP</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">タイムスタンプ</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">詳細</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-4">
                      <div className="h-4 rounded bg-gray-200 dark:bg-gray-700" />
                    </td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    該当するログがありません
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
                    <td className="px-6 py-3">
                      <Badge variant={actionBadgeVariant(log.action)}>
                        {actionLabel(log.action)}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                      {shortId(log.user_id)}
                    </td>
                    <td className="px-6 py-3 text-gray-700 dark:text-gray-300">
                      {log.resource_type}
                      {log.resource_id && (
                        <span className="ml-1 text-xs text-gray-400">({shortId(log.resource_id)})</span>
                      )}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                      {log.ip_address ?? '—'}
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {new Date(log.created_at).toLocaleString('ja-JP')}
                    </td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        表示
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3 dark:border-aegis-border">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            全 <span className="font-medium">{total.toLocaleString()}</span> 件中{' '}
            <span className="font-medium">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)}</span> 件を表示
          </p>
          <div className="flex gap-2">
            <button
              className="aegis-btn-secondary"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              前へ
            </button>
            <button
              className="aegis-btn-secondary"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              次へ
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-aegis-darker"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">ログ詳細</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">ID:</span>
                  <span className="ml-2 font-mono text-xs text-gray-900 dark:text-white">{selectedLog.id}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">アクション:</span>
                  <span className="ml-2">
                    <Badge variant={actionBadgeVariant(selectedLog.action)}>{actionLabel(selectedLog.action)}</Badge>
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">ユーザーID:</span>
                  <span className="ml-2 font-mono text-xs text-gray-900 dark:text-white">
                    {selectedLog.user_id ?? '(システム)'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">リソース:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{selectedLog.resource_type}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">リソースID:</span>
                  <span className="ml-2 font-mono text-xs text-gray-900 dark:text-white">
                    {selectedLog.resource_id ?? '—'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">IP:</span>
                  <span className="ml-2 font-mono text-gray-900 dark:text-white">{selectedLog.ip_address ?? '—'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500 dark:text-gray-400">日時:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">
                    {new Date(selectedLog.created_at).toLocaleString('ja-JP')}
                  </span>
                </div>
              </div>
              {selectedLog.user_agent && (
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">User Agent:</span>
                  <p className="mt-1 break-all font-mono text-xs text-gray-700 dark:text-gray-300">{selectedLog.user_agent}</p>
                </div>
              )}
              {selectedLog.detail && (
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">詳細 (JSONB):</span>
                  <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-gray-100 p-3 font-mono text-xs text-gray-800 dark:bg-aegis-surface dark:text-gray-200">
                    {JSON.stringify(selectedLog.detail, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
