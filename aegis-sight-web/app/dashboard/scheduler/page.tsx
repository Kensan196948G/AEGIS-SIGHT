'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';

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
}

interface TaskHistoryEntry {
  id: string;
  name: string;
  task_type: string;
  last_run_at: string | null;
  last_status: 'success' | 'failed' | 'running' | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const TASK_TYPE_LABELS: Record<string, string> = {
  sam_check: 'SAMチェック',
  m365_sync: 'M365同期',
  report_generation: 'レポート生成',
  backup: 'バックアップ',
  cleanup: 'クリーンアップ',
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  success: { label: '成功', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  failed: { label: '失敗', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
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
  const d = new Date(iso);
  return d.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function SchedulerPage() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [history, setHistory] = useState<TaskHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'history'>('tasks');

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
      setTasks(data.items || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'タスクの取得に失敗しました');
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
      setHistory(data || []);
    } catch {
      // Non-critical -- silently fail
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchTasks(), fetchHistory()]).finally(() => setLoading(false));
  }, [fetchTasks, fetchHistory]);

  // ---- Actions ----

  async function toggleTask(task: ScheduledTask) {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/scheduler/tasks/${task.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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
    if (!token) return;
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            スケジューラ管理
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            定期実行タスクの管理と実行履歴の確認
          </p>
        </div>
        {actionMessage && (
          <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            {actionMessage}
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-4 underline">
            閉じる
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1 dark:border-aegis-border dark:bg-aegis-dark">
        {([
          { key: 'tasks' as const, label: 'タスク一覧', icon: TaskIcon },
          { key: 'history' as const, label: '実行履歴', icon: HistoryIcon },
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
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    タスク名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    タイプ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    スケジュール
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    最終実行
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    有効
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    アクション
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-aegis-border">
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                      スケジュールタスクがありません
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-aegis-dark/30">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {task.name}
                          </p>
                          {task.description && (
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          {TASK_TYPE_LABELS[task.task_type] || task.task_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-600 dark:text-gray-400">
                        {task.cron_expression}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {formatDateTime(task.last_run_at)}
                      </td>
                      <td className="px-6 py-4">
                        {task.last_status ? (
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              STATUS_CONFIG[task.last_status]?.color || ''
                            }`}
                          >
                            {STATUS_CONFIG[task.last_status]?.label || task.last_status}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">--</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={task.is_enabled}
                          onClick={() => toggleTask(task)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                            task.is_enabled
                              ? 'bg-primary-600'
                              : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                              task.is_enabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
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
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
            実行履歴タイムライン
          </h2>
          {history.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              実行履歴がありません
            </p>
          ) : (
            <div className="space-y-0">
              {history.map((entry, index) => (
                <div key={`${entry.id}-${index}`} className="relative flex gap-4 pb-6">
                  {/* Timeline line */}
                  {index < history.length - 1 && (
                    <div className="absolute left-[15px] top-8 h-full w-px bg-gray-200 dark:bg-aegis-border" />
                  )}
                  {/* Timeline dot */}
                  <div
                    className={`relative z-10 mt-1 h-[30px] w-[30px] shrink-0 rounded-full border-2 ${
                      entry.last_status === 'success'
                        ? 'border-emerald-500 bg-emerald-100 dark:bg-emerald-900/30'
                        : entry.last_status === 'failed'
                        ? 'border-red-500 bg-red-100 dark:bg-red-900/30'
                        : entry.last_status === 'running'
                        ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/30'
                        : 'border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800'
                    } flex items-center justify-center`}
                  >
                    {entry.last_status === 'success' && (
                      <CheckIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                    {entry.last_status === 'failed' && (
                      <XIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                    )}
                    {entry.last_status === 'running' && (
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    )}
                  </div>
                  {/* Content */}
                  <div className="flex-1 pt-0.5">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {entry.name}
                      </p>
                      <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        {TASK_TYPE_LABELS[entry.task_type] || entry.task_type}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {formatDateTime(entry.last_run_at)}
                      {entry.last_status && (
                        <span className="ml-2">
                          {STATUS_CONFIG[entry.last_status]?.label || entry.last_status}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
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
