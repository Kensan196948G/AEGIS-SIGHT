'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

type LicenseStatus = 'compliant' | 'over-deployed' | 'under-utilized' | 'expired';
type LicenseType = 'サブスクリプション' | 'ボリューム' | 'OEM' | 'フリー';

interface License {
  id: string;
  name: string;
  vendor: string;
  type: LicenseType;
  total: number;
  used: number;
  status: LicenseStatus;
  expiry_date: string;
  cost_per_seat: number;
}

const demoLicenses: License[] = [
  { id: '1', name: 'Microsoft 365 E3',          vendor: 'Microsoft',  type: 'サブスクリプション', total: 500, used: 487, status: 'compliant',       expiry_date: '2027-03-31', cost_per_seat: 3600 },
  { id: '2', name: 'Adobe Creative Cloud',       vendor: 'Adobe',      type: 'サブスクリプション', total:  50, used:  58, status: 'over-deployed',   expiry_date: '2026-12-31', cost_per_seat: 7200 },
  { id: '3', name: 'Slack Business+',            vendor: 'Salesforce', type: 'サブスクリプション', total: 600, used: 412, status: 'under-utilized',  expiry_date: '2027-01-31', cost_per_seat: 1800 },
  { id: '4', name: 'AutoCAD LT',                 vendor: 'Autodesk',   type: 'サブスクリプション', total:  30, used:  28, status: 'compliant',       expiry_date: '2026-09-30', cost_per_seat: 84000 },
  { id: '5', name: 'Visual Studio Enterprise',   vendor: 'Microsoft',  type: 'サブスクリプション', total:  20, used:  18, status: 'compliant',       expiry_date: '2027-03-31', cost_per_seat: 120000 },
  { id: '6', name: 'Jira Software Cloud',        vendor: 'Atlassian',  type: 'サブスクリプション', total: 200, used: 195, status: 'compliant',       expiry_date: '2026-11-30', cost_per_seat: 1200 },
  { id: '7', name: 'Windows Server 2022',        vendor: 'Microsoft',  type: 'ボリューム',         total:  15, used:  14, status: 'compliant',       expiry_date: '2031-10-14', cost_per_seat: 180000 },
  { id: '8', name: 'Norton 360 Business',        vendor: 'Gen Digital', type: 'サブスクリプション', total: 600, used: 320, status: 'under-utilized', expiry_date: '2026-06-30', cost_per_seat: 3000 },
  { id: '9', name: 'VMware vSphere 8',           vendor: 'Broadcom',   type: 'ボリューム',         total:  10, used:  10, status: 'compliant',       expiry_date: '2026-12-31', cost_per_seat: 250000 },
  { id: '10', name: 'GitHub Enterprise',         vendor: 'GitHub',     type: 'サブスクリプション', total: 100, used: 103, status: 'over-deployed',   expiry_date: '2027-02-28', cost_per_seat: 20000 },
  { id: '11', name: 'Zoom Business',             vendor: 'Zoom',       type: 'サブスクリプション', total: 300, used: 145, status: 'under-utilized',  expiry_date: '2026-08-31', cost_per_seat: 2000 },
  { id: '12', name: 'Sophos Endpoint Protection',vendor: 'Sophos',     type: 'サブスクリプション', total: 1000, used: 842, status: 'compliant',      expiry_date: '2026-05-31', cost_per_seat: 4800 },
];

const statusConfig: Record<LicenseStatus, { variant: 'success' | 'danger' | 'warning' | 'default'; label: string }> = {
  compliant:      { variant: 'success', label: '準拠' },
  'over-deployed': { variant: 'danger',  label: '超過' },
  'under-utilized': { variant: 'warning', label: '低利用' },
  expired:        { variant: 'danger',  label: '期限切れ' },
};

const ITEMS_PER_PAGE = 8;

