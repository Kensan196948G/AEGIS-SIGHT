'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { BarChart, DonutChart } from '@/components/ui/chart';

const reportTypes = [
  {
    id: 'jsox',
    name: 'J-SOXレポート',
    description: 'IT全般統制のSAM関連統制レポート。ライセンス管理の有効性を評価',
    category: 'コンプライアンス',
    lastGenerated: '2024-03-01',
    format: 'PDF / Excel',
  },
  {
    id: 'license-summary',
    name: 'ライセンスサマリー',
    description: '全ライセンスの取得数・使用数・遵守状況の一覧',
    category: 'SAM',
    lastGenerated: '2024-03-15',
    format: 'Excel',
  },
  {
    id: 'cost-optimization',
    name: 'コスト最適化レポート',
    description: '低利用ライセンスと超過ライセンスのコスト影響分析',
    category: 'SAM',
    lastGenerated: '2024-03-10',
    format: 'PDF',
  },
  {
    id: 'audit-trail',
    name: '監査証跡レポート',
    description: 'ライセンス変更・割当の操作ログ',
    category: '監査',
    lastGenerated: '2024-03-14',
    format: 'Excel',
  },
  {
    id: 'vendor-summary',
    name: 'ベンダー別サマリー',
    description: 'ベンダー別のライセンス保有数とコスト集計',
    category: 'SAM',
    lastGenerated: '2024-03-12',
    format: 'PDF / Excel',
  },
];

const jsoxControls = [
  { id: 'C-01', name: 'ライセンス台帳の正確性', status: '有効', result: '適合', detail: '定期棚卸を四半期実施。差異率 0.8%' },
  { id: 'C-02', name: 'ソフトウェア導入承認プロセス', status: '有効', result: '適合', detail: '申請-承認ワークフロー稼働中' },
  { id: 'C-03', name: 'ライセンス超過の是正', status: '要改善', result: '条件付適合', detail: '一部超過の是正が遅延（Adobe CC）' },
  { id: 'C-04', name: 'ライセンス廃棄・返却手続', status: '有効', result: '適合', detail: '返却手順書に基づき実施' },
  { id: 'C-05', name: '定期コンプライアンスレビュー', status: '有効', result: '適合', detail: '月次レビュー会議を開催' },
];

export default function SAMReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string | null>('jsox');
  const [generating, setGenerating] = useState(false);

  function handleGenerate(reportId: string) {
    setGenerating(true);
    setTimeout(() => setGenerating(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SAMレポート</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          J-SOXレポートおよびライセンス管理レポートの生成・出力
        </p>
      </div>

      {/* Report Selection */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Report List */}
        <div className="space-y-3 lg:col-span-1">
          {reportTypes.map((report) => (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report.id)}
              className={`w-full rounded-xl border p-4 text-left transition-all ${
                selectedReport === report.id
                  ? 'border-primary-500 bg-primary-50 shadow-sm dark:border-primary-600 dark:bg-primary-900/20'
                  : 'border-gray-200 bg-white hover:border-gray-300 dark:border-aegis-border dark:bg-aegis-surface dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className={`text-sm font-semibold ${
                    selectedReport === report.id
                      ? 'text-primary-700 dark:text-primary-400'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {report.name}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {report.description}
                  </p>
                </div>
                <Badge variant="info">{report.category}</Badge>
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                <span>{report.format}</span>
                <span>最終生成: {report.lastGenerated}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Report Preview */}
        <div className="lg:col-span-2">
          {selectedReport === 'jsox' && (
            <div className="space-y-4">
              {/* J-SOX Header */}
              <div className="aegis-card">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      J-SOXレポート - IT全般統制（SAM）
                    </h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      対象期間: 2024年4月 - 2025年3月（令和6年度）
                    </p>
                  </div>
                  <button
                    onClick={() => handleGenerate('jsox')}
                    disabled={generating}
                    className="aegis-btn-primary"
                  >
                    {generating ? (
                      <>
                        <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        生成中...
                      </>
                    ) : (
                      <>
                        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        PDF出力
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="aegis-card flex items-center justify-center gap-3">
                  <DonutChart value={94.2} size={70} strokeWidth={7} color="#10b981" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">遵守率</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">94.2%</p>
                  </div>
                </div>
                <div className="aegis-card text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">統制項目</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">5</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">4件適合 / 1件条件付</p>
                </div>
                <div className="aegis-card text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">管理ライセンス</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">342</p>
                  <p className="text-xs text-gray-400">8ベンダー</p>
                </div>
              </div>

              {/* Controls Table */}
              <div className="aegis-card overflow-hidden p-0">
                <div className="border-b border-gray-200 bg-gray-50 px-6 py-3 dark:border-aegis-border dark:bg-aegis-dark/50">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    統制評価結果
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-aegis-border">
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">ID</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">統制項目</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">運用状況</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">評価結果</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">補足</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
                      {jsoxControls.map((ctrl) => (
                        <tr key={ctrl.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-aegis-surface/50">
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-mono font-medium text-primary-600 dark:text-primary-400">
                            {ctrl.id}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                            {ctrl.name}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <Badge variant={ctrl.status === '有効' ? 'success' : 'warning'} dot>
                              {ctrl.status}
                            </Badge>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <Badge variant={ctrl.result === '適合' ? 'success' : 'warning'}>
                              {ctrl.result}
                            </Badge>
                          </td>
                          <td className="max-w-xs truncate px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                            {ctrl.detail}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Vendor Chart */}
              <div className="aegis-card">
                <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
                  ベンダー別ライセンス数
                </h3>
                <BarChart
                  data={[
                    { label: 'Microsoft', value: 535 },
                    { label: 'Adobe', value: 66 },
                    { label: 'Salesforce', value: 412 },
                    { label: 'Autodesk', value: 28 },
                    { label: 'Atlassian', value: 195 },
                    { label: 'Gen Digital', value: 320 },
                  ]}
                  height={160}
                />
              </div>
            </div>
          )}

          {selectedReport && selectedReport !== 'jsox' && (
            <div className="aegis-card flex flex-col items-center justify-center py-16">
              <svg className="h-16 w-16 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                {reportTypes.find((r) => r.id === selectedReport)?.name}
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                レポートを生成するには「出力」ボタンをクリックしてください
              </p>
              <button
                onClick={() => handleGenerate(selectedReport)}
                disabled={generating}
                className="aegis-btn-primary mt-4"
              >
                レポートを生成
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
