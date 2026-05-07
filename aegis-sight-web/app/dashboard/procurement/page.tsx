'use client';

import Link from 'next/link';
import { useState, useCallback, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { DonutChart, BarChart } from '@/components/ui/chart';
import {
  fetchProcurementList,
  approveProcurementRequest,
  rejectProcurementRequest,
} from '@/lib/api';
import type { BackendProcurementResponse } from '@/lib/api';

type FrontendStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'ordered' | 'delivered' | 'completed';

interface DisplayRequest {
  backendId: string;
  id: string;
  title: string;
  dept: string;
  cost: number;
  status: FrontendStatus;
  submitted_at: string;
  category: string;
}

const statusMap: Record<string, FrontendStatus> = {
  draft: 'draft',
  submitted: 'submitted',
  approved: 'approved',
  rejected: 'rejected',
  ordered: 'ordered',
  received: 'delivered',
  registered: 'completed',
  active: 'completed',
  disposal_requested: 'completed',
  disposed: 'completed',
};

function mapToDisplay(r: BackendProcurementResponse): DisplayRequest {
  return {
    backendId: r.id,
    id: r.request_number,
    title: r.item_name,
    dept: r.department,
    cost: parseFloat(r.total_price),
    status: statusMap[r.status] ?? 'draft',
    submitted_at: r.created_at.split('T')[0] ?? r.created_at,
    category: r.category,
  };
}

const statusConfig: Record<FrontendStatus, { variant: 'success' | 'warning' | 'danger' | 'info' | 'default' | 'purple'; label: string }> = {
  draft:     { variant: 'default',  label: '下書き' },
  submitted: { variant: 'info',     label: '申請中' },
  approved:  { variant: 'success',  label: '承認済' },
  rejected:  { variant: 'danger',   label: '却下' },
  ordered:   { variant: 'purple',   label: '発注済' },
  delivered: { variant: 'success',  label: '納品済' },
  completed: { variant: 'default',  label: '完了' },
};

const categoryLabel: Record<string, string> = {
  hardware:    'ハードウェア',
  software:    'ソフトウェア',
  service:     'サービス',
  consumable:  '消耗品',
};

const ITEMS_PER_PAGE = 8;

const LIFECYCLE_STEPS: FrontendStatus[] = ['submitted', 'approved', 'ordered', 'delivered', 'completed'];

function formatCost(cost: number): string {
  return `¥${cost.toLocaleString('ja-JP')}`;
}

function LifecycleStepper({ status }: { status: FrontendStatus }) {
  if (status === 'draft' || status === 'rejected') return null;
  const currentIndex = LIFECYCLE_STEPS.indexOf(status);
  const stepLabels: Record<FrontendStatus, string> = {
    submitted: '申請', approved: '承認', ordered: '発注', delivered: '納品', completed: '完了',
    draft: '', rejected: '',
  };
  return (
    <div className="flex items-center gap-0.5">
      {LIFECYCLE_STEPS.map((step, i) => {
        const isDone    = i < currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <div key={step} className="flex items-center">
            <div
              title={stepLabels[step]}
              className={`h-2 w-2 rounded-full ${
                isDone ? 'bg-emerald-500' : isCurrent ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
            {i < LIFECYCLE_STEPS.length - 1 && (
              <div className={`h-0.5 w-3 ${isDone ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface ApprovalModal {
  backendId: string;
  title: string;
  action: 'approve' | 'reject';
}

export default function ProcurementPage() {
  const [requests, setRequests] = useState<DisplayRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FrontendStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const [modal, setModal] = useState<ApprovalModal | null>(null);
  const [comment, setComment] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const backendStatus = statusFilter !== 'all'
        ? Object.entries(statusMap).find(([, v]) => v === statusFilter)?.[0]
        : undefined;
      const data = await fetchProcurementList(0, 200, backendStatus);
      setRequests(data.items.map(mapToDisplay));
      setTotal(data.total);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setCurrentPage(1); }, [statusFilter, search, categoryFilter]);

  const handleApprovalConfirm = useCallback(async () => {
    if (!modal) return;
    setActionInProgress(true);
    try {
      if (modal.action === 'approve') {
        await approveProcurementRequest(modal.backendId);
      } else {
        await rejectProcurementRequest(modal.backendId);
      }
      setModal(null);
      setComment('');
      await load();
    } finally {
      setActionInProgress(false);
    }
  }, [modal, load]);

  const categories = Array.from(new Set(requests.map((r) => r.category))).sort();

  const filtered = requests.filter((req) => {
    const matchesSearch =
      search === '' ||
      req.title.toLowerCase().includes(search.toLowerCase()) ||
      req.id.toLowerCase().includes(search.toLowerCase()) ||
      req.dept.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || req.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setCurrentPage(1);
  };

  const hasFilters = search || statusFilter !== 'all' || categoryFilter !== 'all';

  const totalBudget = requests
    .filter((r) => ['approved', 'ordered', 'delivered', 'completed'].includes(r.status))
    .reduce((sum, r) => sum + r.cost, 0);
  const pendingCount = requests.filter((r) => r.status === 'submitted').length;
  const completedCount = requests.filter((r) => ['delivered', 'completed'].includes(r.status)).length;
  const approvalRate = requests.length > 0 ? Math.round((completedCount / requests.length) * 100) : 0;
  const approvalColor = approvalRate >= 60 ? '#10b981' : approvalRate >= 40 ? '#f59e0b' : '#ef4444';

  const categoryCounts: Record<string, number> = {};
  requests.forEach((r) => { categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1; });
  const categoryBarData = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, count], i) => ({
      label: categoryLabel[cat] ?? cat,
      value: count,
      color: ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-red-500', 'bg-teal-500'][i] ?? 'bg-gray-400',
    }));

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

      {/* 調達概要チャート */}
      <div className="aegis-card">
        <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">調達概要</h2>
        {loading ? (
          <div className="animate-pulse h-40 rounded bg-gray-100 dark:bg-gray-800" />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">完了率</p>
              <DonutChart value={approvalRate} max={100} size={140} strokeWidth={14} color={approvalColor} label={`${approvalRate}%`} />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                全 {requests.length} 件中 {completedCount} 件完了
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">カテゴリ別申請件数</p>
              {categoryBarData.length > 0 ? (
                <BarChart
                  data={categoryBarData}
                  maxValue={Math.max(...categoryBarData.map((d) => d.value))}
                  height={160}
                  showValues
                />
              ) : (
                <p className="text-sm text-gray-400">データがありません</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="aegis-card text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">総申請数</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {loading ? '—' : total.toLocaleString()}
          </p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">承認待ち</p>
          <p className="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-400">
            {loading ? '—' : pendingCount}
          </p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">完了件数</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {loading ? '—' : completedCount}
          </p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">承認済み予算</p>
          <p className="mt-2 text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {loading ? '—' : formatCost(totalBudget)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="aegis-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[200px] flex-1">
            <input
              type="text"
              placeholder="申請番号、タイトル、部門で検索..."
              className="aegis-input"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <select
            className="aegis-input w-auto"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as FrontendStatus | 'all'); setCurrentPage(1); }}
          >
            <option value="all">すべてのステータス</option>
            {(Object.keys(statusConfig) as FrontendStatus[]).map((s) => (
              <option key={s} value={s}>{statusConfig[s].label}</option>
            ))}
          </select>
          <select
            className="aegis-input w-auto"
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="all">すべてのカテゴリ</option>
            {categories.map((c) => (
              <option key={c} value={c}>{categoryLabel[c] ?? c}</option>
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
                {['申請番号', 'タイトル', 'カテゴリ', '部門', '見積額', 'ステータス', '申請日', 'アクション'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(8)].map((__, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 rounded bg-gray-200 dark:bg-gray-700" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length > 0 ? paginated.map((req) => {
                const { variant, label: statusLabel } = statusConfig[req.status];
                return (
                  <tr
                    key={req.backendId}
                    className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-aegis-dark/30"
                    onClick={() => { window.location.href = `/dashboard/procurement/${req.backendId}`; }}
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <Link
                        href={`/dashboard/procurement/${req.backendId}`}
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
                      {categoryLabel[req.category] ?? req.category}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {req.dept}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium tabular-nums text-gray-900 dark:text-white">
                      {formatCost(req.cost)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <Badge variant={variant} dot size="sm">{statusLabel}</Badge>
                        <LifecycleStepper status={req.status} />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {req.submitted_at}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      {req.status === 'submitted' && (
                        <div className="flex gap-1">
                          <button
                            className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40"
                            onClick={() => { setModal({ backendId: req.backendId, title: req.title, action: 'approve' }); setComment(''); }}
                          >
                            承認
                          </button>
                          <button
                            className="rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                            onClick={() => { setModal({ backendId: req.backendId, title: req.title, action: 'reject' }); setComment(''); }}
                          >
                            却下
                          </button>
                        </div>
                      )}
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
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((page) => (
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

      {/* Approval / Rejection Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-aegis-surface">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {modal.action === 'approve' ? '申請を承認しますか？' : '申請を却下しますか？'}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{modal.title}</p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                コメント（任意）
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder={modal.action === 'approve' ? '承認理由を入力...' : '却下理由を入力...'}
                className="aegis-input mt-1 resize-none"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="aegis-btn-secondary" onClick={() => setModal(null)} disabled={actionInProgress}>
                キャンセル
              </button>
              <button
                className={modal.action === 'approve' ? 'aegis-btn-primary disabled:opacity-60' : 'rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60'}
                onClick={handleApprovalConfirm}
                disabled={actionInProgress}
              >
                {actionInProgress ? '処理中...' : modal.action === 'approve' ? '承認する' : '却下する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
