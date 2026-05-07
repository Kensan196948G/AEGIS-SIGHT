'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { BarChart } from '@/components/ui/chart';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScheduledTask {
  id: string;
  name: string;
  task_type: string;
  cron_expression: string;
  is_enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  last_status: 'success' | 'failed' | 'running' | null;
  description: string | null;
  created_at: string;
  avg_duration_sec?: number;
}

interface TaskHistoryEntry {
  id: string;
  name: string;
  task_type: string;
  last_run_at: string | null;
  last_status: 'success' | 'failed' | 'running' | null;
  duration_sec?: number;
}

// ---------------------------------------------------------------------------
// Dummy data (shown when API returns no data)
// ---------------------------------------------------------------------------

const DUMMY_TASKS: ScheduledTask[] = [
  {
    id: 'task-001',
    name: 'M365 ライセンス同期',
    task_type: 'm365_sync',
    cron_expression: '0 */6 * * *',
    is_enabled: true,
    last_run_at: '2026-05-07T09:00:00Z',
    next_run_at: '2026-05-07T15:00:00Z',
    last_status: 'success',
    description: 'Microsoft 365 のライセンス割り当て状況を取得し、SAM データベースへ同期します',
    created_at: '2026-01-15T00:00:00Z',
    avg_duration_sec: 42,
  },
  {
    id: 'task-002',
    name: 'SAM コンプライアンスチェック',
    task_type: 'sam_check',
    cron_expression: '0 2 * * *',
    is_enabled: true,
    last_run_at: '2026-05-07T02:00:00Z',
    next_run_at: '2026-05-08T02:00:00Z',
    last_status: 'success',
    description: 'インストール済みソフトウェアとライセンス数の照合を実行し、未準拠デバイスを検出します',
    created_at: '2026-01-15T00:00:00Z',
    avg_duration_sec: 187,
  },
  {
    id: 'task-003',
    name: '月次 SAM レポート生成',
    task_type: 'report_generation',
    cron_expression: '0 9 1 * *',
    is_enabled: true,
    last_run_at: '2026-05-01T09:00:00Z',
    next_run_at: '2026-06-01T09:00:00Z',
    last_status: 'success',
    description: '月次 SAM コンプライアンスレポートを PDF/CSV で生成し、管理者へメール送信します',
    created_at: '2026-01-15T00:00:00Z',
    avg_duration_sec: 95,
  },
  {
    id: 'task-004',
    name: 'デバイス資産スキャン',
    task_type: 'sam_check',
    cron_expression: '*/30 * * * *',
    is_enabled: true,
    last_run_at: '2026-05-07T10:30:00Z',
    next_run_at: '2026-05-07T11:00:00Z',
    last_status: 'success',
    description: 'ネットワーク内のデバイスを定期スキャンして資産台帳を最新化します',
    created_at: '2026-02-01T00:00:00Z',
    avg_duration_sec: 23,
  },
  {
    id: 'task-005',
    name: 'セキュリティパッチ確認',
    task_type: 'sam_check',
    cron_expression: '0 3 * * 1',
    is_enabled: true,
    last_run_at: '2026-05-05T03:00:00Z',
    next_run_at: '2026-05-12T03:00:00Z',
    last_status: 'failed',
    description: 'Windows Update 適用状況を確認し、未適用デバイスをセキュリティアラートとして記録します',
    created_at: '2026-02-10T00:00:00Z',
    avg_duration_sec: 312,
  },
  {
    id: 'task-006',
    name: 'データベースバックアップ',
    task_type: 'backup',
    cron_expression: '0 1 * * *',
    is_enabled: true,
    last_run_at: '2026-05-07T01:00:00Z',
    next_run_at: '2026-05-08T01:00:00Z',
    last_status: 'success',
    description: 'AEGIS-SIGHT のすべての設定・資産データをオフサイトストレージへバックアップします',
    created_at: '2026-01-15T00:00:00Z',
    avg_duration_sec: 58,
  },
  {
    id: 'task-007',
    name: 'ログクリーンアップ',
    task_type: 'cleanup',
    cron_expression: '0 4 * * 0',
    is_enabled: false,
    last_run_at: '2026-05-04T04:00:00Z',
    next_run_at: null,
    last_status: 'success',
    description: '90日以上経過した監査ログ・実行履歴を圧縮アーカイブへ移動します（無効中）',
    created_at: '2026-03-01T00:00:00Z',
    avg_duration_sec: 14,
  },
  {
    id: 'task-008',
    name: 'J-SOX 証跡レポート',
    task_type: 'report_generation',
    cron_expression: '0 8 31 3 *',
    is_enabled: true,
    last_run_at: '2026-03-31T08:00:00Z',
    next_run_at: '2027-03-31T08:00:00Z',
    last_status: 'success',
    description: '年次 J-SOX 内部統制証跡レポートを生成し、監査部門へ配信します',
    created_at: '2026-01-20T00:00:00Z',
    avg_duration_sec: 241,
  },
];

