'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { DonutChart, BarChart } from '@/components/ui/chart';

type AssetType = 'hardware' | 'software' | 'network' | 'peripheral';
type AssetStatus = 'active' | 'inactive' | 'maintenance' | 'retired';

interface Asset {
  id: string;
  name: string;
  type: AssetType;
  category: string;
  serial_number: string;
  assigned_to: string;
  department: string;
  location: string;
  status: AssetStatus;
  purchase_date: string;
  warranty_expiry: string;
  last_audited: string;
}

const demoAssets: Asset[] = [
  {
    id: 'a001',
    name: 'ThinkPad X1 Carbon Gen11',
    type: 'hardware',
    category: 'ノートPC',
    serial_number: 'PF3A2B1C',
    assigned_to: '田中 一郎',
    department: 'エンジニアリング',
    location: '本社 3F',
    status: 'active',
    purchase_date: '2023-04-01',
    warranty_expiry: '2026-03-31',
    last_audited: '2026-04-01',
  },
  {
    id: 'a002',
    name: 'Dell OptiPlex 7090',
    type: 'hardware',
    category: 'デスクトップPC',
    serial_number: 'DL7090X2',
    assigned_to: '佐藤 花子',
    department: '営業',
    location: '本社 2F',
    status: 'active',
    purchase_date: '2022-10-15',
    warranty_expiry: '2025-10-14',
    last_audited: '2026-03-28',
  },
  {
    id: 'a003',
    name: 'HP EliteDesk 800 G9',
    type: 'hardware',
    category: 'デスクトップPC',
    serial_number: 'HP800G9A3',
    assigned_to: '（共有）',
    department: '人事',
    location: '本社 4F',
    status: 'maintenance',
    purchase_date: '2023-01-20',
    warranty_expiry: '2026-01-19',
    last_audited: '2026-03-25',
  },
  {
    id: 'a004',
    name: 'Cisco Catalyst 2960-X',
    type: 'network',
    category: 'スイッチ',
    serial_number: 'CSC2960X4',
    assigned_to: '（インフラ共有）',
    department: 'インフラ',
    location: 'サーバルーム B1',
    status: 'active',
    purchase_date: '2021-06-01',
    warranty_expiry: '2026-05-31',
    last_audited: '2026-04-01',
  },
  {
    id: 'a005',
    name: 'Microsoft Office 2021 Pro',
    type: 'software',
    category: 'オフィスソフト',
    serial_number: 'MSOF2021-500',
    assigned_to: '（ライセンス一括）',
    department: '全部門',
    location: '-',
    status: 'active',
    purchase_date: '2021-10-05',
    warranty_expiry: '2026-10-04',
    last_audited: '2026-03-30',
  },
  {
    id: 'a006',
    name: 'HP LaserJet Pro M404n',
    type: 'peripheral',
    category: 'プリンタ',
    serial_number: 'HPC9T14A',
    assigned_to: '（共有）',
    department: '経理',
    location: '本社 1F',
    status: 'active',
    purchase_date: '2022-03-10',
    warranty_expiry: '2025-03-09',
    last_audited: '2026-03-20',
  },
  {
    id: 'a007',
    name: 'MacBook Pro 14" M3',
    type: 'hardware',
    category: 'ノートPC',
    serial_number: 'APMBP14M3',
    assigned_to: '山田 次郎',
    department: 'デザイン',
    location: '本社 3F',
    status: 'active',
    purchase_date: '2024-01-15',
    warranty_expiry: '2025-01-14',
    last_audited: '2026-04-01',
  },
  {
    id: 'a008',
    name: 'Windows Server 2022 Std',
    type: 'software',
    category: 'OS/サーバ',
    serial_number: 'WSRV2022-10',
    assigned_to: '（インフラ共有）',
    department: 'インフラ',
    location: 'サーバルーム B1',
    status: 'active',
    purchase_date: '2022-07-01',
    warranty_expiry: '2027-06-30',
    last_audited: '2026-04-01',
  },
  {
    id: 'a009',
    name: 'Dell PowerEdge R750',
    type: 'hardware',
    category: 'サーバ',
    serial_number: 'DLPE750S9',
    assigned_to: '（インフラ共有）',
    department: 'インフラ',
    location: 'サーバルーム B1',
    status: 'active',
    purchase_date: '2023-08-01',
    warranty_expiry: '2028-07-31',
    last_audited: '2026-04-01',
  },
  {
    id: 'a010',
    name: 'ThinkPad T14s Gen4',
    type: 'hardware',
    category: 'ノートPC',
    serial_number: 'PFT14S04A',
    assigned_to: '鈴木 三郎',
    department: '人事',
    location: '本社 4F',
    status: 'retired',
    purchase_date: '2020-04-01',
    warranty_expiry: '2023-03-31',
    last_audited: '2026-02-15',
  },
];

const typeLabels: Record<AssetType, string> = {
  hardware: 'ハードウェア',
  software: 'ソフトウェア',
  network: 'ネットワーク',
  peripheral: '周辺機器',
};

const statusConfig: Record<AssetStatus, { variant: 'success' | 'warning' | 'danger' | 'default'; label: string }> = {
  active: { variant: 'success', label: 'アクティブ' },
  inactive: { variant: 'default', label: '非アクティブ' },
  maintenance: { variant: 'warning', label: 'メンテナンス中' },
  retired: { variant: 'danger', label: '廃棄済み' },
};

const typeVariants: Record<AssetType, 'info' | 'purple' | 'warning' | 'default'> = {
  hardware: 'info',
  software: 'purple',
  network: 'warning',
  peripheral: 'default',
};

const ITEMS_PER_PAGE = 8;

