'use client';

import Link from 'next/link';
import { useState, useCallback } from 'react';
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

// ライフサイクルステップ（申請→承認→発注→納品→完了）
const LIFECYCLE_STEPS: ProcurementStatus[] = ['submitted', 'approved', 'ordered', 'delivered', 'completed'];

function formatCost(cost: number): string {
  return `¥${cost.toLocaleString('ja-JP')}`;
}

function LifecycleStepper({ status }: { status: ProcurementStatus }) {
  if (status === 'draft' || status === 'rejected') return null;
  const currentIndex = LIFECYCLE_STEPS.indexOf(status);
  const stepLabels: Record<ProcurementStatus, string> = {
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
  id: string;
  title: string;
  action: 'approve' | 'reject';
}

export default function ProcurementPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProcurementStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<ProcurementPriority | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [statuses, setStatuses] = useState<Record<string, ProcurementStatus>>(
    Object.fromEntries(demoRequests.map((r) => [r.id, r.status]))
  );
  const [modal, setModal] = useState<ApprovalModal | null>(null);
  const [comment, setComment] = useState('');

  const handleApprovalConfirm = useCallback(() => {
    if (!modal) return;
    setStatuses((prev) => ({
      ...prev,
      [modal.id]: modal.action === 'approve' ? 'approved' : 'rejected',
    }));
    setModal(null);
    setComment('');
  }, [modal]);

  const requests = demoRequests.map((r) => ({ ...r, status: statuses[r.id] ?? r.status }));

  const categories = Array.from(new Set(demoRequests.map((r) => r.category))).sort();

  const filtered = requests.filter((req) => {
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

  // Summary counts (reactive to local approval state)
  const totalBudget = requests
    .filter((r) => ['approved', 'ordered', 'delivered', 'completed'].includes(r.status))
    .reduce((sum, r) => sum + r.cost, 0);
  const pendingCount = requests.filter((r) => r.status === 'submitted').length;
  const urgentCount = requests.filter((r) => r.priority === 'urgent' && !['rejected', 'completed'].includes(r.status)).length;

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
                {['申請番号', 'タイトル', 'カテゴリ', '申請者', '見積額', '優先度', 'ステータス', '申請日', 'アクション'].map((h) => (
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
                            onClick={() => { setModal({ id: req.id, title: req.title, action: 'approve' }); setComment(''); }}
                          >
                            承認
                          </button>
                          <button
                            className="rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                            onClick={() => { setModal({ id: req.id, title: req.title, action: 'reject' }); setComment(''); }}
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
                  <td colSpan={9} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
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
              <button className="aegis-btn-secondary" onClick={() => setModal(null)}>
                キャンセル
              </button>
              <button
                className={modal.action === 'approve' ? 'aegis-btn-primary' : 'rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700'}
                onClick={handleApprovalConfirm}
              >
                {modal.action === 'approve' ? '承認する' : '却下する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
