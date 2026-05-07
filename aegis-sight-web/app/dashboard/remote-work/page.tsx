'use client';

import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { DonutChart, BarChart } from '@/components/ui/chart';
import {
  fetchRemoteWorkAnalytics,
  fetchActiveVPN,
  fetchRemoteAccessPolicies,
  type BackendRemoteWorkAnalytics,
  type BackendVPNConnection,
  type BackendRemoteAccessPolicy,
} from '@/lib/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type VPNProtocol = string;

const knownProtocols = ['ipsec', 'ssl', 'wireguard', 'l2tp'] as const;
type KnownProtocol = typeof knownProtocols[number];

const protocolConfig: Record<KnownProtocol, { label: string; color: string; bgColor: string }> = {
  ipsec:     { label: 'IPsec',     color: 'text-blue-700 dark:text-blue-300',   bgColor: 'bg-blue-100 dark:bg-blue-900/40' },
  ssl:       { label: 'SSL',       color: 'text-green-700 dark:text-green-300', bgColor: 'bg-green-100 dark:bg-green-900/40' },
  wireguard: { label: 'WireGuard', color: 'text-purple-700 dark:text-purple-300', bgColor: 'bg-purple-100 dark:bg-purple-900/40' },
  l2tp:      { label: 'L2TP',      color: 'text-orange-700 dark:text-orange-300', bgColor: 'bg-orange-100 dark:bg-orange-900/40' },
};

