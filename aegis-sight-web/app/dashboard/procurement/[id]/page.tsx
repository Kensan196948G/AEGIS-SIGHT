'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import {
  fetchProcurementById,
  submitProcurementRequest,
  approveProcurementRequest,
  rejectProcurementRequest,
  orderProcurementRequest,
  receiveProcurementRequest,
} from '@/lib/api';
import type { BackendProcurementResponse } from '@/lib/api';

type FrontendStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'ordered'
  | 'delivered'
  | 'completed';

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

const statusConfig: Record<FrontendStatus, {
  label: string;
  variant: 'default' | 'info' | 'success' | 'danger' | 'warning' | 'purple';
}> = {
  draft:     { label: '下書き', variant: 'default' },
  submitted: { label: '申請中', variant: 'info' },
  approved:  { label: '承認済', variant: 'success' },
  rejected:  { label: '却下',   variant: 'danger' },
  ordered:   { label: '発注済', variant: 'purple' },
  delivered: { label: '納品済', variant: 'success' },
  completed: { label: '完了',   variant: 'default' },
};

const allStatuses: FrontendStatus[] = [
  'draft', 'submitted', 'approved', 'ordered', 'delivered', 'completed',
];

const categoryLabel: Record<string, string> = {
  hardware:   'ハードウェア',
  software:   'ソフトウェア',
  service:    'サービス',
  consumable: '消耗品',
};

type ActionType = 'submit' | 'approve' | 'reject' | 'order' | 'receive';

interface ActionConfig {
  label: string;
  action: ActionType;
  variant: 'primary' | 'danger' | 'secondary';
}

const nextActions: Record<FrontendStatus, ActionConfig[]> = {
  draft:     [{ label: '申請提出', action: 'submit',  variant: 'primary' }],
  submitted: [
    { label: '承認する', action: 'approve', variant: 'primary' },
    { label: '却下する', action: 'reject',  variant: 'danger' },
  ],
  approved:  [{ label: '発注済みにする', action: 'order',   variant: 'primary' }],
  ordered:   [{ label: '納品済みにする', action: 'receive', variant: 'primary' }],
  delivered: [],
  rejected:  [],
  completed: [],
};