const DUMMY_HISTORY: (TaskHistoryEntry & { task_name_full: string })[] = [
  { id: 'h-001', name: 'M365 ライセンス同期',       task_type: 'm365_sync',         last_run_at: '2026-05-07T09:00:00Z', last_status: 'success', duration_sec: 41,  task_name_full: 'M365 ライセンス同期' },
  { id: 'h-002', name: 'デバイス資産スキャン',       task_type: 'sam_check',         last_run_at: '2026-05-07T10:30:00Z', last_status: 'success', duration_sec: 22,  task_name_full: 'デバイス資産スキャン' },
  { id: 'h-003', name: 'SAM コンプライアンスチェック', task_type: 'sam_check',       last_run_at: '2026-05-07T02:00:00Z', last_status: 'success', duration_sec: 191, task_name_full: 'SAM コンプライアンスチェック' },
  { id: 'h-004', name: 'データベースバックアップ',   task_type: 'backup',            last_run_at: '2026-05-07T01:00:00Z', last_status: 'success', duration_sec: 57,  task_name_full: 'データベースバックアップ' },
  { id: 'h-005', name: 'セキュリティパッチ確認',     task_type: 'sam_check',         last_run_at: '2026-05-05T03:00:00Z', last_status: 'failed',  duration_sec: 312, task_name_full: 'セキュリティパッチ確認' },
  { id: 'h-006', name: 'M365 ライセンス同期',       task_type: 'm365_sync',         last_run_at: '2026-05-07T03:00:00Z', last_status: 'success', duration_sec: 43,  task_name_full: 'M365 ライセンス同期' },
  { id: 'h-007', name: 'デバイス資産スキャン',       task_type: 'sam_check',         last_run_at: '2026-05-07T10:00:00Z', last_status: 'success', duration_sec: 24,  task_name_full: 'デバイス資産スキャン' },
  { id: 'h-008', name: 'M365 ライセンス同期',       task_type: 'm365_sync',         last_run_at: '2026-05-06T21:00:00Z', last_status: 'success', duration_sec: 39,  task_name_full: 'M365 ライセンス同期' },
  { id: 'h-009', name: 'データベースバックアップ',   task_type: 'backup',            last_run_at: '2026-05-06T01:00:00Z', last_status: 'success', duration_sec: 61,  task_name_full: 'データベースバックアップ' },
  { id: 'h-010', name: 'SAM コンプライアンスチェック', task_type: 'sam_check',       last_run_at: '2026-05-06T02:00:00Z', last_status: 'success', duration_sec: 184, task_name_full: 'SAM コンプライアンスチェック' },
  { id: 'h-011', name: 'デバイス資産スキャン',       task_type: 'sam_check',         last_run_at: '2026-05-06T09:30:00Z', last_status: 'success', duration_sec: 20,  task_name_full: 'デバイス資産スキャン' },
  { id: 'h-012', name: 'ログクリーンアップ',         task_type: 'cleanup',           last_run_at: '2026-05-04T04:00:00Z', last_status: 'success', duration_sec: 14,  task_name_full: 'ログクリーンアップ' },
  { id: 'h-013', name: 'M365 ライセンス同期',       task_type: 'm365_sync',         last_run_at: '2026-05-05T15:00:00Z', last_status: 'success', duration_sec: 44,  task_name_full: 'M365 ライセンス同期' },
  { id: 'h-014', name: 'SAM コンプライアンスチェック', task_type: 'sam_check',       last_run_at: '2026-05-05T02:00:00Z', last_status: 'success', duration_sec: 196, task_name_full: 'SAM コンプライアンスチェック' },
  { id: 'h-015', name: 'セキュリティパッチ確認',     task_type: 'sam_check',         last_run_at: '2026-04-28T03:00:00Z', last_status: 'success', duration_sec: 298, task_name_full: 'セキュリティパッチ確認' },
  { id: 'h-016', name: '月次 SAM レポート生成',     task_type: 'report_generation', last_run_at: '2026-05-01T09:00:00Z', last_status: 'success', duration_sec: 92,  task_name_full: '月次 SAM レポート生成' },
  { id: 'h-017', name: 'データベースバックアップ',   task_type: 'backup',            last_run_at: '2026-05-05T01:00:00Z', last_status: 'success', duration_sec: 55,  task_name_full: 'データベースバックアップ' },
  { id: 'h-018', name: 'M365 ライセンス同期',       task_type: 'm365_sync',         last_run_at: '2026-05-04T09:00:00Z', last_status: 'success', duration_sec: 46,  task_name_full: 'M365 ライセンス同期' },
  { id: 'h-019', name: 'SAM コンプライアンスチェック', task_type: 'sam_check',       last_run_at: '2026-05-04T02:00:00Z', last_status: 'failed',  duration_sec: 201, task_name_full: 'SAM コンプライアンスチェック' },
  { id: 'h-020', name: 'デバイス資産スキャン',       task_type: 'sam_check',         last_run_at: '2026-05-03T10:00:00Z', last_status: 'success', duration_sec: 25,  task_name_full: 'デバイス資産スキャン' },
];

