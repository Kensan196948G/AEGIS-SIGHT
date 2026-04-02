'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

type ProcurementStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'ordered' | 'delivered' | 'completed';
type ProcurementPriority = 'low' | 'medium' | 'high' | 'urgent';

interface ProcurementRequest {
  id: string;
  title: string;
  requester: string;
  dept: string;
  cost: number;
  priority: ProcurementPriority;
  status: ProcurementStatus;
  submitted_at: string;
  category: string;
}

const demoRequests: ProcurementRequest[] = [
  { id: 'PR-2026-001', title: 'Dell Latitude 5540 x 20台', requester: '田中 太郎', dept: 'エンジニアリング', cost: 3200000, priority: 'high', status: 'approved', submitted_at: '2026-03-15', category: 'ハードウェア' },
  { id: 'PR-2026-002', title: 'Adobe CC ライセンス追加 10本', requester: '佐藤 花子', dept: 'デザイン', cost: 720000, priority: 'medium', status: 'submitted', submitted_at: '2026-03-20', category: 'ソフトウェア' },
  { id: 'PR-2026-003', title: 'Cisco Catalyst 9300 スイッチ', requester: '山田 次郎', dept: 'インフラ', cost: 1500000, priority: 'high', status: 'submitted', submitted_at: '2026-03-22', category: 'ネットワーク' },
  { id: 'PR-2026-004', title: '27インチ 4K モニター x 15台', requester: '鈴木 一郎', dept: '営業', cost: 900000, priority: 'low', status: 'draft', submitted_at: '2026-03-25', category: '周辺機器' },
  { id: 'PR-2026-005', title: 'Microsoft 365 E5 アップグレード', requester: '高橋 美咲', dept: 'IT管理', cost: 2400000, priority: 'medium', status: 'ordered', submitted_at: '2026-03-10', category: 'ソフトウェア' },
  { id: 'PR-2026-006', title: 'HP EliteBook 840 G10 x 5台', requester: '中村 健太', dept: '経理', cost: 750000, priority: 'medium', status: 'delivered', submitted_at: '2026-03-01', category: 'ハードウェア' },
  { id: 'PR-2026-007', title: 'Fortinet FortiGate 60F', requester: '小林 真一', dept: 'インフラ', cost: 480000, priority: 'urgent', status: 'approved', submitted_at: '2026-03-28', category: 'セキュリティ' },
  { id: 'PR-2026-008', title: 'Epson エコタンク複合機 x 3台', requester: '松本 あかね', dept: '総務', cost: 210000, priority: 'low', status: 'rejected', submitted_at: '2026-03-18', category: '周辺機器' },
  { id: 'PR-2026-009', title: 'VMware vSphere 8 ライセンス', requester: '渡辺 剛', dept: 'インフラ', cost: 1800000, priority: 'high', status: 'completed', submitted_at: '2026-02-20', category: 'ソフトウェア' },
  { id: 'PR-2026-010', title: 'iPad Pro 12.9" + Apple Pencil x 10台', requester: '伊藤 沙織', dept: '建設現場', cost: 1600000, priority: 'medium', status: 'submitted', submitted_at: '2026-03-30', category: 'モバイル' },
];

const statusConfig: Record<ProcurementStatus, { variant: 'success' | 'warning' | 'danger' | 'info' | 'default' | 'purple'; label: string }> = {
  draft:     { variant: 'default',  label: '下書き' },
  submitted: { variant: 'info',     label: '申請中' },
  approved:  { variant: 'success',  label: '承認済' },
  rejected:  { variant: 'danger',   label: '却下' },
  ordered:   { variant: 'purple',   label: '発注済' },
  delivered: { variant: 'success',  label: '納品済' },
  completed: { variant: 'default',  label: '完了' },
};