export default function AssetsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<AssetType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AssetStatus | 'all'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const departments = Array.from(new Set(demoAssets.map((a) => a.department))).sort();

  const filtered = demoAssets.filter((asset) => {
    const matchesSearch =
      search === '' ||
      asset.name.toLowerCase().includes(search.toLowerCase()) ||
      asset.serial_number.toLowerCase().includes(search.toLowerCase()) ||
      asset.assigned_to.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || asset.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
    const matchesDept = departmentFilter === 'all' || asset.department === departmentFilter;
    return matchesSearch && matchesType && matchesStatus && matchesDept;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (setter: (v: string) => void, value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  // Summary counts
  const totalActive = demoAssets.filter((a) => a.status === 'active').length;
  const totalMaintenance = demoAssets.filter((a) => a.status === 'maintenance').length;
  const expiringSoon = demoAssets.filter((a) => {
    const expiry = new Date(a.warranty_expiry);
    const now = new Date();
    const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 90;
  }).length;

  const activeRate = Math.round((totalActive / demoAssets.length) * 100);
  const activeRateColor = activeRate >= 80 ? '#10b981' : activeRate >= 60 ? '#f59e0b' : '#ef4444';

  const typeCounts = demoAssets.reduce<Record<AssetType, number>>(
    (acc, a) => { acc[a.type]++; return acc; },
    { hardware: 0, software: 0, network: 0, peripheral: 0 }
  );
  const typeBarData = [
    { label: 'ハードウェア', value: typeCounts.hardware, color: 'bg-blue-500'    },
    { label: 'ソフトウェア', value: typeCounts.software, color: 'bg-purple-500'  },
    { label: 'ネットワーク', value: typeCounts.network,  color: 'bg-amber-500'   },
    { label: '周辺機器',     value: typeCounts.peripheral, color: 'bg-gray-400'  },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">IT資産一覧</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            管理対象のハードウェア・ソフトウェア・ネットワーク資産
          </p>
        </div>
        <button className="aegis-btn-primary">
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          資産を追加
        </button>
      </div>

      {/* Asset Overview Charts */}
      <div className="aegis-card">
        <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">資産概要</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">アクティブ率</p>
            <DonutChart
              value={activeRate}
              max={100}
              size={140}
              strokeWidth={14}
              color={activeRateColor}
              label={`${activeRate}%`}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              総資産 {demoAssets.length} 件中 {totalActive} 件アクティブ
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">種別別台数</p>
            <BarChart
              data={typeBarData}
              maxValue={demoAssets.length}
              height={160}
              showValues
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="aegis-card text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">総資産数</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{demoAssets.length}</p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">アクティブ</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">{totalActive}</p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">メンテナンス中</p>
          <p className="mt-2 text-3xl font-bold text-amber-600 dark:text-amber-400">{totalMaintenance}</p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">保証期限 90日以内</p>
          <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">{expiringSoon}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="aegis-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[200px] flex-1">
            <input
              type="text"
              placeholder="資産名、シリアル番号、担当者で検索..."
              className="aegis-input"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <select
            className="aegis-input w-auto"
            value={typeFilter}
            onChange={(e) => handleFilterChange(setTypeFilter, e.target.value)}
          >
            <option value="all">すべての種別</option>
            {(Object.keys(typeLabels) as AssetType[]).map((t) => (
              <option key={t} value={t}>{typeLabels[t]}</option>
            ))}
          </select>
          <select
            className="aegis-input w-auto"
            value={statusFilter}
            onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
          >
            <option value="all">すべてのステータス</option>
            <option value="active">アクティブ</option>
            <option value="inactive">非アクティブ</option>
            <option value="maintenance">メンテナンス中</option>
            <option value="retired">廃棄済み</option>
          </select>
          <select
            className="aegis-input w-auto"
            value={departmentFilter}
            onChange={(e) => handleFilterChange(setDepartmentFilter, e.target.value)}
          >
            <option value="all">すべての部門</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          {(search || typeFilter !== 'all' || statusFilter !== 'all' || departmentFilter !== 'all') && (
            <button
              className="aegis-btn-secondary text-sm"
              onClick={() => {
                setSearch('');
                setTypeFilter('all');
                setStatusFilter('all');
                setDepartmentFilter('all');
                setCurrentPage(1);
              }}
            >
              フィルタをリセット
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
                {['資産名', '種別', 'カテゴリ', 'シリアル番号', '担当者', '部門', '保証期限', 'ステータス'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
              {paginated.length > 0 ? paginated.map((asset) => {
                const { variant, label } = statusConfig[asset.status];
                const expiry = new Date(asset.warranty_expiry);
                const now = new Date();
                const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const warrantyClass =
                  daysLeft < 0
                    ? 'text-red-600 dark:text-red-400'
                    : daysLeft <= 90
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-gray-600 dark:text-gray-400';
                return (
                  <tr key={asset.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-aegis-dark/30">
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/assets/${asset.id}`}
                        className="font-medium text-primary-600 hover:underline dark:text-primary-400"
                      >
                        {asset.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={typeVariants[asset.type]} size="sm">
                        {typeLabels[asset.type]}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{asset.category}</td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-600 dark:text-gray-400">{asset.serial_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{asset.assigned_to}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{asset.department}</td>
                    <td className={`px-6 py-4 text-sm ${warrantyClass}`}>
                      {asset.warranty_expiry}
                      {daysLeft < 0 && <span className="ml-1 text-xs">（期限切れ）</span>}
                      {daysLeft >= 0 && daysLeft <= 90 && <span className="ml-1 text-xs">（残{daysLeft}日）</span>}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={variant} dot size="sm">{label}</Badge>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    条件に一致する資産が見つかりません
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
    </div>
  );
}
