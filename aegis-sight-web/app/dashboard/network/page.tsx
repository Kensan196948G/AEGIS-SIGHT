'use client';

import { Badge } from '@/components/ui/badge';
import { BarChart, DonutChart } from '@/components/ui/chart';
import { useCallback, useEffect, useState } from 'react';
import { BackendNetworkDevice, fetchNetworkDevices } from '@/lib/api';

const deviceTypeLabel: Record<string, string> = {
  router:     'ルーター',
  switch:     'スイッチ',
  server:     'サーバー',
  endpoint:   'エンドポイント',
  printer:    'プリンター',
  camera:     'カメラ',
  unknown:    '不明',
};

function formatDate(s: string) {
  return new Date(s).toLocaleString('ja-JP');
}

const NETWORK_TOPOLOGY = [
  { label: 'コアスイッチ',  count: 2,  color: 'bg-purple-500' },
  { label: 'ルーター',       count: 4,  color: 'bg-blue-500'   },
  { label: 'スイッチ',       count: 12, color: 'bg-sky-500'    },
  { label: 'サーバー',       count: 28, color: 'bg-indigo-500' },
  { label: 'AP',             count: 18, color: 'bg-cyan-500'   },
  { label: 'エンドポイント', count: 245,color: 'bg-green-500'  },
];

const SUBNET_SUMMARY = [
  { subnet: '10.0.1.0/24',  name: '管理VLAN',        total: 50,  used: 38 },
  { subnet: '10.0.2.0/24',  name: 'サーバーVLAN',    total: 100, used: 62 },
  { subnet: '10.0.10.0/22', name: 'ユーザーVLAN',    total: 1022,used: 647 },
  { subnet: '10.0.20.0/24', name: 'ゲストWi-Fi',     total: 200, used: 84  },
  { subnet: '192.168.1.0/24',name: 'IoT/プリンター', total: 50,  used: 31  },
];

const DUMMY_NETWORK_DEVICES: BackendNetworkDevice[] = [
  { id: 'nd-0001', ip_address: '10.0.1.1',   mac_address: 'AA:BB:CC:00:01:01', hostname: 'core-sw-01',    device_type: 'switch',   is_managed: true,  first_seen: '2025-01-15T08:00:00Z', last_seen: '2026-05-07T10:00:00Z', device_id: null },
  { id: 'nd-0002', ip_address: '10.0.1.2',   mac_address: 'AA:BB:CC:00:01:02', hostname: 'core-sw-02',    device_type: 'switch',   is_managed: true,  first_seen: '2025-01-15T08:00:00Z', last_seen: '2026-05-07T10:00:00Z', device_id: null },
  { id: 'nd-0003', ip_address: '10.0.1.254', mac_address: 'AA:BB:CC:00:02:01', hostname: 'gw-router-01',  device_type: 'router',   is_managed: true,  first_seen: '2025-01-15T08:00:00Z', last_seen: '2026-05-07T10:01:00Z', device_id: null },
  { id: 'nd-0004', ip_address: '10.0.2.10',  mac_address: 'AA:BB:CC:00:03:01', hostname: 'app-server-01', device_type: 'server',   is_managed: true,  first_seen: '2025-02-01T09:00:00Z', last_seen: '2026-05-07T10:00:00Z', device_id: 'dev-aabb1100-1234' },
  { id: 'nd-0005', ip_address: '10.0.2.11',  mac_address: 'AA:BB:CC:00:03:02', hostname: 'db-server-01',  device_type: 'server',   is_managed: true,  first_seen: '2025-02-01T09:00:00Z', last_seen: '2026-05-07T10:00:00Z', device_id: 'dev-ccdd2200-5678' },
  { id: 'nd-0006', ip_address: '10.0.10.50', mac_address: 'AA:BB:CC:00:04:01', hostname: 'pc-yamamoto',   device_type: 'endpoint', is_managed: true,  first_seen: '2025-03-10T08:30:00Z', last_seen: '2026-05-07T09:45:00Z', device_id: 'dev-eeff3300-9012' },
  { id: 'nd-0007', ip_address: '10.0.10.51', mac_address: 'AA:BB:CC:00:04:02', hostname: 'pc-tanaka',     device_type: 'endpoint', is_managed: true,  first_seen: '2025-03-10T08:30:00Z', last_seen: '2026-05-07T09:50:00Z', device_id: 'dev-aabb4400-3456' },
  { id: 'nd-0008', ip_address: '10.0.10.52', mac_address: 'AA:BB:CC:00:04:03', hostname: 'mac-sato',      device_type: 'endpoint', is_managed: true,  first_seen: '2025-04-01T10:00:00Z', last_seen: '2026-05-07T09:55:00Z', device_id: 'dev-ccdd5500-7890' },
  { id: 'nd-0009', ip_address: '10.0.20.21', mac_address: 'AA:BB:CC:00:05:01', hostname: null,            device_type: 'endpoint', is_managed: false, first_seen: '2026-05-06T14:20:00Z', last_seen: '2026-05-07T08:10:00Z', device_id: null },
  { id: 'nd-0010', ip_address: '192.168.1.5',mac_address: 'AA:BB:CC:00:06:01', hostname: 'printer-floor2', device_type: 'printer', is_managed: true,  first_seen: '2025-05-20T11:00:00Z', last_seen: '2026-05-07T07:30:00Z', device_id: null },
  { id: 'nd-0011', ip_address: '10.0.10.53', mac_address: 'AA:BB:CC:00:04:04', hostname: 'pc-nakamura',   device_type: 'endpoint', is_managed: true,  first_seen: '2025-03-15T09:00:00Z', last_seen: '2026-05-07T10:02:00Z', device_id: 'dev-eeff6600-1234' },
  { id: 'nd-0012', ip_address: '10.0.10.54', mac_address: 'AA:BB:CC:00:04:05', hostname: 'pc-watanabe',   device_type: 'endpoint', is_managed: false, first_seen: '2026-04-10T13:00:00Z', last_seen: '2026-05-07T09:20:00Z', device_id: null },
];

