'use client';

import { useState } from 'react';
import {
  Badge, DonutChart, MiniBarChart,
  SearchInput, Select, Modal,
} from '@/components/ui/design-components';

const DEMO_ASSETS = [
  { id: 'a001', name: 'ThinkPad X1 Carbon Gen11',  type: 'hardware',  category: 'ノートPC',       serial: 'PF3A2B1C',     assignee: '田中 一郎',         dept: 'エンジニアリング', location: '本社 3F',        status: 'active',      purchased: '2023-04-01', warranty: '2026-03-31' },
  { id: 'a002', name: 'Dell OptiPlex 7090',         type: 'hardware',  category: 'デスクトップPC', serial: 'DL7090X2',     assignee: '佐藤 花子',         dept: '営業',             location: '本社 2F',        status: 'active',      purchased: '2022-10-15', warranty: '2025-10-14' },
  { id: 'a003', name: 'HP EliteDesk 800 G9',        type: 'hardware',  category: 'デスクトップPC', serial: 'HP800G9A3',    assignee: '（共有）',          dept: '人事',             location: '本社 4F',        status: 'maintenance', purchased: '2023-01-20', warranty: '2026-01-19' },
  { id: 'a004', name: 'Cisco Catalyst 2960-X',      type: 'network',   category: 'スイッチ',       serial: 'CSC2960X4',    assignee: '（インフラ共有）',  dept: 'インフラ',         location: 'サーバルーム B1', status: 'active',      purchased: '2021-06-01', warranty: '2026-05-31' },
  { id: 'a005', name: 'Microsoft Office 2021 Pro',  type: 'software',  category: 'オフィスソフト', serial: 'MSOF2021-500', assignee: '（ライセンス一括）', dept: '全部門',           location: '-',             status: 'active',      purchased: '2021-10-05', warranty: '2026-10-04' },
  { id: 'a006', name: 'HP LaserJet Pro M404n',      type: 'peripheral',category: 'プリンタ',       serial: 'HPC9T14A',     assignee: '（共有）',          dept: '経理',             location: '本社 1F',        status: 'active',      purchased: '2022-03-10', warranty: '2025-03-09' },
  { id: 'a007', name: 'MacBook Pro 14" M3',         type: 'hardware',  category: 'ノートPC',       serial: 'APMBP14M3',    assignee: '山田 次郎',         dept: 'デザイン',         location: '本社 3F',        status: 'active',      purchased: '2024-01-15', warranty: '2025-01-14' },
  { id: 'a008', name: 'Windows Server 2022 Std',    type: 'software',  category: 'OS/サーバ',      serial: 'WSRV2022-10',  assignee: '（インフラ共有）',  dept: 'インフラ',         location: 'サーバルーム B1', status: 'active',      purchased: '2022-07-01', warranty: '2027-06-30' },
  { id: 'a009', name: 'Dell PowerEdge R750',        type: 'hardware',  category: 'サーバ',         serial: 'DLPE750S9',    assignee: '（インフラ共有）',  dept: 'インフラ',         location: 'サーバルーム B1', status: 'active',      purchased: '2023-08-01', warranty: '2028-07-31' },
  { id: 'a010', name: 'ThinkPad T14s Gen4',         type: 'hardware',  category: 'ノートPC',       serial: 'PFT14S04A',    assignee: '鈴木 三郎',         dept: '人事',             location: '本社 4F',        status: 'retired',     purchased: '2020-04-01', warranty: '2023-03-31' },
  { id: 'a011', name: 'EPSON EP-886AB',             type: 'peripheral',category: 'プリンタ',       serial: 'EPS886AB1',    assignee: '（共有）',          dept: '総務',             location: '本社 1F',        status: 'active',      purchased: '2023-11-01', warranty: '2026-10-31' },
  { id: 'a012', name: 'Adobe Creative Cloud',       type: 'software',  category: 'デザインツール', serial: 'ADO-CC-50',    assignee: '（ライセンス一括）', dept: 'デザイン',         location: '-',             status: 'active',      purchased: '2024-01-01', warranty: '2025-12-31' },
];

