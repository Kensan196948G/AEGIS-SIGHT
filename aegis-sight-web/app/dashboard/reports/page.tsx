'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { DonutChart, BarChart } from '@/components/ui/chart';

// ---------------------------------------------------------------------------
// Types & Mock Data
// ---------------------------------------------------------------------------

type ReportType = 'sam' | 'assets' | 'security' | 'compliance';

interface ReportHistory {
  id: string;
  type: ReportType;
  generatedAt: string;
  generatedBy: string;
  recordCount: number;
  format: string;
  size: string;
}

const reportTypes: { key: ReportType; label: string; description: string }[] = [
  { key: 'sam', label: 'SAMレポート', description: 'ソフトウェア資産管理 - ライセンスコンプライアンス状況' },
  { key: 'assets', label: '資産レポート', description: 'IT資産インベントリ - デバイス一覧と状態' },
  { key: 'security', label: 'セキュリティレポート', description: 'セキュリティポスチャ - Defender/BitLocker/パッチ状況' },
  { key: 'compliance', label: 'コンプライアンスレポート', description: 'フレームワーク準拠状況 - ISO/J-SOX/NIST' },
];

// Mock preview data per report type
const previewData: Record<ReportType, { headers: string[]; rows: string[][] }> = {
  sam: {
    headers: ['ソフトウェア名', 'ベンダー', '購入数', 'インストール数', 'M365割当', 'コンプライアンス'],
    rows: [
      ['Microsoft 365 E3', 'Microsoft', '500', '487', '495', '適合'],
      ['Adobe Creative Cloud', 'Adobe', '100', '95', '-', '適合'],
      ['AutoCAD 2025', 'Autodesk', '30', '28', '-', '適合'],
      ['Slack Business+', 'Salesforce', '200', '212', '-', '超過'],
      ['Zoom Business', 'Zoom', '150', '148', '-', '適合'],
    ],
  },
  assets: {
    headers: ['ホスト名', 'OS', 'ステータス', '部門', '最終オンライン', 'シリアル番号'],
    rows: [
      ['PC-SALES-001', 'Windows 11 23H2', 'アクティブ', '営業部', '2026-03-27 10:00', 'SN-2024-001'],
      ['PC-DEV-015', 'Windows 11 23H2', 'アクティブ', '開発部', '2026-03-27 09:45', 'SN-2024-015'],
      ['MAC-DESIGN-003', 'macOS 14.4', 'アクティブ', 'デザイン部', '2026-03-27 09:30', 'SN-2024-103'],
      ['SRV-APP-02', 'Ubuntu 22.04', 'アクティブ', 'インフラ', '2026-03-27 10:05', 'SN-2023-502'],
      ['PC-HR-010', 'Windows 10 22H2', '非アクティブ', '人事部', '2026-03-20 17:00', 'SN-2023-210'],
    ],
  },
  security: {
    headers: ['ホスト名', 'Defender', 'BitLocker', 'パッチ状態', '最終スキャン', 'リスクレベル'],
    rows: [
      ['PC-SALES-001', '有効', '暗号化済', '最新', '2026-03-27', '低'],
      ['PC-DEV-015', '有効', '暗号化済', '最新', '2026-03-27', '低'],
      ['MAC-DESIGN-003', '-', 'FileVault有効', '最新', '2026-03-27', '低'],
      ['SRV-APP-02', '有効', '暗号化済', '1件保留', '2026-03-26', '中'],
      ['PC-HR-010', '定義古い', '未暗号化', '3件保留', '2026-03-20', '高'],
    ],
  },
  compliance: {
    headers: ['フレームワーク', '領域', 'スコア', 'ステータス', '指摘事項', '最終評価日'],
    rows: [
      ['ISO 27001', 'A.5 情報セキュリティ方針', '92%', '適合', '0', '2026-03-27'],
      ['ISO 27001', 'A.9 アクセス制御', '91%', '適合', '0', '2026-03-27'],
      ['ISO 27001', 'A.12 運用セキュリティ', '76%', '部分適合', '2', '2026-03-27'],
      ['J-SOX', 'プログラム変更管理', '100%', '有効', '0', '2026-03-22'],
      ['J-SOX', 'アクセス管理', '75%', '一部有効', '2', '2026-03-22'],
      ['NIST CSF', '識別 (Identify)', 'Tier 3', '目標近い', '1', '2026-03-20'],
      ['NIST CSF', '検知 (Detect)', 'Tier 2', '要改善', '3', '2026-03-20'],
    ],
  },
};