export default function ProcurementDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? '');

  const [data, setData] = useState<BackendProcurementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);

  const [modal, setModal] = useState<{ action: ActionType; label: string } | null>(null);
  const [comment, setComment] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchProcurementById(id);
      setData(res);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function executeAction(action: ActionType) {
    if (!data) return;
    setActionInProgress(true);
    setActionError(null);
    try {
      switch (action) {
        case 'submit':  await submitProcurementRequest(data.id);  break;
        case 'approve': await approveProcurementRequest(data.id); break;
        case 'reject':  await rejectProcurementRequest(data.id);  break;
        case 'order':   await orderProcurementRequest(data.id);   break;
        case 'receive': await receiveProcurementRequest(data.id); break;
      }
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '操作に失敗しました');
    } finally {
      setActionInProgress(false);
      setModal(null);
      setComment('');
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="h-10 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="aegis-card animate-pulse space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-4 rounded bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-aegis-surface dark:hover:text-gray-300"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">申請が見つかりません</h1>
        </div>
        <div className="aegis-card py-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            申請ID <span className="font-mono font-semibold">{id}</span> は存在しません。
          </p>
        </div>
      </div>
    );
  }

  const frontendStatus = statusMap[data.status] ?? 'draft';
  const currentStepIndex = allStatuses.indexOf(frontendStatus);
  const actions = nextActions[frontendStatus] ?? [];
  const totalPrice = parseFloat(data.total_price);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-aegis-surface dark:hover:text-gray-300"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {data.request_number}
              </h1>
              <Badge variant={statusConfig[frontendStatus].variant} size="md">
                {statusConfig[frontendStatus].label}
              </Badge>
            </div>
            <p className="mt-1 text-lg text-gray-700 dark:text-gray-300">
              {data.item_name}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {actions.map(({ label, action, variant }) => (
            <button
              key={action}
              disabled={actionInProgress}
              onClick={() => { setModal({ action, label }); setComment(''); }}
              className={
                variant === 'danger'
                  ? 'aegis-btn-secondary text-red-600 disabled:opacity-50'
                  : 'aegis-btn-primary disabled:opacity-50'
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {actionError}
        </div>
      )}

      {/* Status Progress */}
      <div className="aegis-card">
        <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">ステータス進捗</h2>
        <div className="flex items-center">
          {allStatuses
            .filter((s) => s !== 'rejected')
            .map((status, index, arr) => {
              const stepIndex = allStatuses.indexOf(status);
              const isCompleted = stepIndex <= currentStepIndex;
              const isCurrent = status === frontendStatus;
              return (
                <div key={status} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors ${
                        isCompleted
                          ? 'border-primary-600 bg-primary-600 text-white'
                          : isCurrent
                          ? 'border-primary-600 bg-white text-primary-600 dark:bg-aegis-dark'
                          : 'border-gray-300 bg-white text-gray-400 dark:border-gray-600 dark:bg-aegis-dark'
                      }`}
                    >
                      {isCompleted && !isCurrent ? (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span className={`mt-1.5 text-[10px] font-medium ${
                      isCompleted ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'
                    }`}>
                      {statusConfig[status].label}
                    </span>
                  </div>
                  {index < arr.length - 1 && (
                    <div
                      className={`mx-1 h-0.5 flex-1 ${
                        stepIndex < currentStepIndex
                          ? 'bg-primary-600'
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                  )}
                </div>
              );
            })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Details */}
        <div className="space-y-6 lg:col-span-2">
          {/* Purpose */}
          <div className="aegis-card">
            <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">調達目的</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              {data.purpose}
            </p>
          </div>

          {/* Item Table */}
          <div className="aegis-card overflow-hidden p-0">
            <div className="border-b border-gray-200 px-6 py-3 dark:border-aegis-border">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">品目明細</h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50 dark:border-aegis-border dark:bg-aegis-dark/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">品目</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">数量</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">単価</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">小計</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    {data.item_name}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                    {data.quantity}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                    {parseFloat(data.unit_price).toLocaleString()}円
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900 dark:text-white">
                    {totalPrice.toLocaleString()}円
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 dark:border-aegis-border">
                  <td colSpan={3} className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    合計
                  </td>
                  <td className="px-6 py-4 text-right text-lg font-bold text-primary-600 dark:text-primary-400">
                    {totalPrice.toLocaleString()}円
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Right: Info */}
        <div className="space-y-6">
          <div className="aegis-card">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">申請情報</h2>
            <dl className="space-y-3">
              {[
                { label: '申請番号', value: data.request_number },
                { label: '部門', value: data.department },
                { label: 'カテゴリ', value: categoryLabel[data.category] ?? data.category },
                { label: '作成日時', value: new Date(data.created_at).toLocaleString('ja-JP') },
                { label: '更新日時', value: new Date(data.updated_at).toLocaleString('ja-JP') },
              ].map((info) => (
                <div key={info.label} className="flex justify-between gap-4">
                  <dt className="shrink-0 text-xs text-gray-500 dark:text-gray-400">{info.label}</dt>
                  <dd className="text-right text-sm font-medium text-gray-900 dark:text-white">{info.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Quick Timeline derived from status */}
          <div className="aegis-card">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">イベント</h2>
            <div className="space-y-0">
              {[
                { event: '申請作成', date: data.created_at },
                ...(data.status !== 'draft'
                  ? [{ event: '申請提出', date: data.updated_at }]
                  : []),
                ...((['approved', 'rejected', 'ordered', 'received', 'registered', 'active'].includes(data.status))
                  ? [{ event: statusConfig[frontendStatus].label, date: data.updated_at }]
                  : []),
              ].map((ev, i, arr) => (
                <div key={i} className="relative flex gap-3 pb-6 last:pb-0">
                  {i < arr.length - 1 && (
                    <div className="absolute left-[11px] top-6 h-full w-0.5 bg-gray-200 dark:bg-gray-700" />
                  )}
                  <div className="relative z-10 mt-1 h-6 w-6 shrink-0">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary-500 bg-white dark:bg-aegis-dark">
                      <div className="h-2 w-2 rounded-full bg-primary-500" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{ev.event}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {new Date(ev.date).toLocaleString('ja-JP')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Confirmation Modal */}
      <Modal
        isOpen={modal !== null}
        onClose={() => setModal(null)}
        title="操作の確認"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-semibold text-gray-900 dark:text-white">「{data.item_name}」</span>
            に対して
            <span className="mx-1 font-semibold text-primary-600 dark:text-primary-400">
              {modal?.label}
            </span>
            を実行しますか?
          </p>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              コメント（任意）
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="理由やコメントを入力"
              className="aegis-input resize-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setModal(null)} className="aegis-btn-secondary">
              キャンセル
            </button>
            <button
              disabled={actionInProgress}
              onClick={() => modal && executeAction(modal.action)}
              className="aegis-btn-primary disabled:opacity-50"
            >
              {actionInProgress ? '処理中...' : '確定'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
