'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchDevices } from '@/lib/api';
import type { Device } from '@/lib/types';

const statusLabels: Record<Device['status'], string> = {
  active: 'アクティブ',
  inactive: '非アクティブ',
  maintenance: 'メンテナンス',
  retired: '廃棄',
};

const statusStyles: Record<Device['status'], string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  maintenance: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  retired: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

// フォールバックデータ
const fallbackDevices: Device[] = Array.from({ length: 8 }, (_, i) => ({
  id: `dev-${i + 1}`,
  hostname: `ws-prod-${String(i + 1).padStart(3, '0')}`,
  ipAddress: `192.168.1.${100 + i}`,
  macAddress: `00:1A:2B:3C:4D:${String(i + 10).padStart(2, '0')}`,
  osName: i % 3 === 0 ? 'macOS' : 'Windows 11',
  osVersion: i % 3 === 0 ? '14.2' : '23H2',
  manufacturer: i % 3 === 0 ? 'Apple' : 'Dell',
  model: i % 3 === 0 ? 'MacBook Pro 14' : 'Latitude 5540',
  serialNumber: `SN-${String(100000 + i)}`,
  status: (['active', 'active', 'active', 'inactive', 'maintenance', 'active', 'active', 'retired'] as const)[i],
  department: (['エンジニアリング', '営業', '人事', 'エンジニアリング', '経理', '営業', 'エンジニアリング', '人事'] as const)[i],
  assignedUser: `user-${i + 1}`,
  lastSeen: new Date(Date.now() - i * 3600000).toISOString(),
  createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
  updatedAt: new Date(Date.now() - i * 86400000).toISOString(),
}));

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  return date.toLocaleDateString('ja-JP');
}

export default function AssetsPage() {
  const [devices, setDevices] = useState<Device[]>(fallbackDevices);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(fallbackDevices.length);
  const perPage = 20;

  const loadDevices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchDevices(page, perPage, {
        search: search || undefined,
        status: statusFilter || undefined,
        department: departmentFilter || undefined,
      });
      setDevices(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch {
      setError('デバイス一覧の取得に失敗しました。フォールバックデータを表示しています。');
      // フォールバックデータでフィルタリング
      let filtered = fallbackDevices;
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (d) =>
            d.hostname.toLowerCase().includes(q) ||
            d.ipAddress.includes(q) ||
            d.serialNumber.toLowerCase().includes(q)
        );
      }
      if (statusFilter) {
        filtered = filtered.filter((d) => d.status === statusFilter);
      }
      if (departmentFilter) {
        filtered = filtered.filter((d) => d.department === departmentFilter);
      }
      setDevices(filtered);
      setTotal(filtered.length);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, departmentFilter]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  // 検索時はページをリセット
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const startIndex = (page - 1) * perPage + 1;
  const endIndex = Math.min(page * perPage, total);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">IT資産一覧</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            管理対象のハードウェア・ソフトウェア資産
          </p>
        </div>
        <button className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          資産を追加
        </button>
      </div>

      {/* エラー通知 */}
      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-200">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="aegis-card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="ホスト名、IPアドレス、シリアル番号で検索..."
              className="aegis-input"
            />
          </div>
          <select
            className="aegis-input w-auto"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">すべてのステータス</option>
            <option value="active">アクティブ</option>
            <option value="inactive">非アクティブ</option>
            <option value="maintenance">メンテナンス</option>
            <option value="retired">廃棄</option>
          </select>
          <select
            className="aegis-input w-auto"
            value={departmentFilter}
            onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1); }}
          >
            <option value="">すべての部門</option>
            <option value="エンジニアリング">エンジニアリング</option>
            <option value="営業">営業</option>
            <option value="人事">人事</option>
            <option value="経理">経理</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="aegis-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50 dark:border-aegis-border dark:bg-aegis-dark/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  ホスト名
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  IPアドレス
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  OS
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  部門
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  最終確認
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
              {loading && devices.length === 0
                ? [...Array(8)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" /></td>
                      <td className="px-6 py-4"><div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" /></td>
                    </tr>
                  ))
                : devices.map((device) => (
                    <tr key={device.id} className="hover:bg-gray-50 dark:hover:bg-aegis-surface/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{device.hostname}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{device.serialNumber}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {device.ipAddress}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {device.osName} {device.osVersion}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {device.department}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[device.status]}`}>
                          {statusLabels[device.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(device.lastSeen)}
                      </td>
                    </tr>
                  ))}
              {!loading && devices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    該当するデバイスが見つかりません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3 dark:border-aegis-border">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            全 <span className="font-medium">{total.toLocaleString()}</span> 件中 {startIndex}-{endIndex} 件を表示
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
