'use client';

import { useState } from 'react';

type DataType = 'devices' | 'licenses' | 'alerts' | 'audit-logs';
type ExportFormat = 'csv' | 'json';

interface ExportHistoryItem {
  id: string;
  dataType: DataType;
  format: ExportFormat;
  rowCount: number;
  exportedAt: string;
}

const dataTypeLabel: Record<DataType, string> = {
  devices: 'デバイス',
  licenses: 'ライセンス',
  alerts: 'アラート',
  'audit-logs': '監査ログ',
};

const dataTypeDescription: Record<DataType, string> = {
  devices: 'IT資産デバイスの全データをエクスポートします。',
  licenses: 'ソフトウェアライセンス情報をエクスポートします。',
  alerts: 'システムアラートの全履歴をエクスポートします。',
  'audit-logs': '監査ログの全記録をエクスポートします。',
};

// Demo export history
const demoHistory: ExportHistoryItem[] = [
  {
    id: '1',
    dataType: 'devices',
    format: 'csv',
    rowCount: 1245,
    exportedAt: '2026-03-27T14:30:00Z',
  },
  {
    id: '2',
    dataType: 'licenses',
    format: 'json',
    rowCount: 87,
    exportedAt: '2026-03-27T10:15:00Z',
  },
  {
    id: '3',
    dataType: 'alerts',
    format: 'csv',
    rowCount: 432,
    exportedAt: '2026-03-26T16:45:00Z',
  },
  {
    id: '4',
    dataType: 'audit-logs',
    format: 'csv',
    rowCount: 5621,
    exportedAt: '2026-03-25T09:00:00Z',
  },
];

export default function ExportPage() {
  const [selectedType, setSelectedType] = useState<DataType>('devices');
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    const params = new URLSearchParams();
    params.set('format', selectedFormat);
    if (dateFrom) params.set('date_from', new Date(dateFrom).toISOString());
    if (dateTo) params.set('date_to', new Date(dateTo).toISOString());

    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const url = `${apiBase}/api/v1/export/${selectedType}?${params.toString()}`;

    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Export failed: ${res.status}`);
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${selectedType}_export.${selectedFormat}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Export error:', err);
      alert('エクスポートに失敗しました。');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          データエクスポート
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          各種データをCSVまたはJSON形式でエクスポートします
        </p>
      </div>

      {/* Export Configuration */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Data Type Selection */}
        <div className="lg:col-span-2">
          <div className="aegis-card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              データ種別
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(dataTypeLabel) as DataType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`rounded-lg border-2 p-4 text-left transition-all ${
                    selectedType === type
                      ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
                      : 'border-gray-200 bg-white hover:border-gray-300 dark:border-aegis-border dark:bg-aegis-surface dark:hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        selectedType === type
                          ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400'
                          : 'bg-gray-100 text-gray-500 dark:bg-aegis-darker dark:text-gray-400'
                      }`}
                    >
                      <DataTypeIcon type={type} />
                    </div>
                    <div>
                      <p
                        className={`font-medium ${
                          selectedType === type
                            ? 'text-primary-700 dark:text-primary-400'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {dataTypeLabel[type]}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {dataTypeDescription[type]}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Export Settings */}
        <div className="space-y-4">
          {/* Format Selection */}
          <div className="aegis-card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              フォーマット
            </h2>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedFormat('csv')}
                className={`flex-1 rounded-lg border-2 px-4 py-3 text-center text-sm font-medium transition-all ${
                  selectedFormat === 'csv'
                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/20 dark:text-primary-400'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-aegis-border dark:text-gray-400 dark:hover:border-gray-500'
                }`}
              >
                CSV
              </button>
              <button
                onClick={() => setSelectedFormat('json')}
                className={`flex-1 rounded-lg border-2 px-4 py-3 text-center text-sm font-medium transition-all ${
                  selectedFormat === 'json'
                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/20 dark:text-primary-400'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-aegis-border dark:text-gray-400 dark:hover:border-gray-500'
                }`}
              >
                JSON
              </button>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="aegis-card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              日付範囲
            </h2>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="date-from"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  開始日
                </label>
                <input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-aegis-border dark:bg-aegis-surface dark:text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="date-to"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  終了日
                </label>
                <input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-aegis-border dark:bg-aegis-surface dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full rounded-lg bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary-500 dark:hover:bg-primary-600"
          >
            {isExporting ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                エクスポート中...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                  />
                </svg>
                {dataTypeLabel[selectedType]}を{selectedFormat.toUpperCase()}でエクスポート
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Export History */}
      <div className="aegis-card overflow-hidden p-0">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-aegis-border">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            エクスポート履歴
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-aegis-border dark:bg-aegis-darker">
              <tr>
                <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400">
                  データ種別
                </th>
                <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400">
                  フォーマット
                </th>
                <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400">
                  件数
                </th>
                <th className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400">
                  実行日時
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
              {demoHistory.map((item) => (
                <tr
                  key={item.id}
                  className="transition-colors hover:bg-gray-50 dark:hover:bg-aegis-surface/50"
                >
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {dataTypeLabel[item.dataType]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-aegis-surface dark:text-gray-300">
                      {item.format.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                    {item.rowCount.toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-500 dark:text-gray-400">
                    {new Date(item.exportedAt).toLocaleString('ja-JP')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icon components for data types
// ---------------------------------------------------------------------------

function DataTypeIcon({ type }: { type: DataType }) {
  switch (type) {
    case 'devices':
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z" />
        </svg>
      );
    case 'licenses':
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z" />
        </svg>
      );
    case 'alerts':
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
      );
    case 'audit-logs':
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      );
  }
}
