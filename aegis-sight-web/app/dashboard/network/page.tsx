'use client';

import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

// ---------------------------------------------------------------------------
// Mock data (to be replaced with API calls)
// ---------------------------------------------------------------------------

const ipRanges = [
  { id: '1', networkAddress: '192.168.1.0/24', name: '本社 オフィスLAN', vlanId: 10, gateway: '192.168.1.1', dhcpEnabled: true, location: '本社', totalHosts: 254, assignedCount: 187, activeCount: 165, utilization: 73.6 },
  { id: '2', networkAddress: '192.168.2.0/24', name: '本社 サーバーLAN', vlanId: 20, gateway: '192.168.2.1', dhcpEnabled: false, location: '本社', totalHosts: 254, assignedCount: 42, activeCount: 38, utilization: 16.5 },
  { id: '3', networkAddress: '10.0.1.0/24', name: '支社A ネットワーク', vlanId: 100, gateway: '10.0.1.1', dhcpEnabled: true, location: '支社', totalHosts: 254, assignedCount: 89, activeCount: 72, utilization: 35.0 },
  { id: '4', networkAddress: '10.0.2.0/24', name: '支社B ネットワーク', vlanId: 200, gateway: '10.0.2.1', dhcpEnabled: true, location: '支社', totalHosts: 254, assignedCount: 56, activeCount: 45, utilization: 22.0 },
  { id: '5', networkAddress: '172.16.0.0/24', name: '現場 臨時ネットワーク', vlanId: null, gateway: '172.16.0.1', dhcpEnabled: true, location: '現場', totalHosts: 254, assignedCount: 23, activeCount: 18, utilization: 9.1 },
];

const ipAssignments = [
  { id: '1', ipAddress: '192.168.1.10', macAddress: 'AA:BB:CC:DD:EE:01', hostname: 'PC-SALES-001', rangeName: '本社 オフィスLAN', assignmentType: 'static', status: 'active', lastSeen: '2026-03-27 09:15' },
  { id: '2', ipAddress: '192.168.1.50', macAddress: 'AA:BB:CC:DD:EE:02', hostname: 'PC-HR-015', rangeName: '本社 オフィスLAN', assignmentType: 'dhcp', status: 'active', lastSeen: '2026-03-27 09:10' },
  { id: '3', ipAddress: '192.168.2.10', macAddress: 'AA:BB:CC:DD:EE:03', hostname: 'SRV-APP-01', rangeName: '本社 サーバーLAN', assignmentType: 'static', status: 'active', lastSeen: '2026-03-27 09:14' },
  { id: '4', ipAddress: '192.168.1.100', macAddress: 'AA:BB:CC:DD:EE:04', hostname: 'PRINTER-1F', rangeName: '本社 オフィスLAN', assignmentType: 'reserved', status: 'active', lastSeen: '2026-03-27 08:45' },
  { id: '5', ipAddress: '10.0.1.25', macAddress: 'AA:BB:CC:DD:EE:05', hostname: 'PC-BRANCH-A-12', rangeName: '支社A ネットワーク', assignmentType: 'dhcp', status: 'inactive', lastSeen: '2026-03-25 17:30' },
  { id: '6', ipAddress: '192.168.1.200', macAddress: 'AA:BB:CC:DD:EE:06', hostname: 'UNKNOWN-DEVICE', rangeName: '本社 オフィスLAN', assignmentType: 'dhcp', status: 'conflict', lastSeen: '2026-03-27 09:12' },
  { id: '7', ipAddress: '192.168.1.200', macAddress: 'FF:EE:DD:CC:BB:AA', hostname: 'PC-TEMP-099', rangeName: '本社 オフィスLAN', assignmentType: 'static', status: 'conflict', lastSeen: '2026-03-27 09:13' },
  { id: '8', ipAddress: '192.168.2.20', macAddress: 'AA:BB:CC:DD:EE:08', hostname: 'SRV-DB-01', rangeName: '本社 サーバーLAN', assignmentType: 'static', status: 'reserved', lastSeen: '2026-03-26 22:00' },
];

