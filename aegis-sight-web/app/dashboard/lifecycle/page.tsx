'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { DonutChart, BarChart } from '@/components/ui/chart';

type DisposalStatus = 'pending' | 'approved' | 'rejected' | 'completed';
type DisposalMethod = 'recycle' | 'destroy' | 'donate' | 'return_to_vendor';

interface DisposalRequest {
  id: string;
  device: string;
  reason: string;
  method: DisposalMethod;
  requester: string;
  status: DisposalStatus;
  createdAt: string;
  certificateNumber?: string;
}

interface TimelineEvent {
  id: string;
  type: string;
  label: string;
  device: string;
  performer: string;
  date: string;
  detail?: string;
}

const methodLabel: Record<DisposalMethod, string> = {
  recycle: 'リサイクル',
  destroy: '破壊処分',
  donate: '寄贈',
  return_to_vendor: 'ベンダー返却',
};

const statusConfig: Record<DisposalStatus, { variant: 'warning' | 'success' | 'danger' | 'default'; label: string }> = {
  pending:   { variant: 'warning', label: '承認待ち' },
  approved:  { variant: 'success', label: '承認済' },
  rejected:  { variant: 'danger',  label: '却下' },
  completed: { variant: 'default', label: '完了' },
};


const eventTypeIcon: Record<string, { color: string; label: string }> = {
  procured: { color: 'bg-blue-500', label: '調達' },
  deployed: { color: 'bg-green-500', label: '配備' },
  reassigned: { color: 'bg-purple-500', label: '再配置' },
  maintenance: { color: 'bg-amber-500', label: '保守' },
  disposal_requested: { color: 'bg-orange-500', label: '廃棄申請' },
  disposal_approved: { color: 'bg-red-400', label: '廃棄承認' },
  disposed: { color: 'bg-red-600', label: '廃棄済' },
};