function getProtocolConfig(protocol: VPNProtocol) {
  const key = protocol.toLowerCase() as KnownProtocol;
  return protocolConfig[key] ?? { label: protocol.toUpperCase(), color: 'text-gray-700 dark:text-gray-300', bgColor: 'bg-gray-100 dark:bg-gray-700/40' };
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function elapsedMinutes(startIso: string): number {
  const start = new Date(startIso).getTime();
  const now = Date.now();
  return Math.floor((now - start) / 60000);
}

function formatDayName(day: string): string {
  const map: Record<string, string> = {
    monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
    thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
  };
  return map[day.toLowerCase()] ?? day;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

type Tab = 'active' | 'analytics' | 'policies';

function ProtocolBadge({ protocol }: { protocol: VPNProtocol }) {
  const cfg = getProtocolConfig(protocol);
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color} ${cfg.bgColor}`}>
      {cfg.label}
    </span>
  );
}

function StatCard({ title, value, sub }: { title: string; value: string | number; sub?: string }) {
  return (
    <div className="aegis-card">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
    </div>
  );
}

function PeakHoursChart({ data }: { data: { hour: number; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="aegis-card">
      <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">VPN Peak Hours</h3>
      <div className="flex items-end gap-1.5" style={{ height: 160 }}>
        {data.map((d) => (
          <div key={d.hour} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t bg-primary-500 dark:bg-primary-400 transition-all"
              style={{ height: `${(d.count / max) * 140}px` }}
              title={`${d.hour}:00 - ${d.count} connections`}
            />
            <span className="text-[10px] text-gray-500 dark:text-gray-400">{d.hour}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProtocolDistributionChart({ data }: { data: Record<string, number> }) {
  const total = Object.values(data).reduce((s, v) => s + v, 0) || 1;
  const protocols = Object.keys(data);
  const colorPalette = ['#3b82f6', '#22c55e', '#a855f7', '#f97316', '#06b6d4', '#ec4899'];
  const colorMap: Record<string, string> = {};
  protocols.forEach((p, i) => { colorMap[p] = colorPalette[i % colorPalette.length]; });

  let cumulative = 0;
  const stops = protocols.map((p) => {
    const pct = (data[p] || 0) / total;
    const start = cumulative;
    cumulative += pct;
    return `${colorMap[p]} ${start * 100}% ${cumulative * 100}%`;
  });

  return (
    <div className="aegis-card">
      <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Protocol Distribution</h3>
      <div className="flex items-center gap-6">
        <div
          className="h-32 w-32 shrink-0 rounded-full"
          style={{ background: stops.length ? `conic-gradient(${stops.join(', ')})` : '#e5e7eb' }}
        />
        <div className="space-y-2">
          {protocols.map((p) => {
            const pct = ((data[p] || 0) / total * 100).toFixed(1);
            const cfg = getProtocolConfig(p);
            return (
              <div key={p} className="flex items-center gap-2 text-sm">
                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: colorMap[p] }} />
                <span className="text-gray-700 dark:text-gray-300">
                  {cfg.label}: {data[p] || 0} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BandwidthCard({ sent, received }: { sent: number; received: number }) {
  return (
    <div className="aegis-card">
      <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Bandwidth Usage (Total)</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Sent</p>
          <p className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400">{formatBytes(sent)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Received</p>
          <p className="mt-1 text-xl font-bold text-green-600 dark:text-green-400">{formatBytes(received)}</p>
        </div>
      </div>
    </div>
  );
}

function TopUsersTable({ data }: { data: { user_name: string; connection_count: number; total_minutes: number }[] }) {
  return (
    <div className="aegis-card">
      <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Top VPN Users</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-aegis-border">
            <th className="pb-2 text-left font-medium text-gray-500 dark:text-gray-400">User</th>
            <th className="pb-2 text-right font-medium text-gray-500 dark:text-gray-400">Connections</th>
            <th className="pb-2 text-right font-medium text-gray-500 dark:text-gray-400">Total Hours</th>
          </tr>
        </thead>
        <tbody>
          {data.map((u) => (
            <tr key={u.user_name} className="border-b border-gray-100 dark:border-aegis-border/50">
              <td className="py-2 text-gray-900 dark:text-white">{u.user_name}</td>
              <td className="py-2 text-right text-gray-700 dark:text-gray-300">{u.connection_count}</td>
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

// Loading skeleton
function SkeletonCard() {
  return (
    <div className="aegis-card animate-pulse">
      <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="mt-2 h-8 w-20 rounded bg-gray-200 dark:bg-gray-700" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RemoteWorkPage() {
  const [tab, setTab] = useState<Tab>('active');
  const [analytics, setAnalytics] = useState<BackendRemoteWorkAnalytics | null>(null);
  const [vpnSessions, setVpnSessions] = useState<BackendVPNConnection[]>([]);
  const [policies, setPolicies] = useState<BackendRemoteAccessPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsRes, vpnRes, policiesRes] = await Promise.all([
        fetchRemoteWorkAnalytics(),
        fetchActiveVPN(0, 100),
        fetchRemoteAccessPolicies(0, 50),
      ]);
      setAnalytics(analyticsRes);
      setVpnSessions(vpnRes.items);
      setPolicies(policiesRes.items);
    } catch {
      setAnalytics(null);
      setVpnSessions([]);
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'active', label: 'Active VPN' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'policies', label: 'Policies' },
  ];

  const byProtocol = analytics?.by_protocol ?? {};
  const protocolBarData = Object.entries(byProtocol)
    .sort((a, b) => b[1] - a[1])
    .map(([proto, count], i) => ({
      label: proto.toUpperCase(),
      value: count,
      color: ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500'][i] || 'bg-gray-400',
    }));

  const maxActive = 50;
  const activeConnections = analytics?.active_connections ?? 0;
  const activeRate = Math.round((activeConnections / maxActive) * 100);
  const activeColor = activeRate >= 80 ? '#ef4444' : activeRate >= 50 ? '#f59e0b' : '#10b981';
  const utilizationRate = analytics?.utilization_rate ?? 0;
  const totalConnections = analytics?.total_connections ?? 0;
  const wireguardCount = byProtocol['wireguard'] ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Remote Work Management
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Monitor VPN connections, telework utilization, and remote access policies
        </p>
      </div>

      {/* Summary Chart */}
      {loading ? (
        <div className="aegis-card animate-pulse">
          <div className="h-6 w-40 rounded bg-gray-200 dark:bg-gray-700 mb-4" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col items-center gap-3">
              <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-36 w-36 rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="h-40 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      ) : (
        <div className="aegis-card">
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">リモートワーク概要</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">VPN同時接続率</p>
              <DonutChart
                value={activeRate}
                max={100}
                size={140}
                strokeWidth={14}
                color={activeColor}
                label={`${activeConnections}接続`}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                想定上限 {maxActive} に対して {activeRate}% 使用中
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">プロトコル別累計接続数</p>
              {protocolBarData.length > 0 ? (
                <BarChart
                  data={protocolBarData}
                  maxValue={Math.max(...protocolBarData.map((d) => d.value), 1)}
                  height={160}
                  showValues
                />
              ) : (
                <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">データなし</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Connections"
            value={totalConnections.toLocaleString()}
            sub="All time"
          />
          <StatCard
            title="Active VPN"
            value={activeConnections}
            sub="Currently connected"
          />
          <StatCard
            title="Utilization Rate"
            value={`${(utilizationRate * 100).toFixed(0)}%`}
            sub="Active / unique users"
          />
          <StatCard
            title="WireGuard"
            value={wireguardCount}
            sub={totalConnections > 0 ? `${((wireguardCount / totalConnections) * 100).toFixed(1)}% of total` : '—'}
          />
        </div>
      )}

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
        loading ? (
          <div className="aegis-card animate-pulse">
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 rounded bg-gray-200 dark:bg-gray-700" />
              ))}
            </div>
          </div>
        ) : vpnSessions.length === 0 ? (
          <div className="flex items-center justify-center aegis-card py-16">
            <p className="text-sm text-gray-500 dark:text-gray-400">データなし</p>
          </div>
        ) : (
          <div className="aegis-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-aegis-border">
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">User</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Protocol</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">VPN Server</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Client IP</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Connected</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Duration</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {vpnSessions.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-gray-100 last:border-b-0 dark:border-aegis-border/50 hover:bg-gray-50 dark:hover:bg-aegis-darker/50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{c.user_name}</td>
                      <td className="px-4 py-3">
                        <ProtocolBadge protocol={c.protocol} />
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">{c.vpn_server}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-mono text-xs">{c.client_ip}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{formatTime(c.connected_at)}</td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                        {c.duration_minutes !== null ? `${c.duration_minutes}min` : `${elapsedMinutes(c.connected_at)}min (接続中)`}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {c.is_active ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs text-green-700 dark:text-green-400">Active</span>
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500 dark:text-gray-400">Inactive</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {tab === 'analytics' && (
        loading ? (
          <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="h-56 rounded-xl bg-gray-200 dark:bg-gray-700" />
              <div className="h-56 rounded-xl bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        ) : analytics === null ? (
          <div className="flex items-center justify-center aegis-card py-16">
            <p className="text-sm text-gray-500 dark:text-gray-400">データなし</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <PeakHoursChart data={analytics.peak_hours} />
              <ProtocolDistributionChart data={analytics.by_protocol} />
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <BandwidthCard
                sent={analytics.total_bytes_sent}
                received={analytics.total_bytes_received}
              />
              <div className="aegis-card">
                <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Utilization</h3>
                <div className="flex items-center gap-4">
                  <div className="relative h-24 w-24">
                    <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
                      <circle
                        cx="18" cy="18" r="15.9155"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="text-gray-200 dark:text-gray-700"
                      />
                      <circle
                        cx="18" cy="18" r="15.9155"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray={`${utilizationRate * 100} ${100 - utilizationRate * 100}`}
                        className="text-primary-500 dark:text-primary-400"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {(utilizationRate * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {activeConnections} active out of {totalConnections.toLocaleString()} total
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Remote work adoption rate across the organization
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <TopUsersTable data={analytics.top_users} />
          </div>
        )
      )}

      {tab === 'policies' && (
        loading ? (
          <div className="space-y-4 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-gray-200 dark:bg-gray-700" />
            ))}
          </div>
        ) : policies.length === 0 ? (
          <div className="flex items-center justify-center aegis-card py-16">
            <p className="text-sm text-gray-500 dark:text-gray-400">データなし</p>
          </div>
        ) : (
          <div className="space-y-4">
            {policies.map((policy) => (
              <div
                key={policy.id}
                className="aegis-card"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                        {policy.name}
                      </h3>
                      <Badge
                        variant={policy.is_enabled ? 'default' : 'outline'}
                        className={policy.is_enabled ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : ''}
                      >
                        {policy.is_enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Allowed Hours: </span>
                        <span className="text-gray-900 dark:text-white">
                          {policy.allowed_hours_start} - {policy.allowed_hours_end}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Max Session: </span>
                        <span className="text-gray-900 dark:text-white">{policy.max_session_hours}h</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Days: </span>
                        <span className="text-gray-900 dark:text-white">
                          {policy.allowed_days.map(formatDayName).join(', ')}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">MFA Required: </span>
                        <span className={policy.require_mfa ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                          {policy.require_mfa ? 'Yes' : 'No'}
                        </span>
                      </div>
                      {policy.geo_restriction && (
                        <div className="col-span-2">
                          <span className="text-gray-500 dark:text-gray-400">Geo Restriction: </span>
                          <span className="text-gray-900 dark:text-white">
                            {(policy.geo_restriction['allowed_countries'] as string[] | undefined)?.join(', ') || 'None'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
