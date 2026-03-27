'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

interface AuditLogEntry {
  id: string;
  action: string;
  user: string;
  resource: string;
  resourceId: string;
  ipAddress: string;
  userAgent: string;
  detail: Record<string, unknown>;
  createdAt: string;
}

const actionTypes = [
  'login', 'logout', 'create', 'update', 'delete', 'export', 'import',
  'approve', 'reject', 'password_change', 'role_change',
];

const mockLogs: AuditLogEntry[] = [
  { id: 'a1b2c3d4', action: 'login', user: 'admin@aegis-sight.local', resource: 'session', resourceId: 'sess-001', ipAddress: '192.168.1.10', userAgent: 'Mozilla/5.0 Chrome/122', detail: { method: 'password', mfa: true }, createdAt: '2026-03-27T10:30:00Z' },
  { id: 'e5f6g7h8', action: 'create', user: 'operator@aegis-sight.local', resource: 'device', resourceId: 'dev-042', ipAddress: '192.168.1.25', userAgent: 'Mozilla/5.0 Chrome/122', detail: { hostname: 'PC-SALES-042', os: 'Windows 11' }, createdAt: '2026-03-27T09:45:00Z' },
  { id: 'i9j0k1l2', action: 'update', user: 'admin@aegis-sight.local', resource: 'license', resourceId: 'lic-015', ipAddress: '192.168.1.10', userAgent: 'Mozilla/5.0 Chrome/122', detail: { field: 'purchased_count', old: 50, new: 75 }, createdAt: '2026-03-27T09:15:00Z' },
  { id: 'm3n4o5p6', action: 'export', user: 'auditor@aegis-sight.local', resource: 'audit_log', resourceId: '', ipAddress: '10.0.0.5', userAgent: 'Mozilla/5.0 Firefox/123', detail: { format: 'csv', records: 1250 }, createdAt: '2026-03-26T17:30:00Z' },
  { id: 'q7r8s9t0', action: 'delete', user: 'admin@aegis-sight.local', resource: 'alert', resourceId: 'alert-088', ipAddress: '192.168.1.10', userAgent: 'Mozilla/5.0 Chrome/122', detail: { reason: 'resolved' }, createdAt: '2026-03-26T16:00:00Z' },
  { id: 'u1v2w3x4', action: 'role_change', user: 'admin@aegis-sight.local', resource: 'user', resourceId: 'usr-007', ipAddress: '192.168.1.10', userAgent: 'Mozilla/5.0 Chrome/122', detail: { old_role: 'readonly', new_role: 'operator' }, createdAt: '2026-03-26T14:20:00Z' },
  { id: 'y5z6a7b8', action: 'approve', user: 'manager@aegis-sight.local', resource: 'procurement', resourceId: 'proc-023', ipAddress: '192.168.1.50', userAgent: 'Mozilla/5.0 Safari/17', detail: { amount: 150000, vendor: 'Dell' }, createdAt: '2026-03-26T11:00:00Z' },
  { id: 'c9d0e1f2', action: 'password_change', user: 'user05@aegis-sight.local', resource: 'user', resourceId: 'usr-005', ipAddress: '192.168.1.102', userAgent: 'Mozilla/5.0 Chrome/122', detail: { forced: false }, createdAt: '2026-03-26T10:30:00Z' },
  { id: 'g3h4i5j6', action: 'import', user: 'operator@aegis-sight.local', resource: 'device', resourceId: '', ipAddress: '192.168.1.25', userAgent: 'Mozilla/5.0 Chrome/122', detail: { file: 'devices_batch.csv', records: 45 }, createdAt: '2026-03-25T16:45:00Z' },
  { id: 'k7l8m9n0', action: 'login', user: 'auditor@aegis-sight.local', resource: 'session', resourceId: 'sess-002', ipAddress: '10.0.0.5', userAgent: 'Mozilla/5.0 Firefox/123', detail: { method: 'sso', mfa: true }, createdAt: '2026-03-25T09:00:00Z' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const actionBadgeVariant = (action: string): 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'default' => {
  switch (action) {
    case 'login':
    case 'logout':
      return 'info';
    case 'create':
    case 'import':
      return 'success';
    case 'update':
    case 'approve':
      return 'purple';
    case 'delete':
    case 'reject':
      return 'danger';
    case 'export':
      return 'default';
    case 'role_change':
    case 'password_change':
      return 'warning';
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
    import: 'インポート',
    approve: '承認',
    reject: '却下',
    password_change: 'パスワード変更',
    role_change: '権限変更',
  };
  return map[action] || action;
};

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function AuditLogPage() {
  const [filterAction, setFilterAction] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const filteredLogs = mockLogs.filter((log) => {
    if (filterAction && log.action !== filterAction) return false;
    if (filterUser && !log.user.toLowerCase().includes(filterUser.toLowerCase())) return false;
    if (filterDateFrom && log.createdAt < filterDateFrom) return false;
    if (filterDateTo && log.createdAt > filterDateTo + 'T23:59:59Z') return false;
    return true;
  });

  const handleExport = (format: 'csv' | 'json') => {
    const data = filteredLogs;
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'audit_logs.json';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ['ID', 'Action', 'User', 'Resource', 'ResourceID', 'IP', 'Timestamp'];
      const rows = data.map((l) => [l.id, l.action, l.user, l.resource, l.resourceId, l.ipAddress, l.createdAt]);
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

      {/* Filters */}
      <div className="aegis-card">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              アクション種別
            </label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-aegis-border dark:bg-aegis-surface dark:text-white"
            >
              <option value="">すべて</option>
              {actionTypes.map((a) => (
                <option key={a} value={a}>{actionLabel(a)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ユーザー
            </label>
            <input
              type="text"
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              placeholder="メールで検索..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-aegis-border dark:bg-aegis-surface dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">ユーザー</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">リソース</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">IP</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">タイムスタンプ</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">詳細</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-aegis-surface/50 transition-colors">
                  <td className="px-6 py-3">
                    <Badge variant={actionBadgeVariant(log.action)}>
                      {actionLabel(log.action)}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-gray-900 dark:text-white">{log.user}</td>
                  <td className="px-6 py-3 text-gray-700 dark:text-gray-300">
                    {log.resource}
                    {log.resourceId && (
                      <span className="ml-1 text-xs text-gray-400">({log.resourceId})</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{log.ipAddress}</td>
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400 text-xs">
                    {new Date(log.createdAt).toLocaleString('ja-JP')}
                  </td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-medium"
                    >
                      表示
                    </button>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    該当するログがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-gray-200 dark:border-aegis-border px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
          {filteredLogs.length}件のログを表示中
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedLog(null)}>
          <div
            className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-aegis-darker"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
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
                  <span className="ml-2 font-mono text-gray-900 dark:text-white">{selectedLog.id}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">アクション:</span>
                  <span className="ml-2">
                    <Badge variant={actionBadgeVariant(selectedLog.action)}>{actionLabel(selectedLog.action)}</Badge>
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">ユーザー:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{selectedLog.user}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">リソース:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{selectedLog.resource}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">IP:</span>
                  <span className="ml-2 font-mono text-gray-900 dark:text-white">{selectedLog.ipAddress}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">日時:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">
                    {new Date(selectedLog.createdAt).toLocaleString('ja-JP')}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">User Agent:</span>
                <p className="mt-1 text-xs font-mono text-gray-700 dark:text-gray-300 break-all">{selectedLog.userAgent}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">詳細 (JSONB):</span>
                <pre className="mt-1 rounded-lg bg-gray-100 p-3 text-xs font-mono text-gray-800 dark:bg-aegis-surface dark:text-gray-200 overflow-auto max-h-48">
                  {JSON.stringify(selectedLog.detail, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