const topologyData = {
  nodes: [
    { id: 'gw-main', label: 'メインGW (192.168.1.1)', type: 'gateway' },
    { id: 'gw-srv', label: 'サーバーGW (192.168.2.1)', type: 'gateway' },
    { id: 'range-1', label: '本社 オフィスLAN\n192.168.1.0/24', type: 'range' },
    { id: 'range-2', label: '本社 サーバーLAN\n192.168.2.0/24', type: 'range' },
    { id: 'range-3', label: '支社A\n10.0.1.0/24', type: 'range' },
    { id: 'd1', label: 'PC-SALES-001', type: 'device', status: 'active' },
    { id: 'd2', label: 'SRV-APP-01', type: 'device', status: 'active' },
    { id: 'd3', label: 'PRINTER-1F', type: 'device', status: 'active' },
    { id: 'd4', label: 'PC-BRANCH-A-12', type: 'device', status: 'inactive' },
  ],
  edges: [
    { source: 'gw-main', target: 'range-1' },
    { source: 'gw-srv', target: 'range-2' },
    { source: 'gw-main', target: 'range-3' },
    { source: 'range-1', target: 'd1' },
    { source: 'range-2', target: 'd2' },
    { source: 'range-1', target: 'd3' },
    { source: 'range-3', target: 'd4' },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const statusColor: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-400',
  reserved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  conflict: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const typeLabel: Record<string, string> = {
  static: 'Static',
  dhcp: 'DHCP',
  reserved: 'Reserved',
};

function utilizationBarColor(pct: number): string {
  if (pct >= 80) return 'bg-red-500';
  if (pct >= 60) return 'bg-amber-500';
  return 'bg-emerald-500';
}

// ---------------------------------------------------------------------------
// SVG Topology component
// ---------------------------------------------------------------------------

function NetworkTopology() {
  const nodePositions: Record<string, { x: number; y: number }> = {
    'gw-main': { x: 400, y: 40 },
    'gw-srv': { x: 600, y: 40 },
    'range-1': { x: 250, y: 160 },
    'range-2': { x: 550, y: 160 },
    'range-3': { x: 750, y: 160 },
    'd1': { x: 120, y: 300 },
    'd2': { x: 480, y: 300 },
    'd3': { x: 320, y: 300 },
    'd4': { x: 750, y: 300 },
  };

  const nodeColor: Record<string, { fill: string; stroke: string }> = {
    gateway: { fill: '#7c3aed', stroke: '#6d28d9' },
    range: { fill: '#2563eb', stroke: '#1d4ed8' },
    device: { fill: '#059669', stroke: '#047857' },
  };

  return (
    <svg viewBox="0 0 900 380" className="w-full" style={{ minHeight: 380 }}>
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#6b7280" />
        </marker>
      </defs>

      {/* Edges */}
      {topologyData.edges.map((edge, i) => {
        const s = nodePositions[edge.source];
        const t = nodePositions[edge.target];
        if (!s || !t) return null;
        return (
          <line
            key={i}
            x1={s.x}
            y1={s.y + 20}
            x2={t.x}
            y2={t.y - 20}
            stroke="#6b7280"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            markerEnd="url(#arrowhead)"
          />
        );
      })}

      {/* Nodes */}
      {topologyData.nodes.map((node) => {
        const pos = nodePositions[node.id];
        if (!pos) return null;
        const colors = nodeColor[node.type] || nodeColor.device;
        const isInactive = node.status === 'inactive';

        return (
          <g key={node.id}>
            {node.type === 'gateway' ? (
              <polygon
                points={`${pos.x},${pos.y - 22} ${pos.x + 26},${pos.y} ${pos.x + 16},${pos.y + 22} ${pos.x - 16},${pos.y + 22} ${pos.x - 26},${pos.y}`}
                fill={colors.fill}
                stroke={colors.stroke}
                strokeWidth={2}
                opacity={0.9}
              />
            ) : node.type === 'range' ? (
              <rect
                x={pos.x - 60}
                y={pos.y - 20}
                width={120}
                height={40}
                rx={8}
                fill={colors.fill}
                stroke={colors.stroke}
                strokeWidth={2}
                opacity={0.9}
              />
            ) : (
              <circle
                cx={pos.x}
                cy={pos.y}
                r={18}
                fill={isInactive ? '#6b7280' : colors.fill}
                stroke={isInactive ? '#4b5563' : colors.stroke}
                strokeWidth={2}
                opacity={isInactive ? 0.5 : 0.9}
              />
            )}
            <text
              x={pos.x}
              y={node.type === 'device' ? pos.y + 34 : pos.y + 4}
              textAnchor="middle"
              fill="currentColor"
              className="text-[10px] fill-gray-700 dark:fill-gray-300"
              fontWeight={500}
            >
              {node.label.split('\n').map((line, li) => (
                <tspan key={li} x={pos.x} dy={li === 0 ? 0 : 14}>
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        );
      })}

      {/* Legend */}
      <g transform="translate(20, 350)">
        <polygon points="10,0 20,8 15,16 5,16 0,8" fill="#7c3aed" />
        <text x="28" y="12" className="text-[10px] fill-gray-600 dark:fill-gray-400">Gateway</text>
        <rect x="80" y="0" width="16" height="16" rx="4" fill="#2563eb" />
        <text x="102" y="12" className="text-[10px] fill-gray-600 dark:fill-gray-400">Range</text>
        <circle cx="168" cy="8" r="8" fill="#059669" />
        <text x="182" y="12" className="text-[10px] fill-gray-600 dark:fill-gray-400">Device</text>
      </g>
    </svg>
  );
}


// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function NetworkPage() {
  const [tab, setTab] = useState<'ranges' | 'assignments' | 'topology'>('ranges');

  // Summary stats
  const totalRanges = ipRanges.length;
  const totalAssigned = ipRanges.reduce((s, r) => s + r.assignedCount, 0);
  const totalActive = ipRanges.reduce((s, r) => s + r.activeCount, 0);
  const conflictCount = ipAssignments.filter((a) => a.status === 'conflict').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          ネットワーク管理
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          IPアドレスレンジ、割当管理、ネットワークトポロジー
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="IPレンジ数" value={totalRanges} sub={`${ipRanges.filter(r => r.dhcpEnabled).length} DHCP有効`} color="blue" />
        <SummaryCard label="割当済みIP" value={totalAssigned} sub={`全体 ${ipRanges.reduce((s, r) => s + r.totalHosts, 0)} ホスト中`} color="emerald" />
        <SummaryCard label="アクティブ" value={totalActive} sub={`${Math.round((totalActive / Math.max(totalAssigned, 1)) * 100)}% の割当が稼働中`} color="violet" />
        <SummaryCard label="コンフリクト" value={conflictCount} sub={conflictCount > 0 ? '要確認' : '問題なし'} color={conflictCount > 0 ? 'red' : 'emerald'} />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-aegis-border">
        <nav className="-mb-px flex gap-6">
          {[
            { key: 'ranges' as const, label: 'IPレンジ' },
            { key: 'assignments' as const, label: 'IP割当' },
            { key: 'topology' as const, label: 'トポロジー' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {tab === 'ranges' && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-aegis-border dark:bg-aegis-dark">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-aegis-border">
            <thead className="bg-gray-50 dark:bg-aegis-darker">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">名前</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">ネットワーク</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">VLAN</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">場所</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">DHCP</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">使用率</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-aegis-border">
              {ipRanges.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{r.name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-300">{r.networkAddress}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {r.vlanId !== null ? (
                      <Badge variant="outline">VLAN {r.vlanId}</Badge>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{r.location}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    {r.dhcpEnabled ? (
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">有効</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-700/30 dark:text-gray-400">無効</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                          className={`h-full rounded-full ${utilizationBarColor(r.utilization)}`}
                          style={{ width: `${r.utilization}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        {r.utilization}% ({r.assignedCount}/{r.totalHosts})
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'assignments' && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-aegis-border dark:bg-aegis-dark">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-aegis-border">
            <thead className="bg-gray-50 dark:bg-aegis-darker">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">IPアドレス</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">ホスト名</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">MACアドレス</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">レンジ</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">タイプ</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">ステータス</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">最終確認</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-aegis-border">
              {ipAssignments.map((a) => (
                <tr key={a.id} className={`hover:bg-gray-50 dark:hover:bg-aegis-surface/50 ${a.status === 'conflict' ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-mono font-medium text-gray-900 dark:text-white">
                    {a.ipAddress}
                    {a.status === 'conflict' && (
                      <span className="ml-2 inline-block text-red-500" title="IPコンフリクト検出">
                        <svg className="inline h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                        </svg>
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{a.hostname || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-500 dark:text-gray-400">{a.macAddress}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{a.rangeName}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <Badge variant="outline">{typeLabel[a.assignmentType] || a.assignmentType}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <Badge className={statusColor[a.status]}>{a.status}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{a.lastSeen}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'topology' && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-4 dark:border-aegis-border dark:bg-aegis-dark">
          <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-200">
            ネットワークトポロジー
          </h3>
          <NetworkTopology />
        </div>
      )}
    </div>
  );
}


// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: number;
  sub: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    emerald: 'from-emerald-500 to-emerald-600',
    violet: 'from-violet-500 to-violet-600',
    red: 'from-red-500 to-red-600',
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-aegis-border dark:bg-aegis-dark">
      <div className="p-5">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${colorMap[color] || colorMap.blue} text-white shadow-sm`}>
            <span className="text-lg font-bold">{value}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{sub}</p>
      </div>
    </div>
  );
}
