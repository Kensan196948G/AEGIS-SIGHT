'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type VPNProtocol = 'ipsec' | 'ssl' | 'wireguard' | 'l2tp';

interface VPNConnectionItem {
  id: string;
  device_id: string | null;
  user_name: string;
  vpn_server: string;
  client_ip: string;
  assigned_ip: string;
  protocol: VPNProtocol;
  connected_at: string;
  disconnected_at: string | null;
  duration_minutes: number | null;
  bytes_sent: number | null;
  bytes_received: number | null;
  is_active: boolean;
}

interface RemoteAccessPolicyItem {
  id: string;
  name: string;
  allowed_hours_start: string;
  allowed_hours_end: string;
  allowed_days: string[];
  require_mfa: boolean;
  max_session_hours: number;
  geo_restriction: Record<string, unknown> | null;
  is_enabled: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockActiveConnections: VPNConnectionItem[] = [
  {
    id: '1',
    device_id: 'dev-001',
    user_name: 'tanaka.taro',
    vpn_server: 'vpn-tokyo-01.company.com',
    client_ip: '203.0.113.10',
    assigned_ip: '10.8.0.2',
    protocol: 'wireguard',
    connected_at: '2026-03-27T08:15:00Z',
    disconnected_at: null,
    duration_minutes: null,
    bytes_sent: 524288000,
    bytes_received: 1073741824,
    is_active: true,
  },
  {
    id: '2',
    device_id: 'dev-002',
    user_name: 'suzuki.hanako',
    vpn_server: 'vpn-osaka-01.company.com',
    client_ip: '198.51.100.22',
    assigned_ip: '10.8.0.3',
    protocol: 'ssl',
    connected_at: '2026-03-27T09:00:00Z',
    disconnected_at: null,
    duration_minutes: null,
    bytes_sent: 262144000,
    bytes_received: 786432000,
    is_active: true,
  },
  {
    id: '3',
    device_id: 'dev-003',
    user_name: 'yamada.ichiro',
    vpn_server: 'vpn-tokyo-01.company.com',
    client_ip: '192.0.2.45',
    assigned_ip: '10.8.0.4',
    protocol: 'ipsec',
    connected_at: '2026-03-27T07:30:00Z',
    disconnected_at: null,
    duration_minutes: null,
    bytes_sent: 104857600,
    bytes_received: 419430400,
    is_active: true,
  },
  {
    id: '4',
    device_id: 'dev-004',
    user_name: 'sato.yuki',
    vpn_server: 'vpn-tokyo-02.company.com',
    client_ip: '203.0.113.88',
    assigned_ip: '10.8.0.5',
    protocol: 'wireguard',
    connected_at: '2026-03-27T08:45:00Z',
    disconnected_at: null,
    duration_minutes: null,
    bytes_sent: 157286400,
    bytes_received: 629145600,
    is_active: true,
  },
  {
    id: '5',
    device_id: 'dev-005',
    user_name: 'takahashi.mei',
    vpn_server: 'vpn-osaka-01.company.com',
    client_ip: '198.51.100.77',
    assigned_ip: '10.8.0.6',
    protocol: 'l2tp',
    connected_at: '2026-03-27T09:30:00Z',
    disconnected_at: null,
    duration_minutes: null,
    bytes_sent: 52428800,
    bytes_received: 209715200,
    is_active: true,
  },
  {
    id: '6',
    device_id: 'dev-006',
    user_name: 'watanabe.ken',
    vpn_server: 'vpn-tokyo-01.company.com',
    client_ip: '192.0.2.100',
    assigned_ip: '10.8.0.7',
    protocol: 'ssl',
    connected_at: '2026-03-27T10:00:00Z',
    disconnected_at: null,
    duration_minutes: null,
    bytes_sent: 31457280,
    bytes_received: 125829120,
    is_active: true,
  },
];

const mockAnalytics = {
  total_connections: 3842,
  active_connections: 6,
  by_protocol: { ipsec: 856, ssl: 1204, wireguard: 1432, l2tp: 350 },
  total_bytes_sent: 2199023255552,
  total_bytes_received: 8796093022208,
  peak_hours: [
    { hour: 7, count: 32 },
    { hour: 8, count: 128 },
    { hour: 9, count: 185 },
    { hour: 10, count: 162 },
    { hour: 11, count: 148 },
    { hour: 12, count: 75 },
    { hour: 13, count: 135 },
    { hour: 14, count: 155 },
    { hour: 15, count: 140 },
    { hour: 16, count: 118 },
    { hour: 17, count: 85 },
    { hour: 18, count: 38 },
  ],
  utilization_rate: 0.72,
  top_users: [
    { user_name: 'tanaka.taro', connection_count: 245, total_minutes: 72000 },
    { user_name: 'suzuki.hanako', connection_count: 218, total_minutes: 65400 },
    { user_name: 'yamada.ichiro', connection_count: 195, total_minutes: 58500 },
    { user_name: 'sato.yuki', connection_count: 172, total_minutes: 51600 },
    { user_name: 'takahashi.mei', connection_count: 156, total_minutes: 46800 },
  ],
};

const mockPolicies: RemoteAccessPolicyItem[] = [
  {
    id: 'p1',
    name: 'Standard Remote Access',
    allowed_hours_start: '07:00',
    allowed_hours_end: '22:00',
    allowed_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    require_mfa: true,
    max_session_hours: 10,
    geo_restriction: { allowed_countries: ['JP'] },
    is_enabled: true,
    created_at: '2026-01-15T00:00:00Z',
  },
  {
    id: 'p2',
    name: 'Weekend Maintenance',
    allowed_hours_start: '09:00',
    allowed_hours_end: '18:00',
    allowed_days: ['saturday', 'sunday'],
    require_mfa: true,
    max_session_hours: 8,
    geo_restriction: { allowed_countries: ['JP'] },
    is_enabled: true,
    created_at: '2026-02-01T00:00:00Z',
  },
  {
    id: 'p3',
    name: 'Global Partner Access',
    allowed_hours_start: '00:00',
    allowed_hours_end: '23:59',
    allowed_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    require_mfa: true,
    max_session_hours: 12,
    geo_restriction: { allowed_countries: ['JP', 'US', 'SG'] },
    is_enabled: false,
    created_at: '2026-03-01T00:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const protocolConfig: Record<VPNProtocol, { label: string; color: string; bgColor: string }> = {
  ipsec: { label: 'IPsec', color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-100 dark:bg-blue-900/40' },
  ssl: { label: 'SSL', color: 'text-green-700 dark:text-green-300', bgColor: 'bg-green-100 dark:bg-green-900/40' },
  wireguard: { label: 'WireGuard', color: 'text-purple-700 dark:text-purple-300', bgColor: 'bg-purple-100 dark:bg-purple-900/40' },
  l2tp: { label: 'L2TP', color: 'text-orange-700 dark:text-orange-300', bgColor: 'bg-orange-100 dark:bg-orange-900/40' },
};

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
    monday: 'Mon',
    tuesday: 'Tue',
    wednesday: 'Wed',
    thursday: 'Thu',
    friday: 'Fri',
    saturday: 'Sat',
    sunday: 'Sun',
  };
  return map[day] || day;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

type Tab = 'active' | 'analytics' | 'policies';

function ProtocolBadge({ protocol }: { protocol: VPNProtocol }) {
  const cfg = protocolConfig[protocol];
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
  const protocols: VPNProtocol[] = ['ipsec', 'ssl', 'wireguard', 'l2tp'];
  const colors: Record<VPNProtocol, string> = {
    ipsec: '#3b82f6',
    ssl: '#22c55e',
    wireguard: '#a855f7',
    l2tp: '#f97316',
  };

  let cumulative = 0;
  const stops = protocols.map((p) => {
    const pct = (data[p] || 0) / total;
    const start = cumulative;
    cumulative += pct;
    return `${colors[p]} ${start * 100}% ${cumulative * 100}%`;
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-aegis-border dark:bg-aegis-surface">
      <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Protocol Distribution</h3>
      <div className="flex items-center gap-6">
        <div
          className="h-32 w-32 shrink-0 rounded-full"
          style={{ background: `conic-gradient(${stops.join(', ')})` }}
        />
        <div className="space-y-2">
          {protocols.map((p) => {
            const pct = ((data[p] || 0) / total * 100).toFixed(1);
            return (
              <div key={p} className="flex items-center gap-2 text-sm">
                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: colors[p] }} />
                <span className="text-gray-700 dark:text-gray-300">
                  {protocolConfig[p].label}: {data[p] || 0} ({pct}%)
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
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-aegis-border dark:bg-aegis-surface">
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
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-aegis-border dark:bg-aegis-surface">
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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RemoteWorkPage() {
  const [tab, setTab] = useState<Tab>('active');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'active', label: 'Active VPN' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'policies', label: 'Policies' },
  ];

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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Connections"
          value={mockAnalytics.total_connections.toLocaleString()}
          sub="All time"
        />
        <StatCard
          title="Active VPN"
          value={mockAnalytics.active_connections}
          sub="Currently connected"
        />
        <StatCard
          title="Utilization Rate"
          value={`${(mockAnalytics.utilization_rate * 100).toFixed(0)}%`}
          sub="Active / unique users"
        />
        <StatCard
          title="WireGuard"
          value={mockAnalytics.by_protocol.wireguard}
          sub={`${((mockAnalytics.by_protocol.wireguard / mockAnalytics.total_connections) * 100).toFixed(1)}% of total`}
        />
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
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Protocol</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">VPN Server</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Client IP</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Assigned IP</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Connected</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Duration</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Traffic</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {mockActiveConnections.map((c) => (
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
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-mono text-xs">{c.assigned_ip}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{formatTime(c.connected_at)}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                      {elapsedMinutes(c.connected_at)}min
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 text-xs">
                      <span className="text-blue-600 dark:text-blue-400">{formatBytes(c.bytes_sent)}</span>
                      {' / '}
                      <span className="text-green-600 dark:text-green-400">{formatBytes(c.bytes_received)}</span>
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
            <ProtocolDistributionChart data={mockAnalytics.by_protocol} />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <BandwidthCard
              sent={mockAnalytics.total_bytes_sent}
              received={mockAnalytics.total_bytes_received}
            />
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-aegis-border dark:bg-aegis-surface">
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
                      strokeDasharray={`${mockAnalytics.utilization_rate * 100} ${100 - mockAnalytics.utilization_rate * 100}`}
                      className="text-primary-500 dark:text-primary-400"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {(mockAnalytics.utilization_rate * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {mockAnalytics.active_connections} active out of {mockAnalytics.total_connections.toLocaleString()} total
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Remote work adoption rate across the organization
                  </p>
                </div>
              </div>
            </div>
          </div>
          <TopUsersTable data={mockAnalytics.top_users} />
        </div>
      )}

      {tab === 'policies' && (
        <div className="space-y-4">
          {mockPolicies.map((policy) => (
            <div
              key={policy.id}
              className="rounded-xl border border-gray-200 bg-white p-5 dark:border-aegis-border dark:bg-aegis-surface"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      {policy.name}
                    </h3>
                    <Badge
                      variant={policy.is_enabled ? 'default' : 'secondary'}
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
                          {(policy.geo_restriction.allowed_countries as string[])?.join(', ') || 'None'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
