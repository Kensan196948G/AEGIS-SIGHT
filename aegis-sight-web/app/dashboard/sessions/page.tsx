'use client';

import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { DonutChart, BarChart } from '@/components/ui/chart';
import {
  fetchSessionAnalytics,
  fetchActiveSessions,
  fetchActivities,
  type BackendSessionAnalytics,
  type BackendSessionResponse,
  type BackendActivityResponse,
} from '@/lib/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function elapsedMinutes(startIso: string): number {
  const start = new Date(startIso).getTime();
  const now = Date.now();
  return Math.floor((now - start) / 60000);
}

const SESSION_TYPE_STYLE: Record<string, { label: string; color: string; bgColor: string }> = {
  local: { label: 'Local', color: 'text-gray-700 dark:text-gray-300', bgColor: 'bg-gray-100 dark:bg-gray-700' },
  rdp: { label: 'RDP', color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-100 dark:bg-blue-900/40' },
  vpn: { label: 'VPN', color: 'text-green-700 dark:text-green-300', bgColor: 'bg-green-100 dark:bg-green-900/40' },
  citrix: { label: 'Citrix', color: 'text-purple-700 dark:text-purple-300', bgColor: 'bg-purple-100 dark:bg-purple-900/40' },
};

function SessionTypeBadge({ type }: { type: string }) {
  const cfg = SESSION_TYPE_STYLE[type] ?? { label: type, color: 'text-gray-700 dark:text-gray-300', bgColor: 'bg-gray-100 dark:bg-gray-700' };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color} ${cfg.bgColor}`}>
      {cfg.label}
    </span>
  );
}

function StatCard({ title, value, sub }: { title: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-aegis-border dark:bg-aegis-surface">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
    </div>
  );
}

function PeakHoursChart({ data }: { data: { hour: number; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-aegis-border dark:bg-aegis-surface">
      <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Peak Hours (Sessions Started)</h3>
      <div className="flex items-end gap-1.5" style={{ height: 160 }}>
        {data.map((d) => (
          <div key={d.hour} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t bg-primary-500 dark:bg-primary-400 transition-all"
              style={{ height: `${(d.count / max) * 140}px` }}
              title={`${d.hour}:00 - ${d.count} sessions`}
            />
            <span className="text-[10px] text-gray-500 dark:text-gray-400">{d.hour}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TypeDistributionChart({ data }: { data: Record<string, number> }) {
  const total = Object.values(data).reduce((s, v) => s + v, 0) || 1;
  const types = Object.keys(data);
  const colors: Record<string, string> = {
    local: '#6b7280',
    rdp: '#3b82f6',
    vpn: '#22c55e',
    citrix: '#a855f7',
  };
  const fallbackColors = ['#6b7280', '#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ef4444'];

  let cumulative = 0;
  const stops = types.map((t, i) => {
    const pct = (data[t] || 0) / total;
    const start = cumulative;
    cumulative += pct;
    const color = colors[t] ?? fallbackColors[i % fallbackColors.length];
    return `${color} ${start * 100}% ${cumulative * 100}%`;
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-aegis-border dark:bg-aegis-surface">
      <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Session Type Distribution</h3>
      <div className="flex items-center gap-6">
        <div
          className="h-32 w-32 shrink-0 rounded-full"
          style={{ background: `conic-gradient(${stops.join(', ')})` }}
        />
        <div className="space-y-2">
          {types.map((t, i) => {
            const color = colors[t] ?? fallbackColors[i % fallbackColors.length];
            const pct = ((data[t] || 0) / total * 100).toFixed(1);
            const cfg = SESSION_TYPE_STYLE[t];
            return (
              <div key={t} className="flex items-center gap-2 text-sm">
                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-gray-700 dark:text-gray-300">
                  {cfg?.label ?? t}: {data[t] || 0} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function UserUsageTable({ data }: { data: { user_name: string; session_count: number; total_minutes: number }[] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-aegis-border dark:bg-aegis-surface">
      <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Top Users by Session Count</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-aegis-border">
            <th className="pb-2 text-left font-medium text-gray-500 dark:text-gray-400">User</th>
            <th className="pb-2 text-right font-medium text-gray-500 dark:text-gray-400">Sessions</th>
            <th className="pb-2 text-right font-medium text-gray-500 dark:text-gray-400">Total Hours</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={3} className="py-6 text-center text-gray-400 dark:text-gray-500">データなし</td>
            </tr>
          ) : (
            data.map((u) => (
              <tr key={u.user_name} className="border-b border-gray-100 dark:border-aegis-border/50">
                <td className="py-2 text-gray-900 dark:text-white">{u.user_name}</td>
                <td className="py-2 text-right text-gray-700 dark:text-gray-300">{u.session_count}</td>
                <td className="py-2 text-right text-gray-700 dark:text-gray-300">
                  {(u.total_minutes / 60).toFixed(1)}h
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton helpers
// ---------------------------------------------------------------------------
function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-aegis-border dark:bg-aegis-surface animate-pulse">
      <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="mt-2 h-8 w-16 rounded bg-gray-200 dark:bg-gray-700" />
    </div>
  );
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-gray-100 dark:border-aegis-border/50 animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-gray-200 dark:bg-gray-700" style={{ width: `${60 + (i % 3) * 20}%` }} />
        </td>
      ))}
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Activity Icon
// ---------------------------------------------------------------------------
function ActivityIcon({ type }: { type: string }) {
  const cls = 'h-4 w-4 text-primary-600 dark:text-primary-400';
  switch (type) {
    case 'app_launch':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
        </svg>
      );
    case 'web_access':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A8.966 8.966 0 0 1 3 12c0-1.264.26-2.467.732-3.558" />
        </svg>
      );
    case 'file_access':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
        </svg>
      );
    case 'print':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
        </svg>
      );
    default:
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
        </svg>
      );
  }
}

// ---------------------------------------------------------------------------
// Tab type
// ---------------------------------------------------------------------------
type Tab = 'active' | 'analytics' | 'activities';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function SessionsPage() {
  const [tab, setTab] = useState<Tab>('active');
  const [analytics, setAnalytics] = useState<BackendSessionAnalytics | null>(null);
  const [sessions, setSessions] = useState<BackendSessionResponse[]>([]);
  const [activities, setActivities] = useState<BackendActivityResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsData, sessionsData, activitiesData] = await Promise.all([
        fetchSessionAnalytics(),
        fetchActiveSessions(0, 100),
        fetchActivities(0, 100),
      ]);
      setAnalytics(analyticsData);
      setSessions(sessionsData.items);
      setActivities(activitiesData.items);
    } catch {
      setAnalytics(null);
      setSessions([]);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'active', label: 'Active Sessions' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'activities', label: 'Activity Timeline' },
  ];

  // Derived stats
  const totalSessions = analytics?.total_sessions ?? 0;
  const activeSessions = analytics?.active_sessions ?? 0;
  const byType = analytics?.by_type ?? {};
  const byUser = analytics?.by_user ?? [];
  const peakHours = analytics?.peak_hours ?? [];

  // Unique users from sessions
  const uniqueUsers = new Set(sessions.map((s) => s.user_name)).size;

  // Avg duration
  const durSessions = sessions.filter((s) => s.duration_minutes != null);
  const avgDuration = durSessions.length > 0
    ? Math.round(durSessions.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0) / durSessions.length)
    : null;

  // Chart data
  const typeBarData = Object.entries(byType).map(([type, count], i) => ({
    label: (SESSION_TYPE_STYLE[type]?.label ?? type).toUpperCase(),
    value: count,
    color: ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500'][i] || 'bg-gray-400',
  }));
  const activeRate = Math.round((activeSessions / Math.max(totalSessions, 1)) * 100);
  const activeColor = activeRate >= 80 ? '#ef4444' : activeRate >= 50 ? '#f59e0b' : '#10b981';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Session Management</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Monitor remote desktop sessions, VPN connections, and user behavior
        </p>
      </div>

      {/* Overview chart */}
      <div className="aegis-card">
        <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">セッション概要</h2>
        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 animate-pulse">
            <div className="flex flex-col items-center gap-3">
              <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-36 w-36 rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="space-y-3">
              <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-40 w-full rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">アクティブセッション数</p>
              <DonutChart value={activeSessions} max={Math.max(totalSessions, 1)} size={140} strokeWidth={14} color={activeColor} label={`${activeSessions}件`} />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                累計 {totalSessions.toLocaleString()} セッション
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">セッション種別別件数</p>
              {typeBarData.length > 0 ? (
                <BarChart data={typeBarData} maxValue={Math.max(...typeBarData.map((d) => d.value), 1)} height={160} showValues />
              ) : (
                <div className="flex h-40 items-center justify-center text-sm text-gray-400">データなし</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard title="Total Sessions" value={totalSessions.toLocaleString()} sub="All time" />
            <StatCard title="Active Sessions" value={activeSessions} sub="Currently connected" />
            <StatCard title="Unique Users" value={uniqueUsers} sub="In active sessions" />
            <StatCard
              title="Avg Duration"
              value={avgDuration != null ? `${avgDuration}min` : 'N/A'}
              sub="Completed sessions"
            />
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-aegis-border">
        <nav className="-mb-px flex gap-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: Active Sessions */}
      {tab === 'active' && (
        <div className="rounded-xl border border-gray-200 bg-white dark:border-aegis-border dark:bg-aegis-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-aegis-border">
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">User</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Source IP</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Hostname</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Started</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Duration</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
                ) : sessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                      データなし
                    </td>
                  </tr>
                ) : (
                  sessions.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-gray-100 last:border-b-0 dark:border-aegis-border/50 hover:bg-gray-50 dark:hover:bg-aegis-darker/50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.user_name}</td>
                      <td className="px-4 py-3">
                        <SessionTypeBadge type={s.session_type} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                        {s.source_ip || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{s.source_hostname || '-'}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{formatTime(s.started_at)}</td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                        {s.duration_minutes != null
                          ? `${s.duration_minutes}min`
                          : `${elapsedMinutes(s.started_at)}min`}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {s.is_active ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs text-green-700 dark:text-green-400">Active</span>
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500 dark:text-gray-400">Inactive</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Analytics */}
      {tab === 'analytics' && (
        <div className="space-y-6">
          {loading ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 animate-pulse">
              <div className="h-48 rounded-xl bg-gray-200 dark:bg-gray-700" />
              <div className="h-48 rounded-xl bg-gray-200 dark:bg-gray-700" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <PeakHoursChart data={peakHours} />
                <TypeDistributionChart data={byType} />
              </div>
              <UserUsageTable data={byUser} />
            </>
          )}
        </div>
      )}

      {/* Tab: Activity Timeline */}
      {tab === 'activities' && (
        <div className="rounded-xl border border-gray-200 bg-white dark:border-aegis-border dark:bg-aegis-surface">
          <div className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Recent User Activities</h3>
            {loading ? (
              <div className="space-y-4 animate-pulse">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="h-8 w-8 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-700" />
                      <div className="h-3 w-64 rounded bg-gray-200 dark:bg-gray-700" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activities.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">データなし</div>
            ) : (
              <div className="space-y-0">
                {activities.map((a, idx) => (
                  <div key={a.id} className="relative flex gap-4 pb-6 last:pb-0">
                    {idx < activities.length - 1 && (
                      <div className="absolute left-[15px] top-8 h-full w-px bg-gray-200 dark:bg-aegis-border" />
                    )}
                    <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
                      <ActivityIcon type={a.activity_type} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{a.user_name}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {a.activity_type.replace(/_/g, ' ')}
                        </Badge>
                        <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                          {formatDateTime(a.occurred_at)}
                        </span>
                      </div>
                      {a.detail && (
                        <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
                          {Object.entries(a.detail)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(' | ')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