export default function LicensesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LicenseStatus | 'all'>('all');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const vendors = Array.from(new Set(demoLicenses.map((l) => l.vendor))).sort();

  const filtered = demoLicenses.filter((lic) => {
    const matchSearch =
      search === '' ||
      lic.name.toLowerCase().includes(search.toLowerCase()) ||
      lic.vendor.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || lic.status === statusFilter;
    const matchVendor = vendorFilter === 'all' || lic.vendor === vendorFilter;
    return matchSearch && matchStatus && matchVendor;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Summary counts
  const overDeployed = demoLicenses.filter((l) => l.status === 'over-deployed').length;
  const underUtilized = demoLicenses.filter((l) => l.status === 'under-utilized').length;
  const expiringSoon = demoLicenses.filter((l) => {
    const days = Math.ceil((new Date(l.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 90;
  }).length;
  const totalCost = demoLicenses.reduce((sum, l) => sum + l.cost_per_seat * l.total, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ライセンス一覧</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            ソフトウェアライセンスの管理と遵守状況
          </p>
        </div>
        <button className="aegis-btn-primary">
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          ライセンスを追加
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="aegis-card text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">総ライセンス種別</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{demoLicenses.length}</p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">超過デプロイ</p>
          <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">{overDeployed}</p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">低利用</p>
          <p className="mt-2 text-3xl font-bold text-amber-600 dark:text-amber-400">{underUtilized}</p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">90日以内に期限切れ</p>
          <p className="mt-2 text-3xl font-bold text-orange-600 dark:text-orange-400">{expiringSoon}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="aegis-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[200px] flex-1">
            <input
              type="text"
              placeholder="ソフトウェア名・ベンダーで検索..."
              className="aegis-input"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <select
            className="aegis-input w-auto"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as LicenseStatus | 'all'); setCurrentPage(1); }}
          >
            <option value="all">すべてのステータス</option>
            {(Object.keys(statusConfig) as LicenseStatus[]).map((s) => (
              <option key={s} value={s}>{statusConfig[s].label}</option>
            ))}
          </select>
          <select
            className="aegis-input w-auto"
            value={vendorFilter}
            onChange={(e) => { setVendorFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="all">すべてのベンダー</option>
            {vendors.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          {(search || statusFilter !== 'all' || vendorFilter !== 'all') && (
            <button
              className="aegis-btn-secondary text-sm"
              onClick={() => { setSearch(''); setStatusFilter('all'); setVendorFilter('all'); setCurrentPage(1); }}
            >
              リセット
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
                {['ソフトウェア', 'ベンダー', '種別', '購入数', '使用数', '使用率', '期限', 'ステータス'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
              {paginated.length > 0 ? paginated.map((lic) => {
                const usageRate = Math.round((lic.used / lic.total) * 100);
                const { variant, label } = statusConfig[lic.status];
                const daysToExpiry = Math.ceil((new Date(lic.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const expiryClass =
                  daysToExpiry < 0 ? 'text-red-600 dark:text-red-400' :
                  daysToExpiry <= 90 ? 'text-amber-600 dark:text-amber-400' :
                  'text-gray-600 dark:text-gray-400';
                return (
                  <tr key={lic.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-aegis-dark/30">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {lic.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {lic.vendor}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {lic.type}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm tabular-nums text-gray-700 dark:text-gray-300">
                      {lic.total.toLocaleString()}
                    </td>
                    <td className={`whitespace-nowrap px-6 py-4 text-sm font-medium tabular-nums ${
                      lic.used > lic.total ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {lic.used.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                          <div
                            className={`h-full rounded-full ${
                              usageRate > 100 ? 'bg-red-500' :
                              usageRate > 80 ? 'bg-amber-500' :
                              usageRate < 40 ? 'bg-gray-400' :
                              'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(usageRate, 100)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-semibold tabular-nums ${
                          usageRate > 100 ? 'text-red-600 dark:text-red-400' :
                          usageRate < 40 ? 'text-gray-500 dark:text-gray-400' :
                          'text-gray-700 dark:text-gray-300'
                        }`}>
                          {usageRate}%
                        </span>
                      </div>
                    </td>
                    <td className={`whitespace-nowrap px-6 py-4 text-sm ${expiryClass}`}>
                      {lic.expiry_date}
                      {daysToExpiry >= 0 && daysToExpiry <= 90 && (
                        <span className="ml-1 text-xs">({daysToExpiry}日)</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <Badge variant={variant} dot size="sm">{label}</Badge>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    条件に一致するライセンスが見つかりません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3 dark:border-aegis-border">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            全 <span className="font-medium">{filtered.length}</span> 件中{' '}
            {filtered.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}–
            {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} 件を表示
          </p>
          <div className="flex gap-2">
            <button
              className="aegis-btn-secondary"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              前へ
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={page === currentPage ? 'aegis-btn-primary px-3' : 'aegis-btn-secondary px-3'}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
            <button
              className="aegis-btn-secondary"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              次へ
            </button>
          </div>
        </div>
      </div>

      {/* Cost Summary */}
      <div className="aegis-card">
        <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">コスト概要</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          年間ライセンス総コスト（概算）:{' '}
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            ¥{totalCost.toLocaleString('ja-JP')}
          </span>
        </p>
      </div>
    </div>
  );
}
