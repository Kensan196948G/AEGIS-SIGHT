'use client';

import Link from 'next/link';
import { DonutChart, BarChart } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { useSamLicenses } from '@/lib/hooks/use-sam-licenses';
import { computeStatus, getSamDonutColor } from '@/lib/utils/sam';
import type { SamLicense } from '@/lib/types';

export { getSamDonutColor };

function buildStats(licenses: SamLicense[]) {
  const totalItems      = licenses.length;
  const compliantCount  = licenses.filter(l => computeStatus(l) === 'compliant').length;
  const overDeployed    = licenses.filter(l => computeStatus(l) === 'over-deployed').length;
  const underUtilized   = licenses.filter(l => computeStatus(l) === 'under-utilized').length;
  const expiringSoon    = licenses.filter(l => computeStatus(l) === 'expiring-soon').length;
  const complianceRate  = totalItems > 0 ? Math.round((compliantCount / totalItems) * 100) : 0;
  const totalMonthlyCost = licenses.reduce((sum, l) => sum + (l.cost_per_unit ?? 0) * l.purchased_count, 0);
  const vendorCosts = Object.entries(
    licenses.reduce<Record<string, number>>((acc, l) => {
      acc[l.vendor] = (acc[l.vendor] ?? 0) + (l.cost_per_unit ?? 0) * l.purchased_count;
      return acc;
    }, {})
  )
    .map(([vendor, cost]) => ({ label: vendor, value: Math.round(cost / 10000) }))
    .sort((a, b) => b.value - a.value);
  return { totalItems, compliantCount, overDeployed, underUtilized, expiringSoon, complianceRate, totalMonthlyCost, vendorCosts };
}

function SkeletonCard() {
  return (
    <div className="animate-pulse aegis-card flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div className="h-36 w-36 rounded-full bg-gray-200 dark:bg-gray-700" />
      <div className="flex-1 space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-4 rounded bg-gray-200 dark:bg-gray-700" />
        ))}
      </div>
    </div>
  );
}

export default function SAMPage() {
  const { licenses, loading, error, refetch } = useSamLicenses();

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SAM - ソフトウェア資産管理</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">ライセンスコンプライアンスと最適化</p>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SkeletonCard />
          <div className="animate-pulse aegis-card h-64 bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SAM - ソフトウェア資産管理</h1>
        </div>
        <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          <button
            onClick={refetch}
            className="mt-2 text-sm font-medium text-red-600 underline dark:text-red-400"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  const { totalItems, compliantCount, overDeployed, underUtilized, expiringSoon, complianceRate, totalMonthlyCost, vendorCosts } = buildStats(licenses);
  const donutColor = getSamDonutColor(complianceRate);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          SAM - ソフトウェア資産管理
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          ライセンスコンプライアンスと最適化
        </p>
      </div>

      {/* Overview: DonutChart + Stats */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Compliance Donut */}
        <div className="aegis-card flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="flex flex-col items-center">
            <DonutChart
              value={complianceRate}
              max={100}
              size={140}
              strokeWidth={14}
              color={donutColor}
              label={`${complianceRate}%`}
            />
            <p className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              ライセンス遵守率
            </p>
          </div>
          <div className="flex-1 space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">ステータス内訳</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <Badge variant="success" dot size="sm">準拠</Badge>
                <span className="font-semibold text-gray-900 dark:text-white">{compliantCount} 件</span>
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="danger" dot size="sm">超過</Badge>
                <span className="font-semibold text-red-600 dark:text-red-400">{overDeployed} 件</span>
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="warning" dot size="sm">低利用</Badge>
                <span className="font-semibold text-amber-600 dark:text-amber-400">{underUtilized} 件</span>
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="warning" dot size="sm">期限間近</Badge>
                <span className="font-semibold text-amber-600 dark:text-amber-400">{expiringSoon} 件</span>
              </div>
            </div>
            <p className="pt-2 text-xs text-gray-400 dark:text-gray-500">
              全 {totalItems} 製品 / 月額総コスト ¥{totalMonthlyCost.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Vendor Cost BarChart */}
        <div className="aegis-card">
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
            ベンダー別月額コスト（万円）
          </h2>
          {vendorCosts.length > 0 ? (
            <BarChart
              data={vendorCosts.map((v) => ({
                label: v.label,
                value: v.value,
                color: 'bg-primary-500',
              }))}
              maxValue={Math.max(...vendorCosts.map(v => v.value)) + 10}
              showValues
              className="h-48"
            />
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">データなし</p>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link
          href="/dashboard/sam/licenses"
          className="aegis-card group flex items-center gap-4 transition-all hover:border-primary-300 dark:hover:border-primary-700"
        >
          <div className="rounded-xl bg-primary-100 p-3 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-400">
              ライセンス一覧
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              全ライセンスの管理と状態確認
            </p>
          </div>
          <svg className="ml-auto h-5 w-5 text-gray-400 group-hover:text-primary-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </Link>

        <Link
          href="/dashboard/sam/compliance"
          className="aegis-card group flex items-center gap-4 transition-all hover:border-primary-300 dark:hover:border-primary-700"
        >
          <div className="rounded-xl bg-red-100 p-3 text-red-600 dark:bg-red-900/30 dark:text-red-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-400">
              コンプライアンスチェック
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              超過・低利用ライセンスの検出
            </p>
          </div>
          <svg className="ml-auto h-5 w-5 text-gray-400 group-hover:text-primary-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </Link>

        <Link
          href="/dashboard/sam/reports"
          className="aegis-card group flex items-center gap-4 transition-all hover:border-primary-300 dark:hover:border-primary-700"
        >
          <div className="rounded-xl bg-amber-100 p-3 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-400">
              SAMレポート
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              J-SOXレポート出力
            </p>
          </div>
          <svg className="ml-auto h-5 w-5 text-gray-400 group-hover:text-primary-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
