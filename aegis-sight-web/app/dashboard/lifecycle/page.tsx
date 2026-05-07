'use client';

import { useState } from 'react';
import {
  Badge, SearchInput, Modal,
} from '@/components/ui/design-components';

const LIFECYCLE_ASSETS = [
  { id: 'lc-001', name: 'ThinkPad X1 Carbon Gen11', phase: '運用中',    acquired: '2023-04-01', warranty: '2026-03-31', eol: '2028-04-01', dept: 'エンジニアリング', action: '—'                    },
  { id: 'lc-002', name: 'Dell OptiPlex 7090',        phase: '更新予定',  acquired: '2021-10-15', warranty: '2024-10-14', eol: '2026-10-15', dept: '営業',             action: '代替機調達申請'        },
  { id: 'lc-003', name: 'HP EliteDesk 800 G9',       phase: '延命運用',  acquired: '2020-01-20', warranty: '2023-01-19', eol: '2025-01-20', dept: '人事',             action: 'SSD換装済み'           },
  { id: 'lc-004', name: 'ThinkPad T14s Gen4',        phase: '廃棄申請中', acquired: '2020-04-01', warranty: '2023-03-31', eol: '2023-04-01', dept: '総務',             action: '廃棄申請中 #DR-0010'  },
  { id: 'lc-005', name: 'MacBook Pro 14" M3',        phase: '運用中',    acquired: '2024-01-15', warranty: '2027-01-14', eol: '2029-01-15', dept: 'デザイン',         action: '—'                    },
  { id: 'lc-006', name: 'Dell PowerEdge R750',       phase: '運用中',    acquired: '2023-08-01', warranty: '2028-07-31', eol: '2030-08-01', dept: 'インフラ',         action: '—'                    },
];

type Phase = '運用中' | '更新予定' | '廃棄申請中' | '延命運用';
type Asset = typeof LIFECYCLE_ASSETS[number];

const PHASE_CFG: Record<Phase, { v: 'success' | 'warning' | 'danger' | 'info' }> = {
  '運用中':    { v: 'success' },
  '更新予定':  { v: 'warning' },
  '廃棄申請中': { v: 'danger'  },
  '延命運用':  { v: 'info'    },
};

const getPhase = (p: string) => PHASE_CFG[p as Phase] ?? { v: 'default' as const };

export default function LifecyclePage() {
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<Asset | null>(null);

  const active    = LIFECYCLE_ASSETS.filter(a => a.phase === '運用中').length;
  const renew     = LIFECYCLE_ASSETS.filter(a => a.phase === '更新予定').length;
  const disposal  = LIFECYCLE_ASSETS.filter(a => a.phase === '廃棄申請中').length;
  const extended  = LIFECYCLE_ASSETS.filter(a => a.phase === '延命運用').length;

  const filtered = LIFECYCLE_ASSETS.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.dept.includes(search) || a.phase.includes(search)
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">資産ライフサイクル管理</h1>
          <p className="page-subtitle">デバイスの調達から廃棄までのフェーズ管理</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary">CSVエクスポート</button>
          <button className="btn-primary">廃棄申請を追加</button>
        </div>
      </div>

      <div className="grid-4">
        <div className="card card-center"><p className="stat-label">運用中</p><p className="stat-value text-green">{active}</p></div>
        <div className="card card-center"><p className="stat-label">更新予定</p><p className="stat-value text-amber">{renew}</p></div>
        <div className="card card-center"><p className="stat-label">廃棄申請中</p><p className="stat-value text-red">{disposal}</p></div>
        <div className="card card-center"><p className="stat-label">延命運用</p><p className="stat-value">{extended}</p></div>
      </div>

      <div className="card filter-row">
        <SearchInput placeholder="資産名・部門・フェーズで検索..." value={search} onChange={v => setSearch(v)} style={{ flex: 1, minWidth: 200 }} />
      </div>

      <div className="card table-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr>
              {['資産名', 'フェーズ', '取得日', '保証期限', 'EOL', '部門', '対応アクション'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(a => (
                <tr key={a.id} className="table-row-hover" onClick={() => setDetail(a)} style={{ cursor: 'pointer' }}>
                  <td><span className="link-text">{a.name}</span></td>
                  <td><Badge variant={getPhase(a.phase).v} dot>{a.phase}</Badge></td>
                  <td className="text-sub">{a.acquired}</td>
                  <td className="text-sub">{a.warranty}</td>
                  <td className="text-sub">{a.eol}</td>
                  <td>{a.dept}</td>
                  <td className="text-sub">{a.action}</td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="table-empty">条件に一致する資産が見つかりません</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span className="table-info">全 {LIFECYCLE_ASSETS.length} 件中 {filtered.length} 件を表示</span>
        </div>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name ?? '資産詳細'} wide>
        {detail && (
          <div className="detail-grid">
            {([
              ['フェーズ',     detail.phase],
              ['部門',         detail.dept],
              ['取得日',       detail.acquired],
              ['保証期限',     detail.warranty],
              ['EOL',          detail.eol],
              ['対応アクション', detail.action],
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
