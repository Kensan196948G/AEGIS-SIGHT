'use client';

import { PieChart } from '@/components/charts/pie-chart';

interface DeviceStatusData {
  online: number;
  offline: number;
  maintenance: number;
  lastChecked: string;
}

interface DeviceStatusWidgetProps {
  data?: DeviceStatusData;
}

const defaultData: DeviceStatusData = {
  online: 1142,
  offline: 89,
  maintenance: 53,
  lastChecked: '2026-03-27T14:30:00',
};

export function DeviceStatusWidget({ data = defaultData }: DeviceStatusWidgetProps) {
  const total = data.online + data.offline + data.maintenance;
  const onlineRate = total > 0 ? ((data.online / total) * 100).toFixed(1) : '0';

  const pieData = [
    { label: 'オンライン', value: data.online, color: '#10b981' },
    { label: 'オフライン', value: data.offline, color: '#ef4444' },
    { label: 'メンテナンス', value: data.maintenance, color: '#f59e0b' },
  ];

  const lastCheckedTime = new Date(data.lastChecked).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="aegis-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          デバイスステータス
        </h2>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          最終チェック: {lastCheckedTime}
        </div>
      </div>

      <div className="flex flex-col items-center">
        <PieChart
          data={pieData}
          size={180}
          innerRadius={50}
          showLabels={true}
          showLegend={false}
        />

        {/* Center label */}
        <div className="-mt-[115px] mb-[60px] text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{onlineRate}%</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">稼働率</p>
        </div>

        {/* Status summary */}
        <div className="mt-2 grid w-full grid-cols-3 gap-2">
          <div className="rounded-lg bg-emerald-50 p-2 text-center dark:bg-emerald-900/20">
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {data.online.toLocaleString()}
            </p>
            <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">オンライン</p>
          </div>
          <div className="rounded-lg bg-red-50 p-2 text-center dark:bg-red-900/20">
            <p className="text-lg font-bold text-red-600 dark:text-red-400">
              {data.offline.toLocaleString()}
            </p>
            <p className="text-[10px] text-red-600/80 dark:text-red-400/80">オフライン</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-2 text-center dark:bg-amber-900/20">
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {data.maintenance.toLocaleString()}
            </p>
            <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80">メンテナンス</p>
          </div>
        </div>
      </div>
    </div>
  );
}
