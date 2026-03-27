'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';

// Mock data for a single procurement request
const procurementDetail = {
  id: 'PR-2024-089',
  title: 'Dell Latitude 5540 x 20台',
  description: '新入社員向けの業務用ノートPCの調達。エンジニアリング部門の増員に伴い、標準スペックのノートPCが必要。',
  requesterName: '田中太郎',
  requesterEmail: 'tanaka@aegis-sight.local',
  department: 'エンジニアリング',
  category: 'hardware' as const,
  priority: 'high' as const,
  status: 'approved' as const,
  estimatedCost: 3200000,
  currency: 'JPY',
  createdAt: '2024-03-01 10:30',
  updatedAt: '2024-03-10 15:45',
  deliveryDate: '2024-04-15',
  items: [
    { name: 'Dell Latitude 5540 (i7/16GB/512GB)', quantity: 20, unitPrice: 145000, subtotal: 2900000 },
    { name: 'Dell USB-Cドッキングステーション WD19S', quantity: 20, unitPrice: 15000, subtotal: 300000 },
  ],
  approvers: [
    { name: '鈴木部長', role: '部門長', status: 'approved' as const, date: '2024-03-05', comment: '承認します。仕様は問題ありません。' },
    { name: '山本課長', role: 'IT管理', status: 'approved' as const, date: '2024-03-08', comment: '在庫確認済み。標準構成です。' },
    { name: '佐々木取締役', role: '経営層', status: 'approved' as const, date: '2024-03-10', comment: '予算枠内。承認。' },
  ],
  timeline: [
    { date: '2024-03-01 10:30', event: '申請作成', user: '田中太郎', detail: '調達申請が作成されました' },
    { date: '2024-03-02 09:15', event: '申請提出', user: '田中太郎', detail: '承認ワークフローに提出されました' },
    { date: '2024-03-05 14:20', event: '部門長承認', user: '鈴木部長', detail: '部門長が承認しました' },
    { date: '2024-03-08 11:00', event: 'IT管理承認', user: '山本課長', detail: 'IT管理部門が承認しました' },
    { date: '2024-03-10 15:45', event: '最終承認', user: '佐々木取締役', detail: '最終承認が完了しました' },
  ],
};

type Status = 'draft' | 'submitted' | 'approved' | 'rejected' | 'ordered' | 'delivered' | 'completed';

const statusFlow: Record<Status, Status[]> = {
  draft: ['submitted'],
  submitted: ['approved', 'rejected'],
  approved: ['ordered'],
  rejected: [],
  ordered: ['delivered'],
  delivered: ['completed'],
  completed: [],
};

const statusConfig: Record<string, { label: string; variant: 'default' | 'info' | 'success' | 'danger' | 'warning' | 'purple' }> = {
  draft: { label: '下書き', variant: 'default' },
  submitted: { label: '申請中', variant: 'info' },
  approved: { label: '承認済', variant: 'success' },
  rejected: { label: '却下', variant: 'danger' },
  ordered: { label: '発注済', variant: 'purple' },
  delivered: { label: '納品済', variant: 'success' },
  completed: { label: '完了', variant: 'default' },
};

const priorityConfig: Record<string, { label: string; variant: 'default' | 'warning' | 'danger' }> = {
  low: { label: '低', variant: 'default' },
  medium: { label: '中', variant: 'warning' },
  high: { label: '高', variant: 'danger' },
  urgent: { label: '緊急', variant: 'danger' },
};

const allStatuses: Status[] = ['draft', 'submitted', 'approved', 'ordered', 'delivered', 'completed'];

