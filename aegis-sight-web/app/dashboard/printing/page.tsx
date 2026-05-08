'use client';

import { Badge, SearchInput, DonutChart } from '@/components/ui/design-components';
import { useState } from 'react';

const PRINTERS = [
  { id: 'pr-001', name: '本社 3F 複合機-A', model: 'Canon imageRUNNER 2630i', location: '本社 3F', status: 'online', color: true,  jobs: 142, pages: 3840 },
  { id: 'pr-002', name: '本社 3F 複合機-B', model: 'Canon imageRUNNER 2630i', location: '本社 3F', status: 'online', color: true,  jobs:  98, pages: 2210 },
  { id: 'pr-003', name: '本社 5F モノクロ', model: 'HP LaserJet Pro M404',    location: '本社 5F', status: 'online', color: false, jobs:  67, pages: 1540 },
  { id: 'pr-004', name: '大阪支社 複合機',  model: 'Fujifilm Apeos C5570',    location: '大阪支社', status: 'warning', color: true, jobs:  21, pages:  480 },
  { id: 'pr-005', name: '名古屋支社 複合機', model: 'Ricoh IM C4510',         location: '名古屋支社', status: 'offline', color: true, jobs:  0, pages:    0 },
];

const PRINT_LOGS = [
  { user: '田中 浩',     dept: 'セキュリティ', pages: 12, color: true,  printer: '本社 3F 複合機-A', time: '2025-01-15 14:22' },
  { user: '山本 健司',   dept: 'エンジニアリング', pages: 4, color: false, printer: '本社 3F 複合機-B', time: '2025-01-15 13:55' },
  { user: '佐藤 由紀',   dept: 'コンプライアンス', pages: 28, color: true, printer: '本社 3F 複合機-A', time: '2025-01-15 13:10' },
  { user: '鈴木 明',     dept: '営業',         pages: 50, color: true,  printer: '本社 3F 複合機-A', time: '2025-01-15 12:45' },
  { user: '渡辺 さくら', dept: '内部監査',     pages: 8,  color: false, printer: '本社 5F モノクロ',  time: '2025-01-15 11:30' },
  { user: '伊藤 勝',     dept: 'インフラ',     pages: 3,  color: false, printer: '本社 5F モノクロ',  time: '2025-01-15 10:15' },
];

type PrinterStatus = 'online' | 'warning' | 'offline';
const STATUS_CFG: Record<PrinterStatus, { l: string; v: 'success' | 'warning' | 'default' }> = {
  online:  { l: 'オンライン', v: 'success' },
  warning: { l: '警告',       v: 'warning' },
  offline: { l: 'オフライン', v: 'default' },
};

const totalPages = PRINTERS.reduce((s, p) => s + p.pages, 0);
const onlineCount = PRINTERS.filter(p => p.status === 'online').length;
const colorPages  = Math.round(totalPages * 0.68);

export default function PrintingPage() {
  const [search, setSearch] = useState('');

  const filteredLogs = PRINT_LOGS.filter(l =>
    !search ||
    l.user.includes(search) ||
    l.dept.includes(search) ||
    l.printer.includes(search)
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">印刷管理</h1>
          <p className="page-subtitle">プリンターの稼働状況と印刷ジョブ・使用量の管理</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary">CSVエクスポート</button>
        </div>
      </div>

      <div className="grid-4">
        <div className="card card-center"><p className="stat-label">プリンター数</p><p className="stat-value">{PRINTERS.length}</p></div>
        <div className="card card-center"><p className="stat-label">オンライン</p><p className="stat-value text-green">{onlineCount}</p></div>
        <div className="card card-center"><p className="stat-label">本日総印刷枚数</p><p className="stat-value">{totalPages.toLocaleString()}</p></div>
        <div className="card card-center"><p className="stat-label">カラー印刷比率</p><p className="stat-value text-amber">{Math.round(colorPages / totalPages * 100)}%</p></div>
      </div>

      <div className="card">
        <h2 className="card-title">印刷量内訳</h2>
        <div className="chart-row">
          <div className="chart-center">
            <p className="chart-label">カラー vs モノクロ</p>
            <DonutChart value={Math.round(colorPages / totalPages * 100)} max={100} size={130} strokeWidth={13} color="#f59e0b" />
            <p className="chart-sublabel">カラー印刷率 {Math.round(colorPages / totalPages * 100)}%</p>
          </div>
          <div style={{ flex: 1 }}>
            <p className="chart-label" style={{ marginBottom: 8 }}>プリンター別印刷枚数（本日）</p>
            {PRINTERS.filter(p => p.pages > 0).map(p => (
              <div key={p.id} className="activity-item">
                <div className="activity-dot" style={{ background: p.status === 'online' ? '#10b981' : '#f59e0b' }} />
                <div className="activity-content">
                  <p className="activity-text">
                    <strong>{p.name}</strong>
                    <span className="text-sub" style={{ marginLeft: 8 }}>{p.pages.toLocaleString()} 枚</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card table-card">
        <h2 className="card-title">プリンター一覧</h2>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr>
              {['プリンター名', 'モデル', '設置場所', 'カラー', '本日ジョブ数', '本日印刷枚数', '状態'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {PRINTERS.map(p => {
                const st = STATUS_CFG[p.status as PrinterStatus] ?? STATUS_CFG.offline;
                return (
                  <tr key={p.id} className="table-row-hover">
                    <td><span className="text-main" style={{ fontWeight: 500 }}>{p.name}</span></td>
                    <td className="text-sub">{p.model}</td>
                    <td className="text-sub">{p.location}</td>
                    <td><Badge variant={p.color ? 'info' : 'default'}>{p.color ? 'カラー' : 'モノクロ'}</Badge></td>
                    <td className="text-sub">{p.jobs}</td>
                    <td className="text-sub">{p.pages.toLocaleString()}</td>
                    <td><Badge variant={st.v} dot>{st.l}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card filter-row">
        <SearchInput placeholder="ユーザー・部門・プリンターで検索..." value={search} onChange={v => setSearch(v)} style={{ flex: 1, minWidth: 200 }} />
      </div>

      <div className="card table-card">
        <h2 className="card-title">印刷ログ（本日）</h2>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr>
              {['ユーザー', '部門', '印刷枚数', '種別', 'プリンター', '時刻'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filteredLogs.length > 0 ? filteredLogs.map((l, i) => (
                <tr key={i} className="table-row-hover">
                  <td><span className="text-main">{l.user}</span></td>
                  <td className="text-sub">{l.dept}</td>
                  <td className="text-sub">{l.pages}</td>
                  <td><Badge variant={l.color ? 'info' : 'default'}>{l.color ? 'カラー' : 'モノクロ'}</Badge></td>
                  <td className="text-sub">{l.printer}</td>
                  <td className="text-sub">{l.time}</td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="table-empty">条件に一致するログが見つかりません</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span className="table-info">全 {PRINT_LOGS.length} 件中 {filteredLogs.length} 件を表示</span>
        </div>
      </div>
    </div>
  );
}