const EXECUTION_TREND = [
  { label: '12月', value: 148, color: 'bg-blue-400' },
  { label: '1月',  value: 162, color: 'bg-blue-400' },
  { label: '2月',  value: 155, color: 'bg-blue-400' },
  { label: '3月',  value: 171, color: 'bg-blue-400' },
  { label: '4月',  value: 168, color: 'bg-blue-400' },
  { label: '5月',  value: 87,  color: 'bg-primary-600' },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const TASK_TYPE_LABELS: Record<string, string> = {
  sam_check: 'SAMチェック',
  m365_sync: 'M365同期',
  report_generation: 'レポート生成',
  backup: 'バックアップ',
  cleanup: 'クリーンアップ',
};

const TASK_TYPE_COLORS: Record<string, string> = {
  sam_check:         'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  m365_sync:         'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  report_generation: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  backup:            'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  cleanup:           'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  success: { label: '成功', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  failed:  { label: '失敗', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  running: { label: '実行中', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
};

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '--';
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(sec: number | undefined): string {
  if (sec === undefined) return '--';
  if (sec < 60) return `${sec}秒`;
  return `${Math.floor(sec / 60)}分 ${sec % 60}秒`;
}

function parseCron(expr: string): string {
  const MAP: Record<string, string> = {
    '0 */6 * * *':    '6時間ごと',
    '0 2 * * *':      '毎日 02:00',
    '0 1 * * *':      '毎日 01:00',
    '0 3 * * *':      '毎日 03:00',
    '0 4 * * *':      '毎日 04:00',
    '0 9 1 * *':      '毎月1日 09:00',
    '*/30 * * * *':   '30分ごと',
    '0 3 * * 1':      '毎週月曜 03:00',
    '0 4 * * 0':      '毎週日曜 04:00',
    '0 8 31 3 *':     '毎年3月31日 08:00',
  };
  return MAP[expr] ?? expr;
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function SchedulerPage() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [history, setHistory] = useState<(TaskHistoryEntry & { task_name_full?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'history' | 'stats'>('tasks');

  // ---- Data fetching ----

  const fetchTasks = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/scheduler/tasks?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTasks((data.items || []).length > 0 ? data.items : DUMMY_TASKS);
    } catch {
      setTasks(DUMMY_TASKS);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/scheduler/history?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setHistory((data || []).length > 0 ? data : DUMMY_HISTORY);
    } catch {
      setHistory(DUMMY_HISTORY);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchTasks(), fetchHistory()]).finally(() => setLoading(false));
  }, [fetchTasks, fetchHistory]);

  // ---- Actions ----

  async function toggleTask(task: ScheduledTask) {
    const token = getToken();
    if (!token) {
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, is_enabled: !t.is_enabled } : t));
      setActionMessage(`${task.name} を${task.is_enabled ? '無効' : '有効'}にしました`);
      setTimeout(() => setActionMessage(null), 3000);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/v1/scheduler/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: !task.is_enabled }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setActionMessage(`${task.name} を${task.is_enabled ? '無効' : '有効'}にしました`);
      setTimeout(() => setActionMessage(null), 3000);
      await fetchTasks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '更新に失敗しました');
    }
  }

  async function runTask(task: ScheduledTask) {
    const token = getToken();
    if (!token) {
      setActionMessage(`${task.name} を即時実行しました（デモ）`);
      setTimeout(() => setActionMessage(null), 3000);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/v1/scheduler/tasks/${task.id}/run`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setActionMessage(data.message || `${task.name} を実行しました`);
      setTimeout(() => setActionMessage(null), 3000);
      await Promise.all([fetchTasks(), fetchHistory()]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '実行に失敗しました');
    }
  }

  // ---- Derived stats ----

  const enabledCount  = tasks.filter((t) => t.is_enabled).length;
  const failedCount   = tasks.filter((t) => t.last_status === 'failed').length;
  const successCount  = history.filter((h) => h.last_status === 'success').length;
  const successRate   = history.length > 0 ? Math.round((successCount / history.length) * 100) : 0;
  const nextTask      = tasks
    .filter((t) => t.is_enabled && t.next_run_at)
    .sort((a, b) => new Date(a.next_run_at!).getTime() - new Date(b.next_run_at!).getTime())[0];

  // ---- Render ----

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">スケジューラ管理</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            定期実行タスクの管理と実行履歴の確認
          </p>
        </div>
        {actionMessage && (
          <span className="rounded-lg bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
            {actionMessage}
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-4 underline">閉じる</button>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="aegis-card text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">登録タスク数</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{tasks.length}</p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">有効</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">{enabledCount}</p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-blue-600 dark:text-blue-400">成功率 (直近)</p>
          <p className="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-400">{successRate}%</p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-red-600 dark:text-red-400">失敗タスク</p>
          <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">{failedCount}</p>
        </div>
      </div>

      {/* Next Execution Banner */}
      {nextTask && (
        <div className="flex items-center gap-4 rounded-xl border border-blue-200 bg-blue-50 px-6 py-4 dark:border-blue-800/40 dark:bg-blue-900/20">
          <ClockIcon className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
              次回実行: {nextTask.name}
            </p>
            <p className="mt-0.5 text-xs text-blue-700 dark:text-blue-400">
              {formatDateTime(nextTask.next_run_at)} — {parseCron(nextTask.cron_expression)}
            </p>
          </div>
        </div>
      )}

      {/* Failed Task Alert */}
      {failedCount > 0 && (
        <div className="flex items-center gap-4 rounded-xl border border-red-200 bg-red-50 px-6 py-4 dark:border-red-800/40 dark:bg-red-900/20">
          <svg className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              {failedCount} 件のタスクで直前の実行が失敗しています
            </p>
            <p className="mt-0.5 text-xs text-red-700 dark:text-red-400">
              各タスクの詳細を確認し、原因を調査してください
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1 dark:border-aegis-border dark:bg-aegis-dark">
        {([
          { key: 'tasks'   as const, label: 'タスク一覧',   icon: TaskIcon    },
          { key: 'history' as const, label: '実行履歴',     icon: HistoryIcon },
          { key: 'stats'   as const, label: '実行統計',     icon: StatsIcon   },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm dark:bg-aegis-surface dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="aegis-card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-aegis-border dark:bg-aegis-dark/50">
                  {['タスク名 / 説明', 'タイプ', 'スケジュール', '最終実行', '平均時間', 'ステータス', '有効', 'アクション'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                      スケジュールタスクがありません
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-aegis-dark/30">
                      <td className="px-5 py-4 min-w-[240px]">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{task.name}</p>
                        {task.description && (
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 max-w-xs line-clamp-2">
                            {task.description}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${TASK_TYPE_COLORS[task.task_type] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                          {TASK_TYPE_LABELS[task.task_type] || task.task_type}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="font-mono text-xs text-gray-600 dark:text-gray-400">{task.cron_expression}</p>
                        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{parseCron(task.cron_expression)}</p>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {formatDateTime(task.last_run_at)}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {formatDuration(task.avg_duration_sec)}
                      </td>
                      <td className="px-5 py-4">
                        {task.last_status ? (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CONFIG[task.last_status]?.color || ''}`}>
                            {STATUS_CONFIG[task.last_status]?.label || task.last_status}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">--</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={task.is_enabled}
                          onClick={() => toggleTask(task)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                            task.is_enabled ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        >
                          <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${task.is_enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => runTask(task)}
                          disabled={!task.is_enabled}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-aegis-border dark:bg-aegis-surface dark:text-gray-300 dark:hover:bg-aegis-dark"
                        >
                          <PlayIcon className="h-3.5 w-3.5" />
                          即時実行
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="aegis-card">
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">実行履歴タイムライン</h2>
          {history.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">実行履歴がありません</p>
          ) : (
            <div className="space-y-0 max-h-[600px] overflow-y-auto pr-1">
              {history.map((entry, index) => (
                <div key={`${entry.id}-${index}`} className="relative flex gap-4 pb-5">
                  {index < history.length - 1 && (
                    <div className="absolute left-[15px] top-8 h-full w-px bg-gray-200 dark:bg-aegis-border" />
                  )}
                  <div className={`relative z-10 mt-1 h-[30px] w-[30px] shrink-0 rounded-full border-2 ${
                    entry.last_status === 'success' ? 'border-emerald-500 bg-emerald-100 dark:bg-emerald-900/30'
                    : entry.last_status === 'failed'  ? 'border-red-500 bg-red-100 dark:bg-red-900/30'
                    : entry.last_status === 'running' ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/30'
                    : 'border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800'
                  } flex items-center justify-center`}>
                    {entry.last_status === 'success' && <CheckIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                    {entry.last_status === 'failed'  && <XIcon className="h-4 w-4 text-red-600 dark:text-red-400" />}
                    {entry.last_status === 'running' && <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{entry.name}</p>
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${TASK_TYPE_COLORS[entry.task_type] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                        {TASK_TYPE_LABELS[entry.task_type] || entry.task_type}
                      </span>
                      {entry.last_status && (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CONFIG[entry.last_status]?.color || ''}`}>
                          {STATUS_CONFIG[entry.last_status]?.label}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {formatDateTime(entry.last_run_at)}
                      {entry.duration_sec !== undefined && (
                        <span className="ml-2 text-gray-400 dark:text-gray-500">所要時間: {formatDuration(entry.duration_sec)}</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          {/* Monthly Execution Trend */}
          <div className="aegis-card">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">月次実行回数トレンド</h2>
            <BarChart
              data={EXECUTION_TREND}
              maxValue={200}
              height={180}
              showValues
            />
          </div>

          {/* Task Type Breakdown */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="aegis-card">
              <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">タスクタイプ別 成功率</h2>
              <div className="space-y-3">
                {Object.entries(TASK_TYPE_LABELS).map(([type, label]) => {
                  const typeHistory = history.filter((h) => h.task_type === type);
                  if (typeHistory.length === 0) return null;
                  const rate = Math.round((typeHistory.filter((h) => h.last_status === 'success').length / typeHistory.length) * 100);
                  return (
                    <div key={type}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
                        <span className="text-gray-500 dark:text-gray-400">{rate}% ({typeHistory.length}回)</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-aegis-dark">
                        <div
                          className={`h-2 rounded-full transition-all ${rate >= 90 ? 'bg-emerald-500' : rate >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="aegis-card">
              <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">平均実行時間 (タスク別)</h2>
              <div className="space-y-3">
                {tasks.filter((t) => t.avg_duration_sec !== undefined).map((task) => (
                  <div key={task.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300 truncate max-w-[200px]">{task.name}</span>
                    <span className="ml-2 shrink-0 font-mono text-gray-500 dark:text-gray-400">{formatDuration(task.avg_duration_sec)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Failures */}
          <div className="aegis-card overflow-hidden p-0">
            <div className="border-b border-gray-200 px-6 py-4 dark:border-aegis-border">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">最近の失敗実行</h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-aegis-border">
              {history.filter((h) => h.last_status === 'failed').length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">失敗した実行はありません</p>
              ) : (
                history.filter((h) => h.last_status === 'failed').map((h, i) => (
                  <div key={i} className="flex items-center gap-3 px-6 py-3">
                    <div className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{h.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(h.last_run_at)}</p>
                    </div>
                    <Badge variant="danger">失敗</Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function TaskIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
    </svg>
  );
}

function StatsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}
