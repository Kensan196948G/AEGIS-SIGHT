'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useSamLicenses } from '@/lib/hooks/use-sam-licenses';
import { computeStatus, getDaysUntilExpiry, statusConfig, licenseTypeLabels } from '@/lib/utils/sam';
import type { LicenseStatus } from '@/lib/utils/sam';

function formatExpiry(dateStr: string | null): { text: string; urgent: boolean } {
  if (!dateStr) return { text: '—', urgent: false };
  const days = getDaysUntilExpiry(dateStr);
  if (days < 0)   return { text: `${Math.abs(days)}日超過`, urgent: true };
  if (days === 0) return { text: '本日期限', urgent: true };
  if (days <= 30) return { text: `残${days}日`, urgent: true };
  if (days <= 90) return { text: `残${days}日`, urgent: false };
  const d = new Date(dateStr);
  return {
    text: `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`,
    urgent: false,
  };
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[...Array(9)].map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 rounded bg-gray-200 dark:bg-gray-700" />
        </td>
      ))}
    </tr>
  );
}

export default function LicensesPage() {
  const [filterStatus, setFilterStatus] = useState('');
  const [filterVendor, setFilterVendor] = useState('');
  const [search,       setSearch]       = useState('');

  const { licenses, loading, error, refetch } = useSamLicenses();

  const vendors = [...new Set(licenses.map(l => l.vendor))].sort();

  const filtered = licenses.filter(l => {
    const used   = l.installed_count + l.m365_assigned;
    const status = computeStatus(l);
    if (filterStatus && status !== filterStatus) return false;
    if (filterVendor && l.vendor !== filterVendor) return false;
    if (search && !l.software_name.toLowerCase().includes(search.toLowerCase()) &&
        !l.vendor.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalMonthlyCost = licenses.reduce(
    (sum, l) => sum + (l.cost_per_unit ?? 0) * l.purchased_count, 0
  );
  const overDeployed  = licenses.filter(l => computeStatus(l) === 'over-deployed').length;
  const expiringSoon  = licenses.filter(l => {
    if (!l.expiry_date) return false;
    const d = getDaysUntilExpiry(l.expiry_date);
    return d >= 0 && d <= 90;
  }).length;
  const underUtilized = licenses.filter(l => computeStatus(l) === 'under-utilized').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ライセンス管理</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            ソフトウェアライセンスの遵守状況・コスト・期限管理
          </p>
        </div>
        <button className="aegis-btn-primary">
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          ライセンスを追加
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="aegis-card border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                ライセンスデータの取得に失敗しました
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{error}</p>
            </div>
            <button onClick={refetch} className="aegis-btn-secondary text-xs">再試行</button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="aegis-card text-center">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">月額総コスト</p>
          <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
            ¥{loading ? '—' : totalMonthlyCost.toLocaleString()}
          </p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">超過ライセンス</p>
          <p className={`mt-1 text-xl font-bold ${overDeployed > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
            {loading ? '—' : `${overDeployed} 件`}
          </p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">期限間近 (90日以内)</p>
          <p className={`mt-1 text-xl font-bold ${expiringSoon > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
            {loading ? '—' : `${expiringSoon} 件`}
          </p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">低利用 (削減候補)</p>
          <p className={`mt-1 text-xl font-bold ${underUtilized > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
            {loading ? '—' : `${underUtilized} 件`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="aegis-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ソフトウェア名・ベンダーで検索..."
              className="aegis-input"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="aegis-input w-auto"
          >
            <option value="">すべてのステータス</option>
            <option value="compliant">準拠</option>
            <option value="over-deployed">超過</option>
            <option value="under-utilized">低利用</option>
            <option value="expiring-soon">期限間近</option>
            <option value="expired">期限切れ</option>
          </select>
          <select
            value={filterVendor}
            onChange={e => setFilterVendor(e.target.value)}
            className="aegis-input w-auto"
          >
            <option value="">すべてのベンダー</option>
            {vendors.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          {(filterStatus || filterVendor || search) && (
            <button
              onClick={() => { setFilterStatus(''); setFilterVendor(''); setSearch(''); }}
              className="aegis-btn-secondary text-xs"
            >
              クリア
            </button>
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
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">種別</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">購入 / 使用</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">使用率</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">月額コスト</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">有効期限</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">ステータス</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">SKU alias</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
              {loading ? (
                [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    {licenses.length === 0
                      ? 'ライセンスデータがありません'
                      : '条件に一致するライセンスが見つかりません'}
                  </td>
                </tr>
              ) : (
                filtered.map(lic => {
                  const used        = lic.installed_count + lic.m365_assigned;
                  const usageRate   = lic.purchased_count > 0
                    ? Math.round((used / lic.purchased_count) * 100)
                    : 0;
                  const monthlyCost = (lic.cost_per_unit ?? 0) * lic.purchased_count;
                  const expiry      = formatExpiry(lic.expiry_date);
                  const status      = computeStatus(lic);

                  return (
                    <tr key={lic.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {lic.software_name}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {lic.vendor}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {licenseTypeLabels[lic.license_type] ?? lic.license_type}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        <span className={used > lic.purchased_count ? 'font-semibold text-red-600 dark:text-red-400' : ''}>
                          {used}
                        </span>
                        <span className="text-gray-400"> / {lic.purchased_count}</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                            <div
                              className={`h-full rounded-full ${
                                usageRate > 100 ? 'bg-red-500' : usageRate > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(usageRate, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            {usageRate}%
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        ¥{monthlyCost.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <span className={expiry.urgent ? 'font-semibold text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}>
                          {expiry.text}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <Badge variant={statusConfig[status].variant} dot size="sm">
                          {statusConfig[status].label}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <Link
                          href={`/dashboard/sam/licenses/${lic.id}/aliases`}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 transition-colors"
                        >
                          SKU alias →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-gray-200 px-6 py-3 dark:border-aegis-border">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {loading ? '読み込み中...' : `${filtered.length} 件表示 / 全 ${licenses.length} 件`}
          </p>
        </div>
      </div>
    </div>
  );
}