type AssetType   = 'hardware' | 'software' | 'network' | 'peripheral';
type AssetStatus = 'active' | 'inactive' | 'maintenance' | 'retired';
type Asset = typeof DEMO_ASSETS[number];

const TYPE_LABELS: Record<AssetType, string> = { hardware: 'ハードウェア', software: 'ソフトウェア', network: 'ネットワーク', peripheral: '周辺機器' };
const ASSET_STATUS: Record<AssetStatus, { v: 'success' | 'default' | 'warning' | 'danger'; l: string }> = {
  active:      { v: 'success', l: 'アクティブ' },
  inactive:    { v: 'default', l: '非アクティブ' },
  maintenance: { v: 'warning', l: 'メンテナンス中' },
  retired:     { v: 'danger',  l: '廃棄済み' },
};
const TYPE_BADGE: Record<AssetType, 'info' | 'purple' | 'warning' | 'default'> = { hardware: 'info', software: 'purple', network: 'warning', peripheral: 'default' };

const getAssetStatus = (s: string) => ASSET_STATUS[s as AssetStatus] ?? ASSET_STATUS.active;
const daysLeft = (d: string) => Math.ceil((new Date(d).getTime() - new Date().getTime()) / 86400000);

const PER_PAGE = 8;

export default function AssetsPage() {
  const [search, setSearch]   = useState('');
  const [typeF, setTypeF]     = useState('all');
  const [statusF, setStatusF] = useState('all');
  const [deptF, setDeptF]     = useState('all');
  const [page, setPage]       = useState(1);
  const [detail, setDetail]   = useState<Asset | null>(null);

  const depts = [...new Set(DEMO_ASSETS.map(a => a.dept))].sort();

  const filtered = DEMO_ASSETS.filter(a => {
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.serial.toLowerCase().includes(search.toLowerCase()) && !a.assignee.includes(search)) return false;
    if (typeF !== 'all' && a.type !== typeF) return false;
    if (statusF !== 'all' && a.status !== statusF) return false;
    if (deptF !== 'all' && a.dept !== deptF) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const totalActive = DEMO_ASSETS.filter(a => a.status === 'active').length;
  const totalMaint  = DEMO_ASSETS.filter(a => a.status === 'maintenance').length;
  const expiring    = DEMO_ASSETS.filter(a => { const d = daysLeft(a.warranty); return d >= 0 && d <= 90; }).length;
  const activeRate  = Math.round((totalActive / DEMO_ASSETS.length) * 100);

  const typeCounts = DEMO_ASSETS.reduce<Record<string, number>>((acc, a) => { acc[a.type] = (acc[a.type] ?? 0) + 1; return acc; }, {});
  const typeBarData = [
    { label: 'ハードウェア', value: typeCounts.hardware  ?? 0, color: '#3b82f6' },
    { label: 'ソフトウェア', value: typeCounts.software  ?? 0, color: '#8b5cf6' },
    { label: 'ネットワーク', value: typeCounts.network   ?? 0, color: '#f59e0b' },
    { label: '周辺機器',     value: typeCounts.peripheral ?? 0, color: '#94a3b8' },
  ];

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">IT資産一覧</h1>
          <p className="page-subtitle">管理対象のハードウェア・ソフトウェア・ネットワーク資産</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary">CSVエクスポート</button>
          <button className="btn-primary">資産を追加</button>
        </div>
      </div>

      {/* Charts */}
      <div className="card">
        <h2 className="card-title">資産概要</h2>
        <div className="chart-row">
          <div className="chart-center">
            <p className="chart-label">アクティブ率</p>
            <DonutChart value={activeRate} max={100} size={140} strokeWidth={14} color={activeRate >= 80 ? '#10b981' : '#f59e0b'} />
            <p className="chart-sublabel">総資産 {DEMO_ASSETS.length} 件中 {totalActive} 件アクティブ</p>
          </div>
          <div style={{ flex: 1 }}>
            <p className="chart-label">種別別台数</p>
            <MiniBarChart data={typeBarData} maxValue={DEMO_ASSETS.length} height={160} />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid-4">
        <div className="card card-center"><p className="stat-label">総資産数</p><p className="stat-value">{DEMO_ASSETS.length}</p></div>
        <div className="card card-center"><p className="stat-label">アクティブ</p><p className="stat-value text-green">{totalActive}</p></div>
        <div className="card card-center"><p className="stat-label">メンテナンス中</p><p className="stat-value text-amber">{totalMaint}</p></div>
        <div className="card card-center"><p className="stat-label">保証期限 90日以内</p><p className="stat-value text-red">{expiring}</p></div>
      </div>

      {/* Filters */}
      <div className="card filter-row">
        <SearchInput placeholder="資産名、シリアル番号、担当者で検索..." value={search} onChange={v => { setSearch(v); setPage(1); }} style={{ flex: 1, minWidth: 200 }} />
        <Select value={typeF} onChange={v => { setTypeF(v); setPage(1); }} options={[{ value: 'all', label: 'すべての種別' }, ...Object.entries(TYPE_LABELS).map(([k, l]) => ({ value: k, label: l }))]} />
        <Select value={statusF} onChange={v => { setStatusF(v); setPage(1); }} options={[{ value: 'all', label: 'すべてのステータス' }, { value: 'active', label: 'アクティブ' }, { value: 'maintenance', label: 'メンテナンス中' }, { value: 'retired', label: '廃棄済み' }]} />
        <Select value={deptF} onChange={v => { setDeptF(v); setPage(1); }} options={[{ value: 'all', label: 'すべての部門' }, ...depts.map(d => ({ value: d, label: d }))]} />
      </div>

      {/* Table */}
      <div className="card table-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr>
              {['資産名', '種別', 'カテゴリ', 'シリアル番号', '担当者', '部門', '保証期限', 'ステータス'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {paginated.length > 0 ? paginated.map(a => {
                const dl  = daysLeft(a.warranty);
                const sc  = getAssetStatus(a.status);
                const wCls = dl < 0 ? 'text-red' : dl <= 90 ? 'text-amber' : '';
                return (
                  <tr key={a.id} className="table-row-hover" onClick={() => setDetail(a)} style={{ cursor: 'pointer' }}>
                    <td><span className="link-text">{a.name}</span></td>
                    <td><Badge variant={TYPE_BADGE[a.type as AssetType] ?? 'default'}>{TYPE_LABELS[a.type as AssetType] ?? a.type}</Badge></td>
                    <td>{a.category}</td>
                    <td className="mono">{a.serial}</td>
                    <td>{a.assignee}</td>
                    <td>{a.dept}</td>
                    <td className={wCls}>{a.warranty}{dl < 0 ? '（期限切れ）' : dl <= 90 ? `（残${dl}日）` : ''}</td>
                    <td><Badge variant={sc.v} dot>{sc.l}</Badge></td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={8} className="table-empty">条件に一致する資産が見つかりません</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span className="table-info">全 {filtered.length} 件中 {filtered.length > 0 ? (page - 1) * PER_PAGE + 1 : 0}–{Math.min(page * PER_PAGE, filtered.length)} 件</span>
          <div className="table-pagination">
            <button className="btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>前へ</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} className={p === page ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>次へ</button>
          </div>
        </div>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name ?? '資産詳細'} wide>
        {detail && (
          <div className="detail-grid">
            {([['種別', TYPE_LABELS[detail.type as AssetType]], ['カテゴリ', detail.category], ['シリアル番号', detail.serial], ['担当者', detail.assignee], ['部門', detail.dept], ['設置場所', detail.location], ['購入日', detail.purchased], ['保証期限', detail.warranty], ['ステータス', getAssetStatus(detail.status).l]] as [string, string][]).map(([k, v]) => (
              <div key={k} className="detail-item"><span className="detail-label">{k}</span><span className="detail-value">{v}</span></div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
