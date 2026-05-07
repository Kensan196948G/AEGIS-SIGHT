'use client';

import { useState } from 'react';
import { Badge, SearchInput, Modal, DonutChart, ProgressBar } from '@/components/ui/design-components';

const DEPARTMENTS = [
  { id: 'dp-001', name: 'エンジニアリング部',   head: '山本 健司', members: 42, devices: 89,  licenses: 96,  mfaRate: 100, status: 'healthy', budget: 18000000 },
  { id: 'dp-002', name: 'セキュリティ部',       head: '田中 浩',   members: 12, devices: 28,  licenses: 34,  mfaRate: 100, status: 'healthy', budget:  6000000 },
  { id: 'dp-003', name: 'コンプライアンス部',   head: '佐藤 由紀', members:  8, devices: 18,  licenses: 22,  mfaRate:  88, status: 'warning', budget:  4000000 },
  { id: 'dp-004', name: 'インフラ部',           head: '伊藤 勝',   members: 15, devices: 52,  licenses: 38,  mfaRate: 100, status: 'healthy', budget:  8000000 },
  { id: 'dp-005', name: '営業部',               head: '鈴木 明',   members: 65, devices: 70,  licenses: 140, mfaRate:  72, status: 'warning', budget: 10000000 },
  { id: 'dp-006', name: '総務部',               head: '渡辺 さくら', members: 20, devices: 22, licenses: 48,  mfaRate:  90, status: 'healthy', budget:  5000000 },
  { id: 'dp-007', name: '人事部',               head: '高橋 誠一', members: 14, devices: 16,  licenses: 32,  mfaRate:  86, status: 'warning', budget:  4000000 },
  { id: 'dp-008', name: '建設現場管理部',       head: '中村 大樹', members: 30, devices: 35,  licenses: 62,  mfaRate:  80, status: 'warning', budget:  7000000 },
  { id: 'dp-009', name: '内部監査部',           head: '加藤 光',   members:  6, devices:  8,  licenses: 14,  mfaRate: 100, status: 'healthy', budget:  2000000 },
];

type DeptStatus = 'healthy' | 'warning' | 'critical';
const STATUS_CFG: Record<DeptStatus, { l: string; v: 'success' | 'warning' | 'danger' }> = {
  healthy:  { l: '良好', v: 'success' },
  warning:  { l: '要注意', v: 'warning' },
  critical: { l: '危険',   v: 'danger'  },
};

type Dept = typeof DEPARTMENTS[number];

const totalMembers  = DEPARTMENTS.reduce((s, d) => s + d.members, 0);
const totalDevices  = DEPARTMENTS.reduce((s, d) => s + d.devices, 0);
const avgMfa        = Math.round(DEPARTMENTS.reduce((s, d) => s + d.mfaRate, 0) / DEPARTMENTS.length);
const warningDepts  = DEPARTMENTS.filter(d => d.status !== 'healthy').length;

export default function DepartmentsPage() {
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<Dept | null>(null);

  const filtered = DEPARTMENTS.filter(d =>
    !search ||
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.head.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">部門管理</h1>
          <p className="page-subtitle">組織部門ごとのデバイス・ライセンス・MFA 適用状況</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary">CSVエクスポート</button>
        </div>
      </div>

      <div className="grid-4">
        <div className="card card-center"><p className="stat-label">部門数</p><p className="stat-value">{DEPARTMENTS.length}</p></div>
        <div className="card card-center"><p className="stat-label">総ユーザー数</p><p className="stat-value">{totalMembers}</p></div>
        <div className="card card-center"><p className="stat-label">総デバイス数</p><p className="stat-value">{totalDevices}</p></div>
        <div className="card card-center">
          <p className="stat-label">平均MFA適用率</p>
          <p className="stat-value" style={{ color: avgMfa >= 90 ? '#10b981' : '#f59e0b' }}>{avgMfa}%</p>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">MFA 適用状況サマリー</h2>
        <div className="chart-row">
          <div className="chart-center">
            <p className="chart-label">組織全体 MFA 率</p>
            <DonutChart value={avgMfa} max={100} size={130} strokeWidth={13} color={avgMfa >= 90 ? '#10b981' : '#f59e0b'} />
            <p className="chart-sublabel">全部門平均</p>
          </div>
          <div style={{ flex: 1 }}>
            <p className="chart-label" style={{ marginBottom: 8 }}>部門別 MFA 適用率</p>
            {DEPARTMENTS.map(d => (
              <div key={d.id} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span className="text-sub" style={{ fontSize: 12 }}>{d.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: d.mfaRate >= 90 ? '#10b981' : '#f59e0b' }}>{d.mfaRate}%</span>
                </div>
                <ProgressBar value={d.mfaRate} max={100} color={d.mfaRate >= 90 ? '#10b981' : '#f59e0b'} size="sm" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card filter-row">
        <SearchInput placeholder="部門名・部門長で検索..." value={search} onChange={v => setSearch(v)} style={{ flex: 1, minWidth: 200 }} />
      </div>

      <div className="card table-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr>
              {['部門名', '部門長', 'メンバー数', 'デバイス数', 'ライセンス数', 'MFA適用率', '状態'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(d => {
                const st = STATUS_CFG[d.status as DeptStatus] ?? STATUS_CFG.healthy;
                return (
                  <tr key={d.id} className="table-row-hover" onClick={() => setDetail(d)} style={{ cursor: 'pointer' }}>
                    <td><span className="link-text">{d.name}</span></td>
                    <td className="text-sub">{d.head}</td>
                    <td className="text-sub">{d.members}</td>
                    <td className="text-sub">{d.devices}</td>
                    <td className="text-sub">{d.licenses}</td>
                    <td>
                      <span style={{ fontWeight: 600, color: d.mfaRate >= 90 ? '#10b981' : '#f59e0b' }}>{d.mfaRate}%</span>
                    </td>
                    <td><Badge variant={st.v} dot>{st.l}</Badge></td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={7} className="table-empty">条件に一致する部門が見つかりません</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span className="table-info">全 {DEPARTMENTS.length} 件中 {filtered.length} 件を表示</span>
        </div>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name ?? '部門詳細'} wide>
        {detail && (
          <div className="detail-grid">
            {([
              ['部門長',         detail.head],
              ['メンバー数',     String(detail.members)],
              ['デバイス数',     String(detail.devices)],
              ['ライセンス数',   String(detail.licenses)],
              ['MFA適用率',      `${detail.mfaRate}%`],
              ['予算',           `¥${detail.budget.toLocaleString()}`],
              ['状態',           STATUS_CFG[detail.status as DeptStatus]?.l ?? '不明'],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="detail-item">
                <span className="detail-label">{k}</span>
                <span className="detail-value">{v}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