export default function ProcurementDetailPage() {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState<Status>(procurementDetail.status);
  const [showModal, setShowModal] = useState(false);
  const [nextStatus, setNextStatus] = useState<Status | null>(null);

  const nextStatuses = statusFlow[currentStatus] || [];

  function handleStatusChange(status: Status) {
    setNextStatus(status);
    setShowModal(true);
  }

  function confirmStatusChange() {
    if (nextStatus) {
      setCurrentStatus(nextStatus);
    }
    setShowModal(false);
    setNextStatus(null);
  }

  const currentStepIndex = allStatuses.indexOf(currentStatus);

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
                {procurementDetail.id}
              </h1>
              <Badge variant={statusConfig[currentStatus].variant} size="md">
                {statusConfig[currentStatus].label}
              </Badge>
              <Badge variant={priorityConfig[procurementDetail.priority].variant}>
                優先度: {priorityConfig[procurementDetail.priority].label}
              </Badge>
            </div>
            <p className="mt-1 text-lg text-gray-700 dark:text-gray-300">
              {procurementDetail.title}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {nextStatuses.map((status) => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              className={status === 'rejected' ? 'aegis-btn-secondary text-red-600' : 'aegis-btn-primary'}
            >
              {statusConfig[status].label}にする
            </button>
          ))}
        </div>
      </div>

      {/* Status Progress */}
      <div className="aegis-card">
        <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
          ステータス進捗
        </h2>
        <div className="flex items-center">
          {allStatuses
            .filter((s) => s !== 'rejected')
            .map((status, index, arr) => {
              const isCompleted = allStatuses.indexOf(status) <= currentStepIndex;
              const isCurrent = status === currentStatus;

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
                        allStatuses.indexOf(status) < currentStepIndex
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
          {/* Description */}
          <div className="aegis-card">
            <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">
              申請内容
            </h2>
            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              {procurementDetail.description}
            </p>
          </div>

          {/* Items Table */}
          <div className="aegis-card overflow-hidden p-0">
            <div className="border-b border-gray-200 px-6 py-3 dark:border-aegis-border">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                品目明細
              </h2>
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
                {procurementDetail.items.map((item, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
                    <td className="px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">{item.quantity}</td>
                    <td className="px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">{item.unitPrice.toLocaleString()}円</td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-gray-900 dark:text-white">{item.subtotal.toLocaleString()}円</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 dark:border-aegis-border">
                  <td colSpan={3} className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">合計</td>
                  <td className="px-6 py-4 text-right text-lg font-bold text-primary-600 dark:text-primary-400">
                    {procurementDetail.estimatedCost.toLocaleString()}円
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Approvers */}
          <div className="aegis-card">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
              承認者
            </h2>
            <div className="space-y-3">
              {procurementDetail.approvers.map((approver, i) => (
                <div key={i} className="flex items-start gap-4 rounded-lg border border-gray-200 p-4 dark:border-aegis-border">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                    {approver.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{approver.name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">({approver.role})</span>
                      <Badge variant={approver.status === 'approved' ? 'success' : 'warning'}>
                        {approver.status === 'approved' ? '承認済' : '保留中'}
                      </Badge>
                    </div>
                    {approver.comment && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {approver.comment}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-400">{approver.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Info & Timeline */}
        <div className="space-y-6">
          {/* Info Card */}
          <div className="aegis-card">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
              申請情報
            </h2>
            <dl className="space-y-3">
              {[
                { label: '申請者', value: procurementDetail.requesterName },
                { label: 'メール', value: procurementDetail.requesterEmail },
                { label: '部門', value: procurementDetail.department },
                { label: 'カテゴリ', value: procurementDetail.category === 'hardware' ? 'ハードウェア' : procurementDetail.category },
                { label: '作成日', value: procurementDetail.createdAt },
                { label: '更新日', value: procurementDetail.updatedAt },
                { label: '希望納期', value: procurementDetail.deliveryDate },
              ].map((info) => (
                <div key={info.label} className="flex justify-between">
                  <dt className="text-xs text-gray-500 dark:text-gray-400">{info.label}</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">{info.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Timeline */}
          <div className="aegis-card">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
              タイムライン
            </h2>
            <div className="space-y-0">
              {procurementDetail.timeline.map((event, i) => (
                <div key={i} className="relative flex gap-3 pb-6 last:pb-0">
                  {/* Line */}
                  {i < procurementDetail.timeline.length - 1 && (
                    <div className="absolute left-[11px] top-6 h-full w-0.5 bg-gray-200 dark:bg-gray-700" />
                  )}
                  {/* Dot */}
                  <div className="relative z-10 mt-1 h-6 w-6 shrink-0">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary-500 bg-white dark:bg-aegis-dark">
                      <div className="h-2 w-2 rounded-full bg-primary-500" />
                    </div>
                  </div>
                  {/* Content */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {event.event}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {event.detail}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-400">
                      <span>{event.user}</span>
                      <span>{event.date}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Status Change Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="ステータスを変更"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ステータスを
            <span className="mx-1 font-semibold text-gray-900 dark:text-white">
              {statusConfig[currentStatus].label}
            </span>
            から
            <span className="mx-1 font-semibold text-primary-600 dark:text-primary-400">
              {nextStatus ? statusConfig[nextStatus].label : ''}
            </span>
            に変更しますか?
          </p>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              コメント（任意）
            </label>
            <textarea
              rows={3}
              placeholder="変更理由やコメントを入力"
              className="aegis-input resize-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowModal(false)} className="aegis-btn-secondary">
              キャンセル
            </button>
            <button onClick={confirmStatusChange} className="aegis-btn-primary">
              変更を確定
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