export default function LifecyclePage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'disposals' | 'timeline' | 'new'>('overview');
  const [disposalForm, setDisposalForm] = useState({ device_id: '', reason: '', method: 'recycle' as DisposalMethod });

  // Sample statistics
  const stats = [
    { label: '調達済', value: 342, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: '稼働中', value: 285, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
    { label: '保守中', value: 23, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: '廃棄済', value: 34, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
  ];

  const totalAssets = stats[0].value; // 調達済が総数基準
  const operationalRate = Math.round((stats[1].value / totalAssets) * 100);
  const donutColor = operationalRate >= 80 ? '#10b981' : operationalRate >= 60 ? '#f59e0b' : '#ef4444';

  const lifecycleBarData = [
    { label: '稼働中', value: 285, color: 'bg-emerald-500' },
    { label: '保守中', value:  23, color: 'bg-amber-500'  },
    { label: '廃棄済', value:  34, color: 'bg-red-500'    },
  ];

  // Sample disposal requests
  const disposals: DisposalRequest[] = [
    { id: 'DSP-001', device: 'PC-SALES-042', reason: '経年劣化（5年超過）', method: 'recycle', requester: '田中太郎', status: 'pending', createdAt: '2026-03-25' },
    { id: 'DSP-002', device: 'SRV-DB-003', reason: 'ハードウェア障害（修理不能）', method: 'destroy', requester: '山田次郎', status: 'approved', createdAt: '2026-03-20' },
    { id: 'DSP-003', device: 'PC-DEV-018', reason: 'リプレース完了', method: 'donate', requester: '佐藤花子', status: 'completed', createdAt: '2026-03-10', certificateNumber: 'CERT-2026-0312' },
    { id: 'DSP-004', device: 'NB-MKT-007', reason: 'リース契約満了', method: 'return_to_vendor', requester: '鈴木一郎', status: 'rejected', createdAt: '2026-03-15' },
    { id: 'DSP-005', device: 'PC-HR-011', reason: 'セキュリティポリシー非準拠', method: 'destroy', requester: '高橋美咲', status: 'pending', createdAt: '2026-03-26' },
  ];

  // Sample timeline
  const timeline: TimelineEvent[] = [
    { id: '1', type: 'procured', label: '調達', device: 'PC-DEV-025', performer: '田中太郎', date: '2026-01-15', detail: 'Dell Latitude 5550' },
    { id: '2', type: 'deployed', label: '配備', device: 'PC-DEV-025', performer: '山田次郎', date: '2026-01-20', detail: 'エンジニアリング部 配備' },
    { id: '3', type: 'maintenance', label: '保守', device: 'PC-SALES-042', performer: '佐藤花子', date: '2026-02-10', detail: 'バッテリー交換' },
    { id: '4', type: 'reassigned', label: '再配置', device: 'NB-MKT-007', performer: '鈴木一郎', date: '2026-02-28', detail: 'マーケティング部から営業部へ移管' },
    { id: '5', type: 'disposal_requested', label: '廃棄申請', device: 'PC-SALES-042', performer: '田中太郎', date: '2026-03-25', detail: '経年劣化（5年超過）' },
    { id: '6', type: 'disposal_approved', label: '廃棄承認', device: 'SRV-DB-003', performer: '管理者', date: '2026-03-22' },
    { id: '7', type: 'disposed', label: '廃棄済', device: 'PC-DEV-018', performer: '佐藤花子', date: '2026-03-12', detail: 'CERT-2026-0312' },
  ];

  const handleDisposalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this would POST to /api/v1/lifecycle/disposals
    alert(`廃棄申請を送信しました: ${JSON.stringify(disposalForm)}`);
    setDisposalForm({ device_id: '', reason: '', method: 'recycle' });
    setActiveTab('disposals');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ライフサイクル管理</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            資産のライフサイクル追跡と廃棄管理
          </p>
        </div>
        <button
          onClick={() => setActiveTab('new')}
          className="aegis-btn-primary"
        >
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          廃棄申請
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-aegis-border">
        <nav className="-mb-px flex space-x-8">
          {([
            ['overview', '統計概要'],
            ['disposals', '廃棄申請一覧'],
            ['timeline', 'タイムライン'],
            ['new', '新規廃棄申請'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Lifecycle Chart Overview */}
          <div className="aegis-card">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">ライフサイクル概要</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Operational Rate Donut */}
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">稼働中率</p>
                <DonutChart
                  value={operationalRate}
                  max={100}
                  size={140}
                  strokeWidth={14}
                  color={donutColor}
                  label={`${operationalRate}%`}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  管理対象 {totalAssets} 台中 {stats[1].value} 台稼働中
                </p>
              </div>
              {/* Stage Distribution Bar */}
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">ステージ別台数</p>
                <BarChart
                  data={lifecycleBarData}
                  maxValue={totalAssets}
                  height={160}
                  showValues
                />
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="aegis-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                    <p className={`mt-1 text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg}`}>
                    <svg className={`h-6 w-6 ${stat.color}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Disposal Pending Summary */}
          <div className="aegis-card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">承認待ち廃棄申請</h2>
            <div className="space-y-3">
              {disposals.filter(d => d.status === 'pending').map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-aegis-border">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/20">
                      <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{d.device}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{d.reason} - {methodLabel[d.method]}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="rounded-lg bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30">
                      承認
                    </button>
                    <button className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30">
                      却下
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Disposals Tab */}
      {activeTab === 'disposals' && (
        <div className="aegis-card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50 dark:border-aegis-border dark:bg-aegis-dark/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">申請番号</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">デバイス</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">理由</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">方法</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">申請者</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">ステータス</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">申請日</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
                {disposals.map((d) => (
                  <tr key={d.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-mono font-medium text-primary-600 dark:text-primary-400">
                      {d.id}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {d.device}
                    </td>
                    <td className="max-w-xs truncate px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {d.reason}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {methodLabel[d.method]}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {d.requester}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <Badge variant={statusConfig[d.status].variant} dot size="sm">
                        {statusConfig[d.status].label}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {d.createdAt}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {d.status === 'pending' && (
                        <div className="flex items-center gap-1">
                          <button className="rounded bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400">
                            承認
                          </button>
                          <button className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400">
                            却下
                          </button>
                        </div>
                      )}
                      {d.status === 'approved' && (
                        <button className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400">
                          完了
                        </button>
                      )}
                      {d.certificateNumber && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {d.certificateNumber}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Timeline Tab */}
      {activeTab === 'timeline' && (
        <div className="aegis-card">
          <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">デバイスライフサイクルタイムライン</h2>
          <div className="relative">
            <div className="absolute left-5 top-0 h-full w-0.5 bg-gray-200 dark:bg-aegis-border" />
            <div className="space-y-6">
              {timeline.map((event) => {
                const typeInfo = eventTypeIcon[event.type] || { color: 'bg-gray-400', label: event.type };
                return (
                  <div key={event.id} className="relative flex items-start gap-4 pl-12">
                    <div className={`absolute left-3 top-1 h-4 w-4 rounded-full ${typeInfo.color} ring-4 ring-white dark:ring-aegis-dark`} />
                    <div className="min-w-0 flex-1 rounded-lg border border-gray-200 p-4 dark:border-aegis-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium text-white ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">{event.device}</span>
                        </div>
                        <time className="text-sm text-gray-500 dark:text-gray-400">{event.date}</time>
                      </div>
                      {event.detail && (
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{event.detail}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                        実行者: {event.performer}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* New Disposal Request Tab */}
      {activeTab === 'new' && (
        <div className="aegis-card max-w-2xl">
          <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">新規廃棄申請</h2>
          <form onSubmit={handleDisposalSubmit} className="space-y-5">
            <div>
              <label htmlFor="device_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                対象デバイス
              </label>
              <input
                id="device_id"
                type="text"
                required
                placeholder="デバイスIDまたはホスト名を入力"
                value={disposalForm.device_id}
                onChange={(e) => setDisposalForm({ ...disposalForm, device_id: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-aegis-border dark:bg-aegis-surface dark:text-white dark:placeholder-gray-500"
              />
            </div>
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                廃棄理由
              </label>
              <textarea
                id="reason"
                required
                rows={3}
                placeholder="廃棄の理由を記入してください"
                value={disposalForm.reason}
                onChange={(e) => setDisposalForm({ ...disposalForm, reason: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-aegis-border dark:bg-aegis-surface dark:text-white dark:placeholder-gray-500"
              />
            </div>
            <div>
              <label htmlFor="method" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                廃棄方法
              </label>
              <select
                id="method"
                value={disposalForm.method}
                onChange={(e) => setDisposalForm({ ...disposalForm, method: e.target.value as DisposalMethod })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-aegis-border dark:bg-aegis-surface dark:text-white"
              >
                <option value="recycle">リサイクル</option>
                <option value="destroy">破壊処分</option>
                <option value="donate">寄贈</option>
                <option value="return_to_vendor">ベンダー返却</option>
              </select>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button type="submit" className="aegis-btn-primary">
                廃棄申請を送信
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('disposals')}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-aegis-border dark:text-gray-300 dark:hover:bg-aegis-surface"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
