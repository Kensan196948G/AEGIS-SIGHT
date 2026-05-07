'use client';

import { useState } from 'react';
import {
  Badge, SearchInput, Modal,
} from '@/components/ui/design-components';

const DEVICE_GROUPS = [
  { id: 'dg-001', name: '全社 Windows 11 端末',     description: 'Windows 11 搭載の全エンドポイント',       deviceCount: 842, policy: 'Windows標準ポリシー',        status: 'active',  created: '2024-04-01' },
  { id: 'dg-002', name: '開発チーム Mac',            description: 'エンジニア・デザイン部門のMac端末',       deviceCount: 124, policy: 'Mac開発者ポリシー',          status: 'active',  created: '2024-05-15' },
  { id: 'dg-003', name: '建設現場端末',              description: '各建設現場に配備されたフィールド端末',     deviceCount: 210, policy: '現場強化セキュリティポリシー', status: 'active',  created: '2024-06-01' },
  { id: 'dg-004', name: '重要インフラサーバー',      description: 'DB・AP・認証サーバー群',                  deviceCount:  28, policy: 'サーバー厳格ポリシー',       status: 'active',  created: '2024-04-01' },
  { id: 'dg-005', name: 'パッチ未適用端末',          description: '緊急パッチが未適用の隔離グループ',         deviceCount:  47, policy: '隔離ポリシー',               status: 'warning', created: '2025-03-01' },
  { id: 'dg-006', name: 'リモートワーク端末',        description: 'VPN接続実績のあるリモート勤務端末',        deviceCount: 312, policy: 'リモートアクセスポリシー',   status: 'active',  created: '2024-09-01' },
  { id: 'dg-007', name: 'コンプライアンス違反端末',  description: 'ポリシー違反検出・要調査グループ',         deviceCount:  13, policy: '違反端末ポリシー',           status: 'danger',  created: '2025-02-15' },
  { id: 'dg-008', name: '廃棄予定端末',              description: '廃棄申請済みまたは廃棄承認済みの端末',     deviceCount:  25, policy: '廃棄前ポリシー',             status: 'default', created: '2025-01-10' },
  { id: 'dg-009', name: '営業部 Windows 10 端末',   description: '営業部門に残るWindows 10端末',            deviceCount:  67, policy: 'Windows 10 レガシーポリシー', status: 'warning', created: '2024-10-01' },
  { id: 'dg-010', name: '新入社員端末グループ',      description: '2026年度入社者向け初期セットアップグループ', deviceCount: 34, policy: 'オンボーディングポリシー',  status: 'active',  created: '2026-04-01' },
];

type GroupStatus = 'active' | 'warning' | 'danger' | 'default';
type Group = typeof DEVICE_GROUPS[number];

const STATUS_CFG: Record<GroupStatus, { l: string; v: 'success' | 'warning' | 'danger' | 'default' }> = {
  active:  { l: '有効',   v: 'success' },
  warning: { l: '注意',   v: 'warning' },
  danger:  { l: '違反',   v: 'danger'  },
  default: { l: '廃棄予定', v: 'default' },
};

const getStatus = (s: string) => STATUS_CFG[s as GroupStatus] ?? STATUS_CFG.active;

const POLICIES = [...new Set(DEVICE_GROUPS.map(g => g.policy))];

export default function DeviceGroupsPage() {
  const [search, setSearch]   = useState('');
  const [detail, setDetail]   = useState<Group | null>(null);

  const totalDevices = DEVICE_GROUPS.reduce((s, g) => s + g.deviceCount, 0);

  const filtered = DEVICE_GROUPS.filter(g =>
    !search || g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.description.toLowerCase().includes(search.toLowerCase()) ||
    g.policy.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">デバイスグループ</h1>
          <p className="page-subtitle">管理・レポート用にデバイスをグループに編成</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary">CSVエクスポート</button>
          <button className="btn-primary">グループを作成</button>
        </div>
      </div>

      <div className="grid-3">
        <div className="card card-center"><p className="stat-label">グループ数</p><p className="stat-value">{DEVICE_GROUPS.length}</p></div>
        <div className="card card-center"><p className="stat-label">総端末数</p><p className="stat-value text-green">{totalDevices.toLocaleString()}</p></div>
        <div className="card card-center"><p className="stat-label">ポリシー数</p><p className="stat-value">{POLICIES.length}</p></div>
      </div>

      <div className="card filter-row">
        <SearchInput placeholder="グループ名・説明・ポリシーで検索..." value={search} onChange={v => setSearch(v)} style={{ flex: 1, minWidth: 200 }} />
      </div>

      <div className="card table-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr>
              {['グループ名', '説明', '端末数', '適用ポリシー', '作成日', 'ステータス'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(g => {
                const sc = getStatus(g.status);
                return (
                  <tr key={g.id} className="table-row-hover" onClick={() => setDetail(g)} style={{ cursor: 'pointer' }}>
                    <td><span className="link-text">{g.name}</span></td>
                    <td className="text-sub">{g.description}</td>
                    <td><strong>{g.deviceCount.toLocaleString()}</strong> 台</td>
                    <td className="text-sub">{g.policy}</td>
                    <td className="text-sub">{g.created}</td>
                    <td><Badge variant={sc.v} dot>{sc.l}</Badge></td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={6} className="table-empty">条件に一致するグループが見つかりません</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span className="table-info">全 {DEVICE_GROUPS.length} 件中 {filtered.length} 件を表示</span>
        </div>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name ?? 'グループ詳細'} wide>
        {detail && (
          <div className="detail-grid">
            {([
              ['グループ名',   detail.name],
              ['説明',         detail.description],
              ['端末数',       `${detail.deviceCount.toLocaleString()} 台`],
              ['適用ポリシー', detail.policy],
              ['作成日',       detail.created],
              ['ステータス',   getStatus(detail.status).l],
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
