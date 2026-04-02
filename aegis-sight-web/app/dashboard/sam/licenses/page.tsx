'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

type LicenseStatus = 'compliant' | 'over-deployed' | 'under-utilized' | 'expiring-soon' | 'expired';

interface License {
  id: string;
  name: string;
  vendor: string;
  type: string;
  total: number;
  used: number;
  status: LicenseStatus;
  expiryDate: string;
  costPerLicense: number; // 円/ライセンス/月
}

const statusConfig: Record<LicenseStatus, { variant: 'success' | 'danger' | 'warning' | 'info'; label: string }> = {
  compliant:        { variant: 'success', label: '準拠' },
  'over-deployed':  { variant: 'danger',  label: '超過' },
  'under-utilized': { variant: 'warning', label: '低利用' },
  'expiring-soon':  { variant: 'warning', label: '期限間近' },
  expired:          { variant: 'danger',  label: '期限切れ' },
};

const licenses: License[] = [
  { id: '1', name: 'Microsoft 365 E3',       vendor: 'Microsoft', type: 'サブスクリプション', total: 500, used: 487, status: 'compliant',        expiryDate: '2025-03-31', costPerLicense: 2750 },
  { id: '2', name: 'Adobe Creative Cloud',   vendor: 'Adobe',     type: 'サブスクリプション', total:  50, used:  58, status: 'over-deployed',    expiryDate: '2025-06-30', costPerLicense: 6578 },
  { id: '3', name: 'Slack Business+',        vendor: 'Salesforce',type: 'サブスクリプション', total: 600, used: 412, status: 'under-utilized',   expiryDate: '2025-09-30', costPerLicense:  998 },
  { id: '4', name: 'AutoCAD LT',             vendor: 'Autodesk',  type: 'サブスクリプション', total:  30, used:  28, status: 'compliant',        expiryDate: '2025-02-28', costPerLicense: 5500 },
  { id: '5', name: 'Visual Studio Enterprise',vendor: 'Microsoft',type: 'サブスクリプション', total:  20, used:  18, status: 'compliant',        expiryDate: '2025-05-31', costPerLicense: 8250 },
  { id: '6', name: 'Jira Software Cloud',    vendor: 'Atlassian', type: 'サブスクリプション', total: 200, used: 195, status: 'expiring-soon',    expiryDate: '2025-01-15', costPerLicense:  750 },
  { id: '7', name: 'Windows Server 2022',    vendor: 'Microsoft', type: 'ボリューム',         total:  15, used:  14, status: 'compliant',        expiryDate: '2027-10-14', costPerLicense: 45000 },
  { id: '8', name: 'Norton 360',             vendor: 'Gen Digital',type: 'サブスクリプション',total: 600, used: 320, status: 'under-utilized',   expiryDate: '2025-04-30', costPerLicense:  420 },
];

function getDaysUntilExpiry(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatExpiry(dateStr: string): { text: string; urgent: boolean } {
  const days = getDaysUntilExpiry(dateStr);
  if (days < 0)   return { text: `${Math.abs(days)}日超過`, urgent: true };
  if (days === 0) return { text: '本日期限', urgent: true };
  if (days <= 30) return { text: `残${days}日`, urgent: true };
  if (days <= 90) return { text: `残${days}日`, urgent: false };
  const d = new Date(dateStr);
  return { text: `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`, urgent: false };
}

export default function LicensesPage() {
  const [filterStatus, setFilterStatus] = useState('');
  const [filterVendor, setFilterVendor]  = useState('');
  const [search, setSearch]              = useState('');

  const totalMonthlyCost = licenses.reduce((sum, l) => sum + l.costPerLicense * l.total, 0);
  const overDeployed     = licenses.filter(l => l.status === 'over-deployed').length;
  const expiringSoon     = licenses.filter(l => {
    const d = getDaysUntilExpiry(l.expiryDate);
    return d >= 0 && d <= 90;
  }).length;
  const underUtilized    = licenses.filter(l => l.status === 'under-utilized').length;

  const vendors = [...new Set(licenses.map(l => l.vendor))].sort();

  const filtered = licenses.filter(l => {
    if (filterStatus && l.status !== filterStatus) return false;
    if (filterVendor && l.vendor !== filterVendor)  return false;
    if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !l.vendor.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="aegis-card text-center">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">月額総コスト</p>
          <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
            ¥{totalMonthlyCost.toLocaleString()}
          </p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">超過ライセンス</p>
          <p className={`mt-1 text-xl font-bold ${overDeployed > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
            {overDeployed} 件
          </p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">期限間近 (90日以内)</p>
          <p className={`mt-1 text-xl font-bold ${expiringSoon > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
            {expiringSoon} 件
          </p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">低利用 (削減候補)</p>
          <p className={`mt-1 text-xl font-bold ${underUtilized > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
            {underUtilized} 件
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
            {vendors.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    条件に一致するライセンスが見つかりません
                  </td>
                </tr>
              ) : (
                filtered.map((lic) => {
                  const usageRate = Math.round((lic.used / lic.total) * 100);
                  const monthlyCost = lic.costPerLicense * lic.total;
                  const expiry = formatExpiry(lic.expiryDate);
                  return (
                    <tr key={lic.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {lic.name}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {lic.vendor}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {lic.type}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        <span className={lic.used > lic.total ? 'font-semibold text-red-600 dark:text-red-400' : ''}>
                          {lic.used}
                        </span>
                        <span className="text-gray-400"> / {lic.total}</span>
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
                        <Badge variant={statusConfig[lic.status].variant} dot size="sm">
                          {statusConfig[lic.status].label}
                        </Badge>
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
            {filtered.length} 件表示 / 全 {licenses.length} 件
          </p>
        </div>
      </div>
    </div>
  );
}