const priorityConfig: Record<ProcurementPriority, { color: string; label: string }> = {
  low:    { color: 'text-gray-500 dark:text-gray-400',             label: '低' },
  medium: { color: 'text-amber-600 dark:text-amber-400',           label: '中' },
  high:   { color: 'text-red-600 dark:text-red-400',               label: '高' },
  urgent: { color: 'text-red-700 dark:text-red-300 font-bold',     label: '緊急' },
};

const ITEMS_PER_PAGE = 8;

function formatCost(cost: number): string {
  return `¥${cost.toLocaleString('ja-JP')}`;
}

export default function ProcurementPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProcurementStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<ProcurementPriority | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const categories = Array.from(new Set(demoRequests.map((r) => r.category))).sort();

  const filtered = demoRequests.filter((req) => {
    const matchesSearch =
      search === '' ||
      req.title.toLowerCase().includes(search.toLowerCase()) ||
      req.requester.toLowerCase().includes(search.toLowerCase()) ||
      req.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || req.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'all' || req.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setCategoryFilter('all');
    setCurrentPage(1);
  };

  const hasFilters = search || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all';

  // Summary counts
  const totalBudget = demoRequests
    .filter((r) => ['approved', 'ordered', 'delivered', 'completed'].includes(r.status))
    .reduce((sum, r) => sum + r.cost, 0);
  const pendingCount = demoRequests.filter((r) => r.status === 'submitted').length;
  const urgentCount = demoRequests.filter((r) => r.priority === 'urgent' && !['rejected', 'completed'].includes(r.status)).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">調達管理</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            IT機器・ソフトウェアの調達申請・承認・ライフサイクル管理
          </p>
        </div>
        <Link href="/dashboard/procurement/new" className="aegis-btn-primary">
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          新規申請
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="aegis-card text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">総申請数</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{demoRequests.length}</p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">承認待ち</p>
          <p className="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-400">{pendingCount}</p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">緊急対応</p>
          <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">{urgentCount}</p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">承認済み予算</p>
          <p className="mt-2 text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCost(totalBudget)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="aegis-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[200px] flex-1">
            <input
              type="text"
              placeholder="申請番号、タイトル、申請者で検索..."
              className="aegis-input"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <select
            className="aegis-input w-auto"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as ProcurementStatus | 'all'); setCurrentPage(1); }}
          >
            <option value="all">すべてのステータス</option>
            {(Object.keys(statusConfig) as ProcurementStatus[]).map((s) => (
              <option key={s} value={s}>{statusConfig[s].label}</option>
            ))}
          </select>
          <select
            className="aegis-input w-auto"
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value as ProcurementPriority | 'all'); setCurrentPage(1); }}
          >
            <option value="all">すべての優先度</option>
            {(Object.keys(priorityConfig) as ProcurementPriority[]).map((p) => (
              <option key={p} value={p}>{priorityConfig[p].label}</option>
            ))}
          </select>
          <select
            className="aegis-input w-auto"
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="all">すべてのカテゴリ</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {hasFilters && (
            <button className="aegis-btn-secondary text-sm" onClick={resetFilters}>
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
                {['申請番号', 'タイトル', 'カテゴリ', '申請者', '見積額', '優先度', 'ステータス', '申請日'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
              {paginated.length > 0 ? paginated.map((req) => {
                const { variant, label: statusLabel } = statusConfig[req.status];
                const { color, label: priorityLabel } = priorityConfig[req.priority];
                return (
                  <tr
                    key={req.id}
                    className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-aegis-dark/30"
                    onClick={() => { window.location.href = `/dashboard/procurement/${req.id}`; }}
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <Link
                        href={`/dashboard/procurement/${req.id}`}
                        className="font-mono text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {req.id}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {req.title}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {req.category}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {req.requester}
                      <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">({req.dept})</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium tabular-nums text-gray-900 dark:text-white">
                      {formatCost(req.cost)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`text-sm font-semibold ${color}`}>{priorityLabel}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <Badge variant={variant} dot size="sm">{statusLabel}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {req.submitted_at}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    条件に一致する申請が見つかりません
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
