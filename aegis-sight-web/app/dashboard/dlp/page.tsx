'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { DonutChart, BarChart } from '@/components/ui/chart';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DLPRuleType = 'file_extension' | 'path_pattern' | 'content_keyword' | 'size_limit';
type DLPAction = 'alert' | 'block' | 'log';
type DLPSeverity = 'critical' | 'high' | 'medium' | 'low';
type DLPActionTaken = 'alerted' | 'blocked' | 'logged';

interface DLPRule {
  id: string;
  name: string;
  description: string | null;
  rule_type: DLPRuleType;
  pattern: string;
  action: DLPAction;
  severity: DLPSeverity;
  is_enabled: boolean;
  created_at: string;
}

interface DLPEvent {
  id: string;
  rule_id: string;
  rule_name: string;
  device_id: string | null;
  user_name: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  action_taken: DLPActionTaken;
  matched_pattern: string;
  severity: DLPSeverity;
  detected_at: string;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockRules: DLPRule[] = [
  {
    id: '1',
    name: '実行ファイル検出',
    description: 'USBや外部メディアへの実行ファイル(.exe/.msi)コピーを検出',
    rule_type: 'file_extension',
    pattern: '.exe,.msi,.bat,.cmd,.ps1',
    action: 'alert',
    severity: 'high',
    is_enabled: true,
    created_at: '2026-01-15T09:00:00Z',
  },
  {
    id: '2',
    name: '個人情報キーワード検出',
    description: 'ファイル名やパスに個人情報関連キーワードが含まれる場合にブロック',
    rule_type: 'content_keyword',
    pattern: 'マイナンバー,個人情報,住所録,給与明細,password,credential',
    action: 'block',
    severity: 'critical',
    is_enabled: true,
    created_at: '2026-02-01T10:00:00Z',
  },
  {
    id: '3',
    name: '大容量ファイル転送検出',
    description: '100MBを超えるファイルの転送を検出',
    rule_type: 'size_limit',
    pattern: '104857600',
    action: 'alert',
    severity: 'medium',
    is_enabled: true,
    created_at: '2026-02-10T08:00:00Z',
  },
  {
    id: '4',
    name: 'USB パス検出',
    description: 'USBドライブパスへのファイル操作を検出',
    rule_type: 'path_pattern',
    pattern: 'E:\\*,F:\\*,G:\\*',
    action: 'alert',
    severity: 'high',
    is_enabled: true,
    created_at: '2026-03-01T12:00:00Z',
  },
  {
    id: '5',
    name: 'クラウドストレージ監視（無効）',
    description: 'OneDrive/Dropbox同期フォルダへの機密ファイルコピーを監視',
    rule_type: 'path_pattern',
    pattern: '*OneDrive*,*Dropbox*',
    action: 'log',
    severity: 'low',
    is_enabled: false,
    created_at: '2026-03-15T09:00:00Z',
  },
];

const mockEvents: DLPEvent[] = [
  { id: 'e1', rule_id: '2', rule_name: '個人情報キーワード検出', device_id: 'd1', user_name: 'tanaka.taro', file_path: 'C:\\Users\\tanaka\\Desktop\\個人情報一覧.xlsx', file_name: '個人情報一覧.xlsx', file_size: 2048000, action_taken: 'blocked', matched_pattern: '個人情報', severity: 'critical', detected_at: '2026-03-26T14:23:00Z' },
  { id: 'e2', rule_id: '1', rule_name: '実行ファイル検出', device_id: 'd2', user_name: 'suzuki.hanako', file_path: 'E:\\installer.exe', file_name: 'installer.exe', file_size: 52428800, action_taken: 'alerted', matched_pattern: '.exe', severity: 'high', detected_at: '2026-03-26T11:15:00Z' },
  { id: 'e3', rule_id: '3', rule_name: '大容量ファイル転送検出', device_id: 'd3', user_name: 'yamada.ichiro', file_path: 'F:\\backup\\database_dump.sql', file_name: 'database_dump.sql', file_size: 524288000, action_taken: 'alerted', matched_pattern: '104857600', severity: 'medium', detected_at: '2026-03-25T16:45:00Z' },
  { id: 'e4', rule_id: '4', rule_name: 'USB パス検出', device_id: 'd4', user_name: 'sato.yuki', file_path: 'F:\\Documents\\quarterly_report.docx', file_name: 'quarterly_report.docx', file_size: 1048576, action_taken: 'alerted', matched_pattern: 'F:\\*', severity: 'high', detected_at: '2026-03-25T10:30:00Z' },
  { id: 'e5', rule_id: '2', rule_name: '個人情報キーワード検出', device_id: 'd5', user_name: 'kobayashi.mei', file_path: 'C:\\Users\\kobayashi\\Documents\\給与明細_2026Q1.pdf', file_name: '給与明細_2026Q1.pdf', file_size: 512000, action_taken: 'blocked', matched_pattern: '給与明細', severity: 'critical', detected_at: '2026-03-24T09:12:00Z' },
  { id: 'e6', rule_id: '1', rule_name: '実行ファイル検出', device_id: 'd6', user_name: 'watanabe.ken', file_path: 'G:\\tools\\setup.msi', file_name: 'setup.msi', file_size: 15728640, action_taken: 'alerted', matched_pattern: '.msi', severity: 'high', detected_at: '2026-03-23T14:00:00Z' },
];

const mockSummary = {
  totalEvents: 6,
  blocked: 2,
  alerted: 4,
  logged: 0,
  bySeverity: { critical: 2, high: 2, medium: 1, low: 0 } as Record<string, number>,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ruleTypeBadge: Record<DLPRuleType, { label: string; className: string }> = {
  file_extension: {
    label: 'ファイル拡張子',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  path_pattern: {
    label: 'パスパターン',
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  },
  content_keyword: {
    label: 'キーワード',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  },
  size_limit: {
    label: 'サイズ制限',
    className: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  },
};

const actionBadge: Record<DLPAction | DLPActionTaken, { label: string; className: string }> = {
  alert: {
    label: 'アラート',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  },
  block: {
    label: 'ブロック',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
  log: {
    label: 'ログ',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  alerted: {
    label: 'アラート済',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  },
  blocked: {
    label: 'ブロック済',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
  logged: {
    label: 'ログ済',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
};

const severityBadge: Record<DLPSeverity, { label: string; className: string }> = {
  critical: {
    label: 'Critical',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
  high: {
    label: 'High',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  },
  medium: {
    label: 'Medium',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  },
  low: {
    label: 'Low',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function DLPPage() {
  const [activeTab, setActiveTab] = useState<'rules' | 'events'>('rules');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    rule_type: 'file_extension' as DLPRuleType,
    pattern: '',
    action: 'alert' as DLPAction,
    severity: 'medium' as DLPSeverity,
    is_enabled: true,
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            DLP (情報漏洩防止)
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            ファイル操作監視ルールの管理、DLPイベントの追跡
          </p>
        </div>
        <div className="flex gap-3">
          <button className="aegis-btn-secondary">
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            エクスポート
          </button>
          <button
            className="aegis-btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            ルール作成
          </button>
        </div>
      </div>

      {/* DLP 概要チャート */}
      {(() => {
        const blockRate = Math.round((mockSummary.blocked / Math.max(mockSummary.totalEvents, 1)) * 100);
        const blockRateColor = blockRate >= 50 ? '#ef4444' : blockRate >= 30 ? '#f59e0b' : '#10b981';
        const severityBarData = [
          { label: 'Critical', value: mockSummary.bySeverity.critical, color: 'bg-red-500' },
          { label: 'High', value: mockSummary.bySeverity.high, color: 'bg-orange-500' },
          { label: 'Medium', value: mockSummary.bySeverity.medium, color: 'bg-amber-500' },
          { label: 'Low', value: mockSummary.bySeverity.low, color: 'bg-blue-400' },
        ];
        return (
          <div className="aegis-card">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">DLP 概要</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">ブロック率</p>
                <DonutChart value={blockRate} max={100} size={140} strokeWidth={14} color={blockRateColor} label={`${blockRate}%`} />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  全 {mockSummary.totalEvents} イベント中 {mockSummary.blocked} 件ブロック
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">重要度別イベント数</p>
                <BarChart data={severityBarData} maxValue={Math.max(...Object.values(mockSummary.bySeverity), 1)} height={160} showValues />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        {/* Total events */}
        <div className="aegis-card p-5">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">総イベント数</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {mockSummary.totalEvents}
          </p>
        </div>

        {/* Blocked */}
        <div className="aegis-card p-5">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">ブロック</p>
          <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">
            {mockSummary.blocked}
          </p>
        </div>

        {/* Alerted */}
        <div className="aegis-card p-5">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">アラート</p>
          <p className="mt-2 text-3xl font-bold text-amber-600 dark:text-amber-400">
            {mockSummary.alerted}
          </p>
        </div>

        {/* Critical */}
        <div className="aegis-card p-5">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Critical</p>
          <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">
            {mockSummary.bySeverity.critical}
          </p>
        </div>

        {/* Severity breakdown */}
        <div className="aegis-card p-5">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">重要度別</p>
          <div className="mt-2 space-y-1.5">
            {Object.entries(mockSummary.bySeverity).map(([sev, count]) => (
              <div key={sev} className="flex items-center justify-between">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${severityBadge[sev as DLPSeverity]?.className}`}>
                  {severityBadge[sev as DLPSeverity]?.label}
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-aegis-darker">
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'rules'
              ? 'bg-white text-gray-900 shadow dark:bg-aegis-surface dark:text-white'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          DLPルール
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'events'
              ? 'bg-white text-gray-900 shadow dark:bg-aegis-surface dark:text-white'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          DLPイベント
          {mockSummary.blocked > 0 && (
            <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {mockSummary.blocked}
            </span>
          )}
        </button>
      </div>

      {/* Rules Table */}
      {activeTab === 'rules' && (
        <div className="aegis-card">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-aegis-border">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              DLPルール一覧
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              ファイル操作監視ルールの管理
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-aegis-border dark:bg-aegis-darker">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    ルール名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    種別
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    パターン
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    アクション
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    重要度
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    状態
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-aegis-border">
                {mockRules.map((rule) => {
                  const typeBadge = ruleTypeBadge[rule.rule_type];
                  const actBadge = actionBadge[rule.action];
                  const sevBadge = severityBadge[rule.severity];
                  return (
                    <tr key={rule.id} className="hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {rule.name}
                          </p>
                          {rule.description && (
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                              {rule.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${typeBadge.className}`}>
                          {typeBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <code className="max-w-[200px] truncate block text-xs font-mono text-gray-600 dark:text-gray-400">
                          {rule.pattern}
                        </code>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-center">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${actBadge.className}`}>
                          {actBadge.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-center">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${sevBadge.className}`}>
                          {sevBadge.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            rule.is_enabled
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              rule.is_enabled ? 'bg-emerald-500' : 'bg-gray-400'
                            }`}
                          />
                          {rule.is_enabled ? '有効' : '無効'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <button className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
                          編集
                        </button>
                        <span className="mx-2 text-gray-300 dark:text-gray-600">|</span>
                        <button className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                          削除
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Events Table */}
      {activeTab === 'events' && (
        <div className="aegis-card">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-aegis-border">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              DLPイベント一覧
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              検出されたファイル操作違反イベント
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-aegis-border dark:bg-aegis-darker">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    検出日時
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    重要度
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    ユーザー
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    ファイル
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    サイズ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    ルール
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    アクション
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-aegis-border">
                {mockEvents.map((event) => {
                  const sevBadge = severityBadge[event.severity];
                  const actBadge = actionBadge[event.action_taken];
                  return (
                    <tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(event.detected_at)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${sevBadge.className}`}>
                          {sevBadge.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-mono font-medium text-primary-600 dark:text-primary-400">
                        {event.user_name}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[250px]">
                            {event.file_name}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate max-w-[250px]">
                            {event.file_path}
                          </p>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatFileSize(event.file_size)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {event.rule_name}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-center">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${actBadge.className}`}>
                          {actBadge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {mockEvents.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                      DLPイベントはありません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Rule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl dark:bg-aegis-darker">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                新規DLPルール作成
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-aegis-surface dark:hover:text-gray-200"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  ルール名
                </label>
                <input
                  type="text"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-aegis-border dark:bg-aegis-surface dark:text-white"
                  placeholder="例: 実行ファイル検出"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  説明
                </label>
                <textarea
                  value={newRule.description}
                  onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                  rows={2}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-aegis-border dark:bg-aegis-surface dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    ルール種別
                  </label>
                  <select
                    value={newRule.rule_type}
                    onChange={(e) => setNewRule({ ...newRule, rule_type: e.target.value as DLPRuleType })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-aegis-border dark:bg-aegis-surface dark:text-white"
                  >
                    <option value="file_extension">ファイル拡張子</option>
                    <option value="path_pattern">パスパターン</option>
                    <option value="content_keyword">キーワード</option>
                    <option value="size_limit">サイズ制限</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    アクション
                  </label>
                  <select
                    value={newRule.action}
                    onChange={(e) => setNewRule({ ...newRule, action: e.target.value as DLPAction })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-aegis-border dark:bg-aegis-surface dark:text-white"
                  >
                    <option value="alert">アラート</option>
                    <option value="block">ブロック</option>
                    <option value="log">ログ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  パターン
                </label>
                <input
                  type="text"
                  value={newRule.pattern}
                  onChange={(e) => setNewRule({ ...newRule, pattern: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-xs shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-aegis-border dark:bg-aegis-surface dark:text-white"
                  placeholder="例: .exe,.msi,.bat"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {newRule.rule_type === 'file_extension' && 'カンマ区切りの拡張子 (例: .exe,.msi)'}
                  {newRule.rule_type === 'path_pattern' && 'glob/正規表現パターン (例: E:\\*,F:\\*)'}
                  {newRule.rule_type === 'content_keyword' && 'カンマ区切りのキーワード'}
                  {newRule.rule_type === 'size_limit' && '最大サイズ (バイト) (例: 104857600 = 100MB)'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    重要度
                  </label>
                  <select
                    value={newRule.severity}
                    onChange={(e) => setNewRule({ ...newRule, severity: e.target.value as DLPSeverity })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-aegis-border dark:bg-aegis-surface dark:text-white"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newRule.is_enabled}
                      onChange={(e) => setNewRule({ ...newRule, is_enabled: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      有効にする
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="aegis-btn-secondary"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  // In production: POST /api/v1/dlp/rules
                  setShowCreateModal(false);
                }}
                className="aegis-btn-primary"
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