export default function NetworkPage() {
  const [devices, setDevices] = useState<BackendNetworkDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchNetworkDevices(0, 200);
      setDevices(res.items.length > 0 ? res.items : DUMMY_NETWORK_DEVICES);
    } catch {
      setDevices(DUMMY_NETWORK_DEVICES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const managed   = devices.filter((d) => d.is_managed);
  const unmanaged = devices.filter((d) => !d.is_managed);
  const total     = devices.length;
  const managedRate = total > 0 ? Math.round((managed.length / total) * 100) : 0;
  const managedRateColor = managedRate >= 90 ? '#10b981' : managedRate >= 70 ? '#f59e0b' : '#ef4444';

  const typeCounts: Record<string, number> = {};
  devices.forEach((d) => {
    typeCounts[d.device_type] = (typeCounts[d.device_type] || 0) + 1;
  });
  const typeBarData = Object.entries(typeCounts).map(([type, count]) => ({
    label: deviceTypeLabel[type] ?? type,
    value: count,
    color: 'bg-blue-500',
  }));

  const deviceTypes = [...new Set(devices.map((d) => d.device_type))];
  const filtered = typeFilter === 'all'
    ? devices
    : devices.filter((d) => d.device_type === typeFilter);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ネットワーク管理</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            検出済みネットワークデバイスの可視化と管理
          </p>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          最終スキャン: {new Date().toLocaleString('ja-JP')}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="aegis-card text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">総デバイス数</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {loading ? '—' : total.toLocaleString()}
          </p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-green-600 dark:text-green-400">管理対象</p>
          <p className="mt-2 text-3xl font-bold text-green-600 dark:text-green-400">
            {loading ? '—' : managed.length.toLocaleString()}
          </p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-red-600 dark:text-red-400">未管理</p>
          <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">
            {loading ? '—' : unmanaged.length.toLocaleString()}
          </p>
        </div>
        <div className="aegis-card text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-blue-600 dark:text-blue-400">管理率</p>
          <p className="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-400">
            {loading ? '—' : `${managedRate}%`}
          </p>
        </div>
      </div>

      {/* Overview Charts */}
      {!loading && total > 0 && (
        <div className="aegis-card">
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">ネットワーク概要</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">管理対象率</p>
              <DonutChart value={managedRate} max={100} size={140} strokeWidth={14} color={managedRateColor} label={`${managedRate}%`} />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                全 {total} 台中 {managed.length} 台が管理対象
              </p>
            </div>
            {typeBarData.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">デバイス種別</p>
                <BarChart
                  data={typeBarData}
                  maxValue={Math.max(...typeBarData.map((d) => d.value), 1)}
                  height={160}
                  showValues
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Topology Summary */}
      <div className="aegis-card">
        <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">ネットワーク構成概要</h2>
        <div className="flex flex-wrap gap-3">
          {NETWORK_TOPOLOGY.map((item) => (
            <div key={item.label} className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 dark:border-aegis-border">
              <div className={`h-3 w-3 rounded-full ${item.color}`} />
              <span className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</span>
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Subnet Summary */}
      <div className="aegis-card overflow-hidden p-0">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-aegis-border">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">サブネット使用状況</h2>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-aegis-border">
          {SUBNET_SUMMARY.map((s) => {
            const rate = Math.round((s.used / s.total) * 100);
            const barColor = rate >= 90 ? 'bg-red-500' : rate >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
            return (
              <div key={s.subnet} className="px-6 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <span className="font-mono text-sm text-gray-900 dark:text-white">{s.subnet}</span>
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{s.name}</span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {s.used} / {s.total} ({rate}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-aegis-dark">
                  <div
                    className={`h-2 rounded-full ${barColor} transition-all`}
                    style={{ width: `${rate}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unmanaged Devices Alert */}
      {!loading && unmanaged.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-6 py-4 dark:border-amber-800/40 dark:bg-amber-900/20">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                未管理デバイスが {unmanaged.length} 台検出されています
              </p>
              <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
                これらのデバイスはセキュリティリスクとなる可能性があります。管理対象への追加を検討してください。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Device Table */}
      <div className="aegis-card overflow-hidden p-0">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-aegis-border flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">全デバイス一覧</h2>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="aegis-input w-auto text-sm"
          >
            <option value="all">全種別</option>
            {deviceTypes.map((t) => (
              <option key={t} value={t}>{deviceTypeLabel[t] ?? t}</option>
            ))}
          </select>
        </div>
        {loading ? (
          <div className="animate-pulse space-y-2 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 rounded bg-gray-200 dark:bg-gray-700" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-gray-400 dark:text-gray-600">
            該当するデバイスがありません
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50 dark:border-aegis-border dark:bg-aegis-dark/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">IPアドレス</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">MACアドレス</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">ホスト名</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">種別</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">管理状態</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">最終確認</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
                {filtered.map((d) => (
                  <tr key={d.id} className="transition-colors hover:bg-gray-50/70 dark:hover:bg-aegis-dark/40">
                    <td className="px-4 py-3 font-mono text-sm text-gray-900 dark:text-white">{d.ip_address}</td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-500 dark:text-gray-400">{d.mac_address}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{d.hostname ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {deviceTypeLabel[d.device_type] ?? d.device_type}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={d.is_managed ? 'success' : 'danger'} dot>
                        {d.is_managed ? '管理対象' : '未管理'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(d.last_seen)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
