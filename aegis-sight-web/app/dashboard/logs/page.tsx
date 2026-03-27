'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchLogs } from '@/lib/api';
import type { LogonEvent, UsbEvent, FileEvent, LogFilters } from '@/lib/types';

type LogTab = 'logon' | 'usb' | 'file';

const tabLabels: Record<LogTab, string> = {
  logon: 'ログオン',
  usb: 'USB',
  file: 'ファイル操作',
};

const tabIcons: Record<LogTab, JSX.Element> = {
  logon: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
    </svg>
  ),
  usb: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  ),
  file: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  ),
};

// フォールバック用モックデータ
const mockLogonEvents: LogonEvent[] = Array.from({ length: 10 }, (_, i) => ({
  id: `logon-${i + 1}`,
  userId: `user-${i + 1}`,
  userName: `user${i + 1}@aegis-sight.local`,
  hostname: `ws-prod-${String(i + 1).padStart(3, '0')}`,
  ipAddress: `192.168.1.${100 + i}`,
  logonType: (['interactive', 'remote', 'network', 'interactive', 'remote'] as const)[i % 5],
  status: i % 7 === 0 ? 'failure' : 'success',
  timestamp: new Date(Date.now() - i * 1800000).toISOString(),
  source: 'Windows Security',
}));

const mockUsbEvents: UsbEvent[] = Array.from({ length: 8 }, (_, i) => ({
  id: `usb-${i + 1}`,
  deviceName: (['USBメモリ 32GB', '外付けHDD', 'Webカメラ', 'USBメモリ 64GB', 'プリンタ'] as const)[i % 5],
  deviceType: (['mass_storage', 'mass_storage', 'video', 'mass_storage', 'printer'] as const)[i % 5],
  serialNumber: `USB-${String(200000 + i)}`,
  hostname: `ws-prod-${String(i + 1).padStart(3, '0')}`,
  userName: `user${i + 1}@aegis-sight.local`,
  action: (['connected', 'disconnected', 'blocked', 'connected', 'connected'] as const)[i % 5],
  timestamp: new Date(Date.now() - i * 3600000).toISOString(),
}));

const mockFileEvents: FileEvent[] = Array.from({ length: 10 }, (_, i) => ({
  id: `file-${i + 1}`,
  filePath: `/shared/documents/report-${i + 1}.xlsx`,
  fileName: `report-${i + 1}.xlsx`,
  operation: (['create', 'modify', 'delete', 'copy', 'rename', 'move'] as const)[i % 6],
  userName: `user${(i % 5) + 1}@aegis-sight.local`,
  hostname: `ws-prod-${String((i % 5) + 1).padStart(3, '0')}`,
  fileSize: Math.floor(Math.random() * 10000000),
  timestamp: new Date(Date.now() - i * 2400000).toISOString(),
}));

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

const logonTypeLabels: Record<string, string> = {
  interactive: '対話型',
  remote: 'リモート',
  network: 'ネットワーク',
  service: 'サービス',
  unlock: 'ロック解除',
};

const usbActionLabels: Record<string, string> = {
  connected: '接続',
  disconnected: '切断',
  blocked: 'ブロック',
};

const usbActionStyles: Record<string, string> = {
  connected: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  disconnected: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  blocked: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const fileOpLabels: Record<string, string> = {
  create: '作成',
  modify: '変更',
  delete: '削除',
  rename: '名前変更',
  copy: 'コピー',
  move: '移動',
};

export default function LogsPage() {
  const [activeTab, setActiveTab] = useState<LogTab>('logon');
  const [logonEvents, setLogonEvents] = useState<LogonEvent[]>(mockLogonEvents);
  const [usbEvents, setUsbEvents] = useState<UsbEvent[]>(mockUsbEvents);
  const [fileEvents, setFileEvents] = useState<FileEvent[]>(mockFileEvents);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 20;

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const filters: LogFilters = {
        page,
        perPage,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };
      const res = await fetchLogs(activeTab, filters);
      if (activeTab === 'logon') setLogonEvents(res.data as LogonEvent[]);
      else if (activeTab === 'usb') setUsbEvents(res.data as UsbEvent[]);
      else setFileEvents(res.data as FileEvent[]);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch {
      setError('ログデータの取得に失敗しました。フォールバックデータを表示しています。');
      if (activeTab === 'logon') { setTotal(mockLogonEvents.length); setTotalPages(1); }
      else if (activeTab === 'usb') { setTotal(mockUsbEvents.length); setTotalPages(1); }
      else { setTotal(mockFileEvents.length); setTotalPages(1); }
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, startDate, endDate]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleTabChange = (tab: LogTab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const startIndex = (page - 1) * perPage + 1;
  const endIndex = Math.min(page * perPage, total);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ログ管理</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          ログオン・USB・ファイル操作イベントの監視
        </p>
      </div>

      {/* エラー通知 */}
      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-200">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-aegis-border">
        <nav className="flex gap-0" aria-label="ログタブ">
          {(Object.keys(tabLabels) as LogTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tabIcons[tab]}
              {tabLabels[tab]}
            </button>
          ))}
        </nav>
      </div>

      {/* Date Range Filter */}
      <div className="aegis-card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">開始日</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="aegis-input w-auto"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">終了日</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="aegis-input w-auto"
            />
          </div>
          <button
            onClick={() => { setStartDate(''); setEndDate(''); setPage(1); }}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            クリア
          </button>
          {loading && (
            <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              読み込み中...
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="aegis-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          {activeTab === 'logon' && (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50 dark:border-aegis-border dark:bg-aegis-dark/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">ユーザー</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">ホスト名</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">IPアドレス</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">種別</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">結果</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">日時</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
                {logonEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-aegis-surface/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{event.userName}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{event.hostname}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{event.ipAddress}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{logonTypeLabels[event.logonType] || event.logonType}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        event.status === 'success'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {event.status === 'success' ? '成功' : '失敗'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{formatDateTime(event.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'usb' && (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50 dark:border-aegis-border dark:bg-aegis-dark/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">デバイス名</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">シリアル番号</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">ホスト名</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">ユーザー</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">アクション</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">日時</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
                {usbEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-aegis-surface/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{event.deviceName}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 font-mono">{event.serialNumber}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{event.hostname}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{event.userName}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${usbActionStyles[event.action]}`}>
                        {usbActionLabels[event.action]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{formatDateTime(event.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'file' && (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50 dark:border-aegis-border dark:bg-aegis-dark/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">ファイル名</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">操作</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">ユーザー</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">ホスト名</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">サイズ</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">日時</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
                {fileEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-aegis-surface/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{event.fileName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{event.filePath}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        {fileOpLabels[event.operation] || event.operation}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{event.userName}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{event.hostname}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{formatFileSize(event.fileSize)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{formatDateTime(event.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!loading && (
            (activeTab === 'logon' && logonEvents.length === 0) ||
            (activeTab === 'usb' && usbEvents.length === 0) ||
            (activeTab === 'file' && fileEvents.length === 0)
          ) && (
            <div className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
              該当するログイベントが見つかりません
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3 dark:border-aegis-border">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            全 <span className="font-medium">{total.toLocaleString()}</span> 件中 {total > 0 ? startIndex : 0}-{endIndex} 件を表示
          </p>
          <div className="flex gap-2">
            <button
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-aegis-border dark:bg-aegis-surface dark:text-gray-300 dark:hover:bg-aegis-dark"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              前へ
            </button>
            <span className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400">
              {page} / {totalPages}
            </span>
            <button
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-aegis-border dark:bg-aegis-surface dark:text-gray-300 dark:hover:bg-aegis-dark"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              次へ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
