'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { fetchDevices } from '@/lib/api';
import type { BackendDevice } from '@/lib/api';

type BackendStatus = 'active' | 'inactive' | 'maintenance';

const statusConfig: Record<BackendStatus, { label: string; variant: 'success' | 'danger' | 'info'; dot: string }> = {
  active:      { label: 'アクティブ',  variant: 'success', dot: 'bg-green-500' },
  inactive:    { label: 'オフライン',   variant: 'danger',  dot: 'bg-gray-400'  },
  maintenance: { label: 'メンテナンス', variant: 'info',    dot: 'bg-blue-500'  },
};

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  return `${Math.floor(hours / 24)}日前`;
}

const PAGE_SIZE = 50;

export default function DevicesPage() {
  const [devices, setDevices] = useState<BackendDevice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BackendStatus | 'all'>('all');

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const data = await fetchDevices(
        p * PAGE_SIZE,
        PAGE_SIZE,
        statusFilter !== 'all' ? statusFilter : undefined,
      );
      setDevices(data.items);
      setTotal(data.total);
    } catch {
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { setPage(0); }, [statusFilter]);
  useEffect(() => { load(page); }, [load, page]);

  const filtered = search
    ? devices.filter(d =>
        d.hostname.toLowerCase().includes(search.toLowerCase()) ||
        (d.ip_address ?? '').includes(search)
      )
    : devices;

  const activeCount = devices.filter(d => d.status === 'active').length;
  const inactiveCount = devices.filter(d => d.status === 'inactive').length;
  const maintenanceCount = devices.filter(d => d.status === 'maintenance').length;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">デバイス管理</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            管理対象エンドポイントのステータス・詳細情報
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="aegis-card text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">合計</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {loading ? '—' : total.toLocaleString()}
          </p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-green-600 dark:text-green-400">アクティブ</p>
          <p className="mt-2 text-3xl font-bold text-green-600 dark:text-green-400">
            {loading ? '—' : activeCount.toLocaleString()}
          </p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">オフライン</p>
          <p className="mt-2 text-3xl font-bold text-gray-500 dark:text-gray-400">
            {loading ? '—' : inactiveCount.toLocaleString()}
          </p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-blue-600 dark:text-blue-400">メンテナンス</p>
          <p className="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-400">
            {loading ? '—' : maintenanceCount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="aegis-card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="ホスト名・IPアドレスで検索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="aegis-input w-full"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as BackendStatus | 'all')}
            className="aegis-input w-auto"
          >
            <option value="all">すべてのステータス</option>
            <option value="active">アクティブ</option>
            <option value="inactive">オフライン</option>
            <option value="maintenance">メンテナンス</option>
          </select>
        </div>
      </div>

      {/* Device Table */}
      <div className="aegis-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50 dark:border-aegis-border dark:bg-aegis-dark/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  ホスト名
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  OSバージョン
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  IPアドレス
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  ドメイン
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
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(6)].map((__, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 rounded bg-gray-200 dark:bg-gray-700" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    条件に一致するデバイスがありません
                  </td>
                </tr>
              ) : (
                filtered.map((device) => {
                  const st = statusConfig[device.status as BackendStatus] ?? statusConfig.inactive;
                  return (
                    <tr
                      key={String(device.id)}
                      className="transition-colors hover:bg-gray-50/70 dark:hover:bg-aegis-dark/40"
                    >
                      <td className="px-6 py-4">
                        <Link href={`/dashboard/devices/${device.id}`} className="flex items-center gap-2 hover:underline">
                          <div className={`h-2 w-2 rounded-full flex-shrink-0 ${st.dot}`} />
                          <span className="font-medium text-gray-900 dark:text-white">{device.hostname}</span>
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {device.os_version ?? '—'}
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-gray-700 dark:text-gray-300">
                        {device.ip_address ?? '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {device.domain ?? '—'}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatRelative(device.last_seen)}
                      </td>
                    </tr>
                  );
                })
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
              onClick={() => setPage(p => p - 1)}
            >
              前へ
            </button>
            <button
              className="aegis-btn-secondary"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
            >
              次へ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