const reportHistory: ReportHistory[] = [
  { id: 'rpt-001', type: 'sam', generatedAt: '2026-03-27 10:00', generatedBy: 'auditor@aegis-sight.local', recordCount: 156, format: 'CSV', size: '24KB' },
  { id: 'rpt-002', type: 'security', generatedAt: '2026-03-26 15:30', generatedBy: 'admin@aegis-sight.local', recordCount: 1284, format: 'CSV', size: '312KB' },
  { id: 'rpt-003', type: 'assets', generatedAt: '2026-03-25 09:00', generatedBy: 'auditor@aegis-sight.local', recordCount: 1284, format: 'CSV', size: '198KB' },
  { id: 'rpt-004', type: 'compliance', generatedAt: '2026-03-22 14:00', generatedBy: 'admin@aegis-sight.local', recordCount: 42, format: 'CSV', size: '8KB' },
  { id: 'rpt-005', type: 'sam', generatedAt: '2026-03-15 10:00', generatedBy: 'auditor@aegis-sight.local', recordCount: 152, format: 'CSV', size: '22KB' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const typeLabel = (t: ReportType): string => {
  const map: Record<ReportType, string> = {
    sam: 'SAM',
    assets: '資産',
    security: 'セキュリティ',
    compliance: 'コンプライアンス',
  };
  return map[t];
};

const typeBadgeVariant = (t: ReportType): 'info' | 'success' | 'danger' | 'purple' => {
  const map: Record<ReportType, 'info' | 'success' | 'danger' | 'purple'> = {
    sam: 'info',
    assets: 'success',
    security: 'danger',
    compliance: 'purple',
  };
  return map[t];
};

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  const [selectedType, setSelectedType] = useState<ReportType>('sam');

  const preview = previewData[selectedType];

  const handleDownload = (format: 'csv' | 'pdf') => {
    if (format === 'pdf') {
      alert('PDF出力機能は今後実装予定です');
      return;
    }
    const { headers, rows } = preview;
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedType}_report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* レポート概要チャート */}
      {(() => {
        const typeCounts: Record<string, number> = {};
        reportHistory.forEach(h => { typeCounts[typeLabel(h.type)] = (typeCounts[typeLabel(h.type)] || 0) + 1; });
        const totalReports = reportHistory.length;
        const latestRate = Math.round((totalReports / 20) * 100); // 20 = target monthly reports
        const rateColor = latestRate >= 80 ? '#10b981' : latestRate >= 50 ? '#f59e0b' : '#ef4444';
        const typeBarData = Object.entries(typeCounts).map(([type, count], i) => ({
          label: type,
          value: count,
          color: ['bg-blue-500', 'bg-emerald-500', 'bg-red-500', 'bg-purple-500'][i] || 'bg-gray-400',
        }));
        return (
          <div className="aegis-card">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">レポート概要</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">レポート生成実績</p>
                <DonutChart value={latestRate} max={100} size={140} strokeWidth={14} color={rateColor} label={`${totalReports}件`} />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {reportTypes.length} 種類のレポートテンプレート
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">種別別レポート件数</p>
                <BarChart data={typeBarData} maxValue={Math.max(...typeBarData.map(d => d.value), 1)} height={160} showValues />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">レポート</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            各種レポートの生成・プレビュー・ダウンロード
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleDownload('csv')} className="aegis-btn-primary text-sm">
            <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            CSVダウンロード
          </button>
          <button onClick={() => handleDownload('pdf')} className="aegis-btn-secondary text-sm">
            <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            PDFダウンロード
          </button>
        </div>
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {reportTypes.map((rt) => (
          <button
            key={rt.key}
            onClick={() => setSelectedType(rt.key)}
            className={`rounded-xl border-2 p-4 text-left transition-all ${
              selectedType === rt.key
                ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                : 'border-gray-200 bg-white hover:border-gray-300 dark:border-aegis-border dark:bg-aegis-darker dark:hover:border-gray-500'
            }`}
          >
            <Badge variant={typeBadgeVariant(rt.key)} className="mb-2">
              {typeLabel(rt.key)}
            </Badge>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{rt.label}</h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{rt.description}</p>
          </button>
        ))}
      </div>

      {/* Preview Table */}
      <div className="aegis-card overflow-hidden p-0">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-aegis-border flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            レポートプレビュー - {reportTypes.find((r) => r.key === selectedType)?.label}
          </h2>
          <Badge variant={typeBadgeVariant(selectedType)}>{typeLabel(selectedType)}</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-aegis-surface">
              <tr>
                {preview.headers.map((h) => (
                  <th key={h} className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
              {preview.rows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-aegis-surface/50 transition-colors">
                  {row.map((cell, j) => (
                    <td key={j} className="px-6 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {cell === '超過' ? (
                        <Badge variant="danger">{cell}</Badge>
                      ) : cell === '高' ? (
                        <Badge variant="danger">{cell}</Badge>
                      ) : cell === '中' ? (
                        <Badge variant="warning">{cell}</Badge>
                      ) : cell === '低' ? (
                        <Badge variant="success">{cell}</Badge>
                      ) : cell === '適合' || cell === '有効' ? (
                        <Badge variant="success">{cell}</Badge>
                      ) : cell === '部分適合' || cell === '一部有効' || cell === '目標近い' ? (
                        <Badge variant="warning">{cell}</Badge>
                      ) : cell === '要改善' ? (
                        <Badge variant="danger">{cell}</Badge>
                      ) : (
                        cell
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-gray-200 dark:border-aegis-border px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
          プレビュー: {preview.rows.length}件（実際のレポートには全件が含まれます）
        </div>
      </div>

      {/* Report History */}
      <div className="aegis-card overflow-hidden p-0">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-aegis-border">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            生成済みレポート履歴
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-aegis-surface">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">種別</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">生成日時</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">生成者</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">レコード数</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">形式</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">サイズ</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
              {reportHistory.map((rpt) => (
                <tr key={rpt.id} className="hover:bg-gray-50 dark:hover:bg-aegis-surface/50 transition-colors">
                  <td className="px-6 py-3">
                    <Badge variant={typeBadgeVariant(rpt.type)}>{typeLabel(rpt.type)}</Badge>
                  </td>
                  <td className="px-6 py-3 text-gray-700 dark:text-gray-300">{rpt.generatedAt}</td>
                  <td className="px-6 py-3 text-gray-700 dark:text-gray-300">{rpt.generatedBy}</td>
                  <td className="px-6 py-3 text-gray-700 dark:text-gray-300">{rpt.recordCount.toLocaleString()}</td>
                  <td className="px-6 py-3 text-gray-700 dark:text-gray-300">{rpt.format}</td>
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{rpt.size}</td>
                  <td className="px-6 py-3">
                    <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-medium">
                      ダウンロード
                    </button>
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
