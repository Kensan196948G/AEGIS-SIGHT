'use client';

import { useState } from 'react';
import {
  Badge, SearchInput, Select, Modal,
} from '@/components/ui/design-components';

const PROCUREMENTS = [
  { id: 'pr-001', name: 'ThinkPad X1 Carbon Gen12',         vendor: 'Lenovo',    qty: 20, unitPrice: 198000, total: 3960000, priority: 'high',   status: 'approved',  requested: '2025-01-10', requester: 'エンジニアリング部' },
  { id: 'pr-002', name: 'Adobe Creative Cloud ライセンス追加（10)',  vendor: 'Adobe',    qty: 10, unitPrice:  66000, total:  660000, priority: 'medium', status: 'review',    requested: '2025-01-12', requester: 'デザイン部'         },
  { id: 'pr-003', name: 'Dell PowerEdge R760 サーバー',      vendor: 'Dell',      qty:  2, unitPrice: 980000, total: 1960000, priority: 'high',   status: 'approved',  requested: '2025-01-08', requester: 'インフラチーム'     },
  { id: 'pr-004', name: 'Zoom Business ライセンス追加（50）', vendor: 'Zoom',      qty: 50, unitPrice:   2640, total:  132000, priority: 'medium', status: 'pending',   requested: '2025-01-14', requester: '総務部'             },
  { id: 'pr-005', name: 'UPS 無停電電源装置（APC 2200VA）',  vendor: 'APC',       qty:  4, unitPrice: 120000, total:  480000, priority: 'low',    status: 'completed', requested: '2024-12-20', requester: 'インフラチーム'     },
  { id: 'pr-006', name: 'Sophos ライセンス更新（1200 端末）', vendor: 'Sophos',   qty:  1, unitPrice: 840000, total:  840000, priority: 'high',   status: 'approved',  requested: '2025-01-05', requester: 'セキュリティチーム' },
  { id: 'pr-007', name: 'iPad Pro 12.9" (現場用)',           vendor: 'Apple',     qty: 15, unitPrice: 178000, total: 2670000, priority: 'low',    status: 'pending',   requested: '2025-01-15', requester: '建設現場管理部'     },
  { id: 'pr-008', name: '業務用シュレッダー（情報漏洩防止）', vendor: '明光商会',  qty:  5, unitPrice:  45000, total:  225000, priority: 'low',    status: 'rejected',  requested: '2025-01-11', requester: '総務部'             },
];

const STATUS_OPTS = [
  { value: '',          label: 'すべてのステータス' },
  { value: 'approved',  label: '承認済' },
  { value: 'review',    label: 'レビュー中' },
  { value: 'pending',   label: '申請中' },
  { value: 'completed', label: '完了' },
  { value: 'rejected',  label: '却下' },
];

type ProcStatus = 'approved' | 'review' | 'pending' | 'completed' | 'rejected';
type Priority   = 'high' | 'medium' | 'low';
type Proc = typeof PROCUREMENTS[number];

const PROC_STATUS: Record<ProcStatus, { l: string; v: 'success' | 'warning' | 'info' | 'default' | 'danger' }> = {
  approved:  { l: '承認済',    v: 'success' },
  review:    { l: 'レビュー中', v: 'warning' },
  pending:   { l: '申請中',    v: 'info'    },
  completed: { l: '完了',      v: 'default' },
  rejected:  { l: '却下',      v: 'danger'  },
};

const PRIO_CFG: Record<Priority, { l: string; v: 'danger' | 'warning' | 'success' }> = {
  high:   { l: '高',  v: 'danger'  },
  medium: { l: '中',  v: 'warning' },
  low:    { l: '低',  v: 'success' },
};

const getStatus = (s: string) => PROC_STATUS[s as ProcStatus] ?? PROC_STATUS.pending;
const getPrio   = (p: string) => PRIO_CFG[p as Priority] ?? PRIO_CFG.low;

const totalBudget = PROCUREMENTS.filter(p => p.status !== 'rejected').reduce((s, p) => s + p.total, 0);
const approvedCount = PROCUREMENTS.filter(p => p.status === 'approved').length;
const pendingCount  = PROCUREMENTS.filter(p => p.status === 'pending' || p.status === 'review').length;

export default function ProcurementPage() {
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('');
  const [detail, setDetail]       = useState<Proc | null>(null);

  const filtered = PROCUREMENTS.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.vendor.toLowerCase().includes(search.toLowerCase()) || p.requester.includes(search);
    const matchStatus = !statusFilter || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">調達管理</h1>
          <p className="page-subtitle">IT 機器・ソフトウェア・サービスの購買申請と承認管理</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary">CSVエクスポート</button>
          <button className="btn-primary">調達申請を作成</button>
        </div>
      </div>

      <div className="grid-4">
        <div className="card card-center"><p className="stat-label">申請件数</p><p className="stat-value">{PROCUREMENTS.length}</p></div>
        <div className="card card-center"><p className="stat-label">承認済</p><p className="stat-value text-green">{approvedCount}</p></div>
        <div className="card card-center"><p className="stat-label">審査中</p><p className="stat-value text-amber">{pendingCount}</p></div>
        <div className="card card-center"><p className="stat-label">承認済総額</p><p className="stat-value text-green" style={{ fontSize: 18 }}>¥{(totalBudget / 10000).toFixed(0)}万</p></div>
      </div>

      <div className="card filter-row">
        <SearchInput placeholder="品名・ベンダー・申請部門で検索..." value={search} onChange={v => setSearch(v)} style={{ flex: 1, minWidth: 200 }} />
        <Select options={STATUS_OPTS} value={statusFilter} onChange={v => setStatus(v)} style={{ minWidth: 160 }} />
      </div>

      <div className="card table-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr>
              {['品名', 'ベンダー', '数量', '合計金額', '優先度', '申請部門', '申請日', 'ステータス'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(p => {
                const st = getStatus(p.status);
                const pr = getPrio(p.priority);
                return (
                  <tr key={p.id} className="table-row-hover" onClick={() => setDetail(p)} style={{ cursor: 'pointer' }}>
                    <td><span className="link-text">{p.name}</span></td>
                    <td className="text-sub">{p.vendor}</td>
                    <td className="text-sub">{p.qty}</td>
                    <td><span className="text-main" style={{ fontWeight: 600 }}>¥{p.total.toLocaleString()}</span></td>
                    <td><Badge variant={pr.v}>{pr.l}</Badge></td>
                    <td className="text-sub">{p.requester}</td>
                    <td className="text-sub">{p.requested}</td>
                    <td><Badge variant={st.v} dot>{st.l}</Badge></td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={8} className="table-empty">条件に一致する申請が見つかりません</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span className="table-info">全 {PROCUREMENTS.length} 件中 {filtered.length} 件を表示</span>
        </div>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name ?? '調達詳細'} wide>
        {detail && (
          <div className="detail-grid">
            {([
              ['ベンダー',   detail.vendor],
              ['数量',       String(detail.qty)],
              ['単価',       `¥${detail.unitPrice.toLocaleString()}`],
              ['合計金額',   `¥${detail.total.toLocaleString()}`],
              ['優先度',     getPrio(detail.priority).l],
              ['申請部門',   detail.requester],
              ['申請日',     detail.requested],
              ['ステータス', getStatus(detail.status).l],
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
