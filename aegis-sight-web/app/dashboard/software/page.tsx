'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { fetchSoftware } from '@/lib/api';
import type { SoftwareInventory } from '@/lib/types';

const complianceLabels: Record<SoftwareInventory['complianceStatus'], string> = {
  compliant: '適正',
  'over-deployed': '超過',
  unlicensed: '未ライセンス',
  unknown: '不明',
};

const complianceStyles: Record<SoftwareInventory['complianceStatus'], string> = {
  compliant: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'over-deployed': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  unlicensed: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  unknown: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

// フォールバック用モックデータ
const fallbackSoftware: SoftwareInventory[] = [
  { id: 'sw-1', name: 'Microsoft 365 Business', vendor: 'Microsoft', version: '2024', installedCount: 480, licensedCount: 500, category: 'オフィス', complianceStatus: 'compliant', lastDetectedAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'sw-2', name: 'Adobe Creative Cloud', vendor: 'Adobe', version: '2024', installedCount: 58, licensedCount: 50, category: 'デザイン', complianceStatus: 'over-deployed', lastDetectedAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 'sw-3', name: 'Slack Desktop', vendor: 'Salesforce', version: '4.38', installedCount: 620, licensedCount: null, category: 'コミュニケーション', complianceStatus: 'unknown', lastDetectedAt: new Date(Date.now() - 1800000).toISOString() },
  { id: 'sw-4', name: 'Visual Studio Code', vendor: 'Microsoft', version: '1.87', installedCount: 245, licensedCount: null, category: '開発ツール', complianceStatus: 'compliant', lastDetectedAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'sw-5', name: 'Zoom Workplace', vendor: 'Zoom', version: '6.0', installedCount: 510, licensedCount: 500, category: 'コミュニケーション', complianceStatus: 'over-deployed', lastDetectedAt: new Date(Date.now() - 5400000).toISOString() },
  { id: 'sw-6', name: 'AutoCAD 2024', vendor: 'Autodesk', version: '2024', installedCount: 35, licensedCount: 40, category: 'CAD', complianceStatus: 'compliant', lastDetectedAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'sw-7', name: 'Git for Windows', vendor: 'Git SCM', version: '2.44', installedCount: 198, licensedCount: null, category: '開発ツール', complianceStatus: 'compliant', lastDetectedAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 'sw-8', name: '7-Zip', vendor: 'Igor Pavlov', version: '24.01', installedCount: 720, licensedCount: null, category: 'ユーティリティ', complianceStatus: 'compliant', lastDetectedAt: new Date(Date.now() - 14400000).toISOString() },
  { id: 'sw-9', name: 'WinRAR', vendor: 'RARLAB', version: '7.0', installedCount: 42, licensedCount: 0, category: 'ユーティリティ', complianceStatus: 'unlicensed', lastDetectedAt: new Date(Date.now() - 10800000).toISOString() },
  { id: 'sw-10', name: 'Tableau Desktop', vendor: 'Salesforce', version: '2024.1', installedCount: 28, licensedCount: 30, category: 'BI', complianceStatus: 'compliant', lastDetectedAt: new Date(Date.now() - 21600000).toISOString() },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ja-JP');
}

export default function SoftwarePage() {
  const [software, setSoftware] = useState<SoftwareInventory[]>(fallbackSoftware);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(fallbackSoftware.length);
  const perPage = 20;

  const loadSoftware = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchSoftware(page, perPage, search || undefined);
      setSoftware(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch {
      setError('ソフトウェア一覧の取得に失敗しました。フォールバックデータを表示しています。');
      // フォールバックフィルタリング
      let filtered = fallbackSoftware;
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (s) => s.name.toLowerCase().includes(q) || s.vendor.toLowerCase().includes(q)
        );
      }
      setSoftware(filtered);
      setTotal(filtered.length);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadSoftware();
  }, [loadSoftware]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const startIndex = (page - 1) * perPage + 1;
  const endIndex = Math.min(page * perPage, total);

  // 集計
  const totalInstalled = software.reduce((sum, s) => sum + s.installedCount, 0);
  const overDeployed = software.filter((s) => s.complianceStatus === 'over-deployed').length;
  const unlicensed = software.filter((s) => s.complianceStatus === 'unlicensed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ソフトウェア管理</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            インストール済みソフトウェアの一覧と管理
          </p>
        </div>
        <Link
          href="/dashboard/sam/licenses"
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
          </svg>
          ライセンス管理
        </Link>
      </div>

      {/* エラー通知 */}
      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-200">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="aegis-card">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">検出ソフトウェア</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{total}</p>
          <p className="mt-1 text-xs text-gray-500">合計 {totalInstalled.toLocaleString()} インストール</p>
        </div>
        <div className="aegis-card">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">ライセンス超過</p>
          <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">{overDeployed}</p>
          <p className="mt-1 text-xs text-gray-500">要対応</p>
        </div>
        <div className="aegis-card">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">未ライセンス</p>
          <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">{unlicensed}</p>
          <p className="mt-1 text-xs text-gray-500">確認必要</p>
        </div>
      </div>

      {/* Search */}
      <div className="aegis-card">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="ソフトウェア名、ベンダーで検索..."
              className="aegis-input"
            />
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="aegis-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50 dark:border-aegis-border dark:bg-aegis-dark/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">ソフトウェア</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">ベンダー</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">バージョン</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">カテゴリ</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">インストール数</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">ライセンス数</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">状態</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">最終検出</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
              {loading && software.length === 0
                ? [...Array(8)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 w-36 rounded bg-gray-200 dark:bg-gray-700" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-12 rounded bg-gray-200 dark:bg-gray-700 ml-auto" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-12 rounded bg-gray-200 dark:bg-gray-700 ml-auto" /></td>
                      <td className="px-6 py-4"><div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" /></td>
                    </tr>
                  ))
                : software.map((sw) => (
                    <tr key={sw.id} className="hover:bg-gray-50 dark:hover:bg-aegis-surface/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{sw.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{sw.vendor}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 font-mono">{sw.version}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{sw.category}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-white font-medium">{sw.installedCount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-700 dark:text-gray-300">
                        {sw.licensedCount !== null ? sw.licensedCount.toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${complianceStyles[sw.complianceStatus]}`}>
                          {complianceLabels[sw.complianceStatus]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{formatDate(sw.lastDetectedAt)}</td>
                    </tr>
                  ))}
              {!loading && software.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    該当するソフトウェアが見つかりません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
