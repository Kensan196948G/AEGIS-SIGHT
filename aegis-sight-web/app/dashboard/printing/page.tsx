'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PrintJobStatus = 'completed' | 'failed' | 'cancelled';
type TabId = 'stats' | 'printers' | 'jobs' | 'policies';

interface Printer {
  id: string;
  name: string;
  location: string;
  ip_address: string | null;
  model: string;
  is_network: boolean;
  is_active: boolean;
  department: string | null;
  created_at: string;
}

interface PrintJob {
  id: string;
  printer_id: string;
  printer_name: string;
  device_id: string | null;
  user_name: string;
  document_name: string;
  pages: number;
  copies: number;
  color: boolean;
  duplex: boolean;
  paper_size: string;
  status: PrintJobStatus;
  printed_at: string;
}

interface PrintPolicy {
  id: string;
  name: string;
  description: string | null;
  max_pages_per_day: number | null;
  max_pages_per_month: number | null;
  allow_color: boolean;
  allow_duplex_only: boolean;
  target_departments: string[] | null;
  is_enabled: boolean;
  created_at: string;
}

interface UserStat {
  user_name: string;
  total_pages: number;
  total_jobs: number;
  color_pages: number;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockPrinters: Printer[] = [
  {
    id: '1',
    name: 'HP LaserJet Pro M404dn',
    location: '1F 総務部エリア',
    ip_address: '192.168.1.101',
    model: 'HP LaserJet Pro M404dn',
    is_network: true,
    is_active: true,
    department: '総務部',
    created_at: '2025-06-01T09:00:00Z',
  },
  {
    id: '2',
    name: 'Canon imageRUNNER C3530',
    location: '2F 営業部エリア',
    ip_address: '192.168.1.102',
    model: 'Canon imageRUNNER C3530',
    is_network: true,
    is_active: true,
    department: '営業部',
    created_at: '2025-06-10T10:00:00Z',
  },
  {
    id: '3',
    name: 'RICOH MP C3004',
    location: '3F 開発部エリア',
    ip_address: '192.168.1.103',
    model: 'RICOH MP C3004',
    is_network: true,
    is_active: true,
    department: '開発部',
    created_at: '2025-07-01T08:00:00Z',
  },
  {
    id: '4',
    name: 'Brother HL-L2375DW',
    location: '4F 経理部エリア',
    ip_address: '192.168.1.104',
    model: 'Brother HL-L2375DW',
    is_network: true,
    is_active: false,
    department: '経理部',
    created_at: '2025-08-15T11:00:00Z',
  },
];

const mockJobs: PrintJob[] = [
  {
    id: '1',
    printer_id: '1',
    printer_name: 'HP LaserJet Pro M404dn',
    device_id: null,
    user_name: '田中太郎',
    document_name: '月次レポート_2026年3月.xlsx',
    pages: 15,
    copies: 2,
    color: false,
    duplex: true,
    paper_size: 'A4',
    status: 'completed',
    printed_at: '2026-03-27T09:15:00Z',
  },
  {
    id: '2',
    printer_id: '2',
    printer_name: 'Canon imageRUNNER C3530',
    device_id: null,
    user_name: '鈴木花子',
    document_name: 'プレゼン資料_新商品企画.pptx',
    pages: 24,
    copies: 5,
    color: true,
    duplex: false,
    paper_size: 'A4',
    status: 'completed',
    printed_at: '2026-03-27T10:30:00Z',
  },
  {
    id: '3',
    printer_id: '3',
    printer_name: 'RICOH MP C3004',
    device_id: null,
    user_name: '佐藤一郎',
    document_name: '設計書_v2.1.pdf',
    pages: 48,
    copies: 1,
    color: false,
    duplex: true,
    paper_size: 'A3',
    status: 'completed',
    printed_at: '2026-03-27T11:00:00Z',
  },
  {
    id: '4',
    printer_id: '1',
    printer_name: 'HP LaserJet Pro M404dn',
    device_id: null,
    user_name: '山田次郎',
    document_name: '契約書_ABC社.docx',
    pages: 8,
    copies: 3,
    color: false,
    duplex: true,
    paper_size: 'A4',
    status: 'failed',
    printed_at: '2026-03-27T11:30:00Z',
  },
  {
    id: '5',
    printer_id: '2',
    printer_name: 'Canon imageRUNNER C3530',
    device_id: null,
    user_name: '田中太郎',
    document_name: '会議アジェンダ.pdf',
    pages: 3,
    copies: 10,
    color: true,
    duplex: false,
    paper_size: 'A4',
    status: 'completed',
    printed_at: '2026-03-26T14:00:00Z',
  },
  {
    id: '6',
    printer_id: '3',
    printer_name: 'RICOH MP C3004',
    device_id: null,
    user_name: '鈴木花子',
    document_name: '見積書_XYZ案件.xlsx',
    pages: 2,
    copies: 1,
    color: false,
    duplex: false,
    paper_size: 'A4',
    status: 'cancelled',
    printed_at: '2026-03-26T15:30:00Z',
  },
];

const mockPolicies: PrintPolicy[] = [
  {
    id: '1',
    name: 'エコ印刷ポリシー',
    description: 'カラー印刷を制限し、両面印刷を推奨する環境配慮ポリシー',
    max_pages_per_day: 100,
    max_pages_per_month: 2000,
    allow_color: false,
    allow_duplex_only: true,
    target_departments: null,
    is_enabled: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: '営業部カラー許可',
    description: '営業部はプレゼン資料のためカラー印刷を許可',
    max_pages_per_day: 200,
    max_pages_per_month: 5000,
    allow_color: true,
    allow_duplex_only: false,
    target_departments: ['営業部'],
    is_enabled: true,
    created_at: '2026-01-15T00:00:00Z',
  },
  {
    id: '3',
    name: '開発部制限ポリシー',
    description: '開発部の印刷量を制限（ペーパーレス推進）',
    max_pages_per_day: 30,
    max_pages_per_month: 500,
    allow_color: false,
    allow_duplex_only: true,
    target_departments: ['開発部'],
    is_enabled: true,
    created_at: '2026-02-01T00:00:00Z',
  },
];

const mockUserStats: UserStat[] = [
  { user_name: '田中太郎', total_pages: 1250, total_jobs: 85, color_pages: 320 },
  { user_name: '鈴木花子', total_pages: 980, total_jobs: 62, color_pages: 540 },
  { user_name: '佐藤一郎', total_pages: 760, total_jobs: 45, color_pages: 120 },
  { user_name: '山田次郎', total_pages: 520, total_jobs: 38, color_pages: 80 },
  { user_name: '高橋美咲', total_pages: 430, total_jobs: 30, color_pages: 210 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusBadge(status: PrintJobStatus) {
  switch (status) {
    case 'completed':
      return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">完了</Badge>;
    case 'failed':
      return <Badge variant="default" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">失敗</Badge>;
    case 'cancelled':
      return <Badge variant="default" className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">キャンセル</Badge>;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatsCards() {
  const totalPages = mockJobs
    .filter((j) => j.status === 'completed')
    .reduce((sum, j) => sum + j.pages * j.copies, 0);
  const totalJobs = mockJobs.filter((j) => j.status === 'completed').length;
  const colorJobs = mockJobs.filter((j) => j.status === 'completed' && j.color).length;
  const colorRatio = totalJobs > 0 ? ((colorJobs / totalJobs) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <div className="text-sm text-gray-500 dark:text-gray-400">総印刷ページ数</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {totalPages.toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 mt-1">今月</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <div className="text-sm text-gray-500 dark:text-gray-400">総ジョブ数</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalJobs}</div>
          <div className="text-xs text-gray-400 mt-1">今月</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <div className="text-sm text-gray-500 dark:text-gray-400">カラー率</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{colorRatio}%</div>
          <div className="text-xs text-gray-400 mt-1">完了ジョブ中</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <div className="text-sm text-gray-500 dark:text-gray-400">稼働プリンタ</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            {mockPrinters.filter((p) => p.is_active).length} / {mockPrinters.length}
          </div>
          <div className="text-xs text-gray-400 mt-1">アクティブ / 全台数</div>
        </div>
      </div>

      {/* User Top 5 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">ユーザー別印刷トップ5</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">順位</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ユーザー名</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">総ページ数</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ジョブ数</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">カラーページ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {mockUserStats.map((u, i) => (
                <tr key={u.user_name} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">{i + 1}</td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-900 dark:text-white">{u.user_name}</td>
                  <td className="px-5 py-3 text-sm text-right text-gray-700 dark:text-gray-300">{u.total_pages.toLocaleString()}</td>
                  <td className="px-5 py-3 text-sm text-right text-gray-700 dark:text-gray-300">{u.total_jobs}</td>
                  <td className="px-5 py-3 text-sm text-right text-gray-700 dark:text-gray-300">{u.color_pages.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PrintersTable() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">プリンタ一覧</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">名前</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">設置場所</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">IPアドレス</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">機種</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">部門</th>
              <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ネットワーク</th>
              <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ステータス</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {mockPrinters.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-5 py-3 text-sm font-medium text-gray-900 dark:text-white">{p.name}</td>
                <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300">{p.location}</td>
                <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono">{p.ip_address ?? '-'}</td>
                <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300">{p.model}</td>
                <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300">{p.department ?? '-'}</td>
                <td className="px-5 py-3 text-sm text-center">
                  {p.is_network ? (
                    <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">LAN</Badge>
                  ) : (
                    <Badge variant="default" className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">USB</Badge>
                  )}
                </td>
                <td className="px-5 py-3 text-sm text-center">
                  {p.is_active ? (
                    <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">稼働中</Badge>
                  ) : (
                    <Badge variant="default" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">停止</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function JobsTable() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">印刷ジョブ履歴</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">日時</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ユーザー</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ドキュメント</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">プリンタ</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ページ</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">部数</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">カラー</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">両面</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">用紙</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ステータス</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {mockJobs.map((j) => (
              <tr key={j.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(j.printed_at)}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{j.user_name}</td>
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-[200px] truncate" title={j.document_name}>{j.document_name}</td>
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{j.printer_name}</td>
                <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">{j.pages}</td>
                <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">{j.copies}</td>
                <td className="px-4 py-3 text-sm text-center">
                  {j.color ? (
                    <span className="inline-block w-3 h-3 rounded-full bg-blue-500" title="カラー" />
                  ) : (
                    <span className="inline-block w-3 h-3 rounded-full bg-gray-400" title="モノクロ" />
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-center text-gray-700 dark:text-gray-300">{j.duplex ? '両面' : '片面'}</td>
                <td className="px-4 py-3 text-sm text-center text-gray-700 dark:text-gray-300">{j.paper_size}</td>
                <td className="px-4 py-3 text-sm text-center">{statusBadge(j.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PoliciesTable() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">印刷ポリシー管理</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ポリシー名</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">説明</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">日次上限</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">月次上限</th>
              <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">カラー</th>
              <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">両面のみ</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">対象部門</th>
              <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ステータス</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {mockPolicies.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-5 py-3 text-sm font-medium text-gray-900 dark:text-white">{p.name}</td>
                <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-[250px] truncate" title={p.description ?? undefined}>{p.description ?? '-'}</td>
                <td className="px-5 py-3 text-sm text-right text-gray-700 dark:text-gray-300">{p.max_pages_per_day?.toLocaleString() ?? '-'}</td>
                <td className="px-5 py-3 text-sm text-right text-gray-700 dark:text-gray-300">{p.max_pages_per_month?.toLocaleString() ?? '-'}</td>
                <td className="px-5 py-3 text-sm text-center">
                  {p.allow_color ? (
                    <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">許可</Badge>
                  ) : (
                    <Badge variant="default" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">禁止</Badge>
                  )}
                </td>
                <td className="px-5 py-3 text-sm text-center">
                  {p.allow_duplex_only ? (
                    <Badge variant="default" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">必須</Badge>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300">
                  {p.target_departments ? p.target_departments.join(', ') : '全部門'}
                </td>
                <td className="px-5 py-3 text-sm text-center">
                  {p.is_enabled ? (
                    <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">有効</Badge>
                  ) : (
                    <Badge variant="default" className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">無効</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

const tabs: { id: TabId; label: string }[] = [
  { id: 'stats', label: '統計' },
  { id: 'printers', label: 'プリンタ' },
  { id: 'jobs', label: 'ジョブ履歴' },
  { id: 'policies', label: 'ポリシー' },
];

export default function PrintingPage() {
  const [activeTab, setActiveTab] = useState<TabId>('stats');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">印刷管理</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          プリンタ管理、印刷ジョブ監視、ポリシーによる印刷制御
        </p>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-6" aria-label="印刷管理タブ">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-300'
              }`}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'stats' && <StatsCards />}
      {activeTab === 'printers' && <PrintersTable />}
      {activeTab === 'jobs' && <JobsTable />}
      {activeTab === 'policies' && <PoliciesTable />}
    </div>
  );
}
