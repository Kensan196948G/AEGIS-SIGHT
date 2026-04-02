'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { DonutChart, BarChart } from '@/components/ui/chart';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SessionType = 'local' | 'rdp' | 'vpn' | 'citrix';
type ActivityType = 'app_launch' | 'web_access' | 'file_access' | 'print' | 'email';

interface UserSessionItem {
  id: string;
  device_id: string | null;
  user_name: string;
  session_type: SessionType;
  source_ip: string | null;
  source_hostname: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  is_active: boolean;
}

interface UserActivityItem {
  id: string;
  device_id: string | null;
  user_name: string;
  activity_type: ActivityType;
  detail: Record<string, unknown> | null;
  occurred_at: string;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockActiveSessions: UserSessionItem[] = [
  {
    id: '1',
    device_id: 'dev-001',
    user_name: 'tanaka.taro',
    session_type: 'rdp',
    source_ip: '192.168.1.50',
    source_hostname: 'REMOTE-PC-01',
    started_at: '2026-03-27T08:30:00Z',
    ended_at: null,
    duration_minutes: null,
    is_active: true,
  },
  {
    id: '2',
    device_id: 'dev-002',
    user_name: 'suzuki.hanako',
    session_type: 'vpn',
    source_ip: '10.0.0.15',
    source_hostname: 'HOME-PC-SUZUKI',
    started_at: '2026-03-27T09:00:00Z',
    ended_at: null,
    duration_minutes: null,
    is_active: true,
  },
  {
    id: '3',
    device_id: 'dev-003',
    user_name: 'yamada.ichiro',
    session_type: 'local',
    source_ip: null,
    source_hostname: null,
    started_at: '2026-03-27T07:45:00Z',
    ended_at: null,
    duration_minutes: null,
    is_active: true,
  },
  {
    id: '4',
    device_id: 'dev-004',
    user_name: 'sato.yuki',
    session_type: 'citrix',
    source_ip: '172.16.0.100',
    source_hostname: 'CITRIX-GW-01',
    started_at: '2026-03-27T08:15:00Z',
    ended_at: null,
    duration_minutes: null,
    is_active: true,
  },
  {
    id: '5',
    device_id: 'dev-005',
    user_name: 'takahashi.mei',
    session_type: 'rdp',
    source_ip: '192.168.2.30',
    source_hostname: 'REMOTE-PC-05',
    started_at: '2026-03-27T09:30:00Z',
    ended_at: null,
    duration_minutes: null,
    is_active: true,
  },
  {
    id: '6',
    device_id: 'dev-006',
    user_name: 'watanabe.ken',
    session_type: 'vpn',
    source_ip: '10.0.0.22',
    source_hostname: 'HOME-PC-WATANABE',
    started_at: '2026-03-27T10:00:00Z',
    ended_at: null,
    duration_minutes: null,
    is_active: true,
  },
];

const mockAnalytics = {
  total_sessions: 1247,
  active_sessions: 6,
  by_type: { local: 523, rdp: 412, vpn: 198, citrix: 114 },
  by_user: [
    { user_name: 'tanaka.taro', session_count: 145, total_minutes: 43200 },
    { user_name: 'suzuki.hanako', session_count: 132, total_minutes: 38400 },
    { user_name: 'yamada.ichiro', session_count: 118, total_minutes: 35100 },
    { user_name: 'sato.yuki', session_count: 105, total_minutes: 31200 },
    { user_name: 'takahashi.mei', session_count: 98, total_minutes: 28800 },
  ],
  peak_hours: [
    { hour: 7, count: 45 },
    { hour: 8, count: 152 },
    { hour: 9, count: 198 },
    { hour: 10, count: 175 },
    { hour: 11, count: 160 },
    { hour: 12, count: 88 },
    { hour: 13, count: 145 },
    { hour: 14, count: 168 },
    { hour: 15, count: 155 },
    { hour: 16, count: 130 },
    { hour: 17, count: 95 },
    { hour: 18, count: 42 },
  ],
};

const mockActivities: UserActivityItem[] = [
  {
    id: 'a1',
    device_id: 'dev-001',
    user_name: 'tanaka.taro',
    activity_type: 'app_launch',
    detail: { app_name: 'Microsoft Excel', path: 'C:\\Program Files\\Microsoft Office\\excel.exe' },
    occurred_at: '2026-03-27T09:45:00Z',
  },
  {
    id: 'a2',
    device_id: 'dev-002',
    user_name: 'suzuki.hanako',
    activity_type: 'web_access',
    detail: { url: 'https://sharepoint.company.com/sites/project', browser: 'Edge' },
    occurred_at: '2026-03-27T09:40:00Z',
  },
  {
    id: 'a3',
    device_id: 'dev-001',
    user_name: 'tanaka.taro',
    activity_type: 'file_access',
    detail: { file_path: '\\\\NAS01\\shared\\reports\\Q1_2026.xlsx', action: 'open' },
    occurred_at: '2026-03-27T09:35:00Z',
  },
  {
    id: 'a4',
    device_id: 'dev-003',
    user_name: 'yamada.ichiro',
    activity_type: 'print',
    detail: { printer: 'PRINTER-3F-01', document: 'invoice_2026_03.pdf', pages: 3 },
    occurred_at: '2026-03-27T09:30:00Z',
  },
  {
    id: 'a5',
    device_id: 'dev-004',
    user_name: 'sato.yuki',
    activity_type: 'email',
    detail: { subject: 'Monthly Report', recipients: 3, has_attachment: true },
    occurred_at: '2026-03-27T09:25:00Z',
  },
  {
    id: 'a6',
    device_id: 'dev-005',
    user_name: 'takahashi.mei',
    activity_type: 'app_launch',
    detail: { app_name: 'Visual Studio Code', path: 'C:\\Users\\takahashi\\AppData\\Local\\Programs\\VSCode\\code.exe' },
    occurred_at: '2026-03-27T09:20:00Z',
  },
  {
    id: 'a7',
    device_id: 'dev-002',
    user_name: 'suzuki.hanako',
    activity_type: 'file_access',
    detail: { file_path: '\\\\NAS01\\shared\\design\\mockup_v3.fig', action: 'download' },
    occurred_at: '2026-03-27T09:15:00Z',
  },
  {
    id: 'a8',
    device_id: 'dev-006',
    user_name: 'watanabe.ken',
    activity_type: 'web_access',
    detail: { url: 'https://jira.company.com/browse/PROJ-1234', browser: 'Chrome' },
    occurred_at: '2026-03-27T09:10:00Z',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sessionTypeConfig: Record<SessionType, { label: string; color: string; bgColor: string }> = {
  local: { label: 'Local', color: 'text-gray-700 dark:text-gray-300', bgColor: 'bg-gray-100 dark:bg-gray-700' },
  rdp: { label: 'RDP', color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-100 dark:bg-blue-900/40' },
  vpn: { label: 'VPN', color: 'text-green-700 dark:text-green-300', bgColor: 'bg-green-100 dark:bg-green-900/40' },
  citrix: { label: 'Citrix', color: 'text-purple-700 dark:text-purple-300', bgColor: 'bg-purple-100 dark:bg-purple-900/40' },
};

const activityTypeConfig: Record<ActivityType, { label: string; icon: string }> = {
  app_launch: { label: 'App Launch', icon: 'rocket' },
  web_access: { label: 'Web Access', icon: 'globe' },
  file_access: { label: 'File Access', icon: 'folder' },
  print: { label: 'Print', icon: 'printer' },
  email: { label: 'Email', icon: 'mail' },
};

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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

type Tab = 'active' | 'analytics' | 'activities';

function SessionTypeBadge({ type }: { type: SessionType }) {
  const cfg = sessionTypeConfig[type];
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
  const types: SessionType[] = ['local', 'rdp', 'vpn', 'citrix'];
  const colors: Record<SessionType, string> = {
    local: '#6b7280',
    rdp: '#3b82f6',
    vpn: '#22c55e',
    citrix: '#a855f7',
  };

  // Build conic gradient
  let cumulative = 0;
  const stops = types.map((t) => {
    const pct = (data[t] || 0) / total;
    const start = cumulative;
    cumulative += pct;
    return `${colors[t]} ${start * 100}% ${cumulative * 100}%`;
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
          {types.map((t) => {
            const pct = ((data[t] || 0) / total * 100).toFixed(1);
            return (
              <div key={t} className="flex items-center gap-2 text-sm">
                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: colors[t] }} />
                <span className="text-gray-700 dark:text-gray-300">
                  {sessionTypeConfig[t].label}: {data[t] || 0} ({pct}%)
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
          {data.map((u) => (
            <tr key={u.user_name} className="border-b border-gray-100 dark:border-aegis-border/50">
              <td className="py-2 text-gray-900 dark:text-white">{u.user_name}</td>
              <td className="py-2 text-right text-gray-700 dark:text-gray-300">{u.session_count}</td>
              <td className="py-2 text-right text-gray-700 dark:text-gray-300">
                {(u.total_minutes / 60).toFixed(1)}h
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SessionsPage() {
  const [tab, setTab] = useState<Tab>('active');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'active', label: 'Active Sessions' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'activities', label: 'Activity Timeline' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Session Management
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Monitor remote desktop sessions, VPN connections, and user behavior
        </p>
      </div>

      {/* セッション概要チャート */}
      {(() => {
        const activeRate = Math.round((mockAnalytics.active_sessions / 50) * 100); // 50 = estimated max
        const activeColor = activeRate >= 80 ? '#ef4444' : activeRate >= 50 ? '#f59e0b' : '#10b981';
        const typeBarData = Object.entries(mockAnalytics.by_type).map(([type, count], i) => ({
          label: type.toUpperCase(),
          value: count,
          color: ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500'][i] || 'bg-gray-400',
        }));
        return (
          <div className="aegis-card">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">セッション概要</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">アクティブセッション率</p>
                <DonutChart value={activeRate} max={100} size={140} strokeWidth={14} color={activeColor} label={`${mockAnalytics.active_sessions}件`} />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  累計 {mockAnalytics.total_sessions.toLocaleString()} セッション
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">セッション種別別件数</p>
                <BarChart data={typeBarData} maxValue={Math.max(...typeBarData.map(d => d.value))} height={160} showValues />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Sessions" value={mockAnalytics.total_sessions.toLocaleString()} sub="All time" />
        <StatCard title="Active Sessions" value={mockAnalytics.active_sessions} sub="Currently connected" />
        <StatCard title="RDP Sessions" value={mockAnalytics.by_type.rdp} sub={`${((mockAnalytics.by_type.rdp / mockAnalytics.total_sessions) * 100).toFixed(1)}% of total`} />
        <StatCard title="VPN Sessions" value={mockAnalytics.by_type.vpn} sub={`${((mockAnalytics.by_type.vpn / mockAnalytics.total_sessions) * 100).toFixed(1)}% of total`} />
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

      {/* Tab Content */}
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
                {mockActiveSessions.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-gray-100 last:border-b-0 dark:border-aegis-border/50 hover:bg-gray-50 dark:hover:bg-aegis-darker/50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.user_name}</td>
                    <td className="px-4 py-3">
                      <SessionTypeBadge type={s.session_type} />
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-mono text-xs">
                      {s.source_ip || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{s.source_hostname || '-'}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{formatTime(s.started_at)}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                      {elapsedMinutes(s.started_at)}min
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs text-green-700 dark:text-green-400">Active</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <PeakHoursChart data={mockAnalytics.peak_hours} />
            <TypeDistributionChart data={mockAnalytics.by_type} />
          </div>
          <UserUsageTable data={mockAnalytics.by_user} />
        </div>
      )}

      {tab === 'activities' && (
        <div className="rounded-xl border border-gray-200 bg-white dark:border-aegis-border dark:bg-aegis-surface">
          <div className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Recent User Activities</h3>
            <div className="space-y-0">
              {mockActivities.map((a, idx) => (
                <div
                  key={a.id}
                  className="relative flex gap-4 pb-6 last:pb-0"
                >
                  {/* Timeline line */}
                  {idx < mockActivities.length - 1 && (
                    <div className="absolute left-[15px] top-8 h-full w-px bg-gray-200 dark:bg-aegis-border" />
                  )}
                  {/* Icon */}
                  <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
                    <ActivityIcon type={a.activity_type} />
                  </div>
                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{a.user_name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {activityTypeConfig[a.activity_type].label}
                      </Badge>
                      <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                        {formatDateTime(a.occurred_at)}
                      </span>
                    </div>
                    {a.detail && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                        {Object.entries(a.detail)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' | ')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity Icon
// ---------------------------------------------------------------------------
function ActivityIcon({ type }: { type: ActivityType }) {
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
    case 'email':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
        </svg>
      );
  }
}
