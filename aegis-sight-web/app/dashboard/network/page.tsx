'use client';

import { Badge } from '@/components/ui/badge';
import { useCallback, useEffect, useState } from 'react';
import {
  BackendNetworkDevice,
  fetchNetworkDevices,
} from '@/lib/api';

export default function NetworkPage() {
  const [devices, setDevices] = useState<BackendNetworkDevice[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchNetworkDevices(0, 200);
      setDevices(res.items);
    } catch {
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const managed = devices.filter((d) => d.is_managed);
  const unmanaged = devices.filter((d) => !d.is_managed);

  const formatDate = (s: string) => new Date(s).toLocaleString('ja-JP');

  const DeviceRow = ({ d }: { d: BackendNetworkDevice }) => (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-3 text-sm font-mono">{d.ip_address}</td>
      <td className="px-4 py-3 text-sm font-mono">{d.mac_address}</td>
      <td className="px-4 py-3 text-sm">{d.hostname ?? '—'}</td>
      <td className="px-4 py-3 text-sm">{d.device_type}</td>
      <td className="px-4 py-3">
        {d.is_managed ? (
          <Badge className="bg-green-100 text-green-700 border-green-200">管理対象</Badge>
        ) : (
          <Badge className="bg-red-100 text-red-700 border-red-200">未管理</Badge>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(d.last_seen)}</td>
    </tr>
  );

  const TableSkeleton = () => (
    <div className="animate-pulse space-y-2 p-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-10 bg-gray-200 rounded" />
      ))}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ネットワークデバイス管理</h1>
        <p className="text-sm text-gray-500 mt-1">検出されたネットワーク上のデバイス一覧</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading ? (
          <>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white rounded-xl border border-gray-200 p-5">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-8 bg-gray-200 rounded w-1/3" />
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500">総デバイス数</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{devices.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500">管理対象</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{managed.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500">未管理デバイス</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{unmanaged.length}</p>
            </div>
          </>
        )}
      </div>

      {/* All devices table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">全デバイス一覧</h2>
        </div>
        {loading ? (
          <TableSkeleton />
        ) : devices.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-400">データなし</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IPアドレス</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">MACアドレス</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ホスト名</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">デバイス種別</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">管理状態</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">最終確認</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <DeviceRow key={d.id} d={d} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Unmanaged devices table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <h2 className="font-semibold text-gray-900">未管理デバイス</h2>
          {!loading && (
            <Badge className="bg-red-100 text-red-700 border-red-200">{unmanaged.length} 件</Badge>
          )}
        </div>
        {loading ? (
          <TableSkeleton />
        ) : unmanaged.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-400">データなし</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IPアドレス</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">MACアドレス</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ホスト名</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">デバイス種別</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">管理状態</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">最終確認</th>
                </tr>
              </thead>
              <tbody>
                {unmanaged.map((d) => (
                  <DeviceRow key={d.id} d={d} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
