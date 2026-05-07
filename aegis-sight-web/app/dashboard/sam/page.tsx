'use client';

import { useState } from 'react';
import {
  Badge, DonutChart, MiniBarChart, ProgressBar,
  SearchInput, Modal, Tabs,
} from '@/components/ui/design-components';

const SAM_LICENSES = [
  { id: 'sl-001', name: 'Microsoft 365 Business Premium', vendor: 'Microsoft',  type: 'サブスクリプション', purchased: 500,  used: 487,  cost: 1320000, expiry: '2026-03-31', status: 'compliant'  },
  { id: 'sl-002', name: 'Adobe Creative Cloud',           vendor: 'Adobe',       type: 'サブスクリプション', purchased:  50,  used:  58,  cost:  330000, expiry: '2026-12-31', status: 'over'       },
  { id: 'sl-003', name: 'Windows 11 Pro',                 vendor: 'Microsoft',  type: 'OEM',               purchased: 800,  used: 742,  cost:       0, expiry: '—',           status: 'underused'  },
  { id: 'sl-004', name: 'AutoCAD LT 2024',               vendor: 'Autodesk',   type: 'サブスクリプション', purchased:  30,  used:  27,  cost:  204600, expiry: '2026-08-31', status: 'compliant'  },
  { id: 'sl-005', name: 'Slack Business+',               vendor: 'Salesforce', type: 'サブスクリプション', purchased: 200,  used: 196,  cost:  528000, expiry: '2026-01-31', status: 'warning'    },
  { id: 'sl-006', name: 'Zoom Business',                 vendor: 'Zoom',       type: 'サブスクリプション', purchased: 100,  used: 143,  cost:  264000, expiry: '2027-02-28', status: 'over'       },
  { id: 'sl-007', name: 'GitHub Enterprise Cloud',       vendor: 'GitHub',     type: 'サブスクリプション', purchased:  80,  used:  72,  cost:  195000, expiry: '2027-03-31', status: 'compliant'  },
  { id: 'sl-008', name: 'Tableau Creator',               vendor: 'Salesforce', type: 'サブスクリプション', purchased:  20,  used:   8,  cost:  380000, expiry: '2026-06-30', status: 'underused'  },
  { id: 'sl-009', name: 'Sophos Intercept X',            vendor: 'Sophos',     type: 'サブスクリプション', purchased: 1200, used: 1187, cost:  840000, expiry: '2026-09-30', status: 'compliant'  },
  { id: 'sl-010', name: 'VMware vSphere 8',              vendor: 'VMware',     type: 'パーペチュアル',     purchased:  16,  used:  14,  cost:  960000, expiry: '—',           status: 'compliant'  },
];

type SamStatus = 'compliant' | 'over' | 'warning' | 'underused';
type License = typeof SAM_LICENSES[number];

const SAM_STATUS_CFG: Record<SamStatus, { l: string; v: 'success' | 'danger' | 'warning' | 'info' }> = {
  compliant:  { l: '適正',   v: 'success' },
  over:       { l: '超過',   v: 'danger'  },
  warning:    { l: '注意',   v: 'warning' },
  underused:  { l: '低利用', v: 'info'    },
};

const getSamStatus = (s: string) => SAM_STATUS_CFG[s as SamStatus] ?? SAM_STATUS_CFG.compliant;

const TABS = [
  { id: 'overview',  label: '概要'         },
  { id: 'licenses',  label: 'ライセンス'   },
  { id: 'cost',      label: 'コスト'       },
];

export default function SAMPage() {
  const [tab, setTab]     = useState('overview');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<License | null>(null);

  const compliant  = SAM_LICENSES.filter(l => l.status === 'compliant').length;
  const over       = SAM_LICENSES.filter(l => l.status === 'over').length;
  const warning    = SAM_LICENSES.filter(l => l.status === 'warning').length;
  const underused  = SAM_LICENSES.filter(l => l.status === 'underused').length;
  const compRate   = Math.round((compliant / SAM_LICENSES.length) * 100);

  const statusBarData = [
    { label: '適正',   value: compliant,  color: '#10b981' },
    { label: '超過',   value: over,       color: '#ef4444' },
    { label: '注意',   value: warning,    color: '#f59e0b' },
    { label: '低利用', value: underused,  color: '#3b82f6' },
  ];

  const vendors = SAM_LICENSES.reduce<Record<string, number>>((acc, l) => {
    acc[l.vendor] = (acc[l.vendor] ?? 0) + l.cost;
    return acc;
  }, {});
  const vendorBarData = Object.entries(vendors)
    .map(([label, value]) => ({ label, value: Math.round(value / 10000), color: '#3b82f6' }))
    .sort((a, b) => b.value - a.value);

  const totalCost = SAM_LICENSES.reduce((s, l) => s + l.cost, 0);

  const filtered = SAM_LICENSES.filter(l =>
    !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.vendor.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">SAM — ソフトウェア資産管理</h1>
          <p className="page-subtitle">ライセンスコンプライアンスと最適化</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary">CSVエクスポート</button>
          <button className="btn-primary">ライセンスを追加</button>
        </div>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'overview' && (
        <>
          <div className="card">
            <h2 className="card-title">ライセンス概要</h2>
            <div className="chart-row">
              <div className="chart-center">
                <p className="chart-label">ライセンス遵守率</p>
                <DonutChart value={compRate} max={100} size={140} strokeWidth={14}
                  color={compRate >= 80 ? '#10b981' : '#f59e0b'} />
                <p className="chart-sublabel">全 {SAM_LICENSES.length} 製品中 {compliant} 件適正</p>
              </div>
              <div style={{ flex: 1 }}>
                <p className="chart-label">ステータス別内訳</p>
                <MiniBarChart data={statusBarData} maxValue={SAM_LICENSES.length} height={160} />
              </div>
            </div>
          </div>

          <div className="grid-4">
            <div className="card card-center"><p className="stat-label">適正</p><p className="stat-value text-green">{compliant}</p></div>
            <div className="card card-center"><p className="stat-label">超過</p><p className="stat-value text-red">{over}</p></div>
            <div className="card card-center"><p className="stat-label">注意</p><p className="stat-value text-amber">{warning}</p></div>
            <div className="card card-center"><p className="stat-label">低利用</p><p className="stat-value">{underused}</p></div>
          </div>
        </>
      )}

      {tab === 'licenses' && (
        <>
          <div className="card filter-row">
            <SearchInput placeholder="ソフトウェア名・ベンダーで検索..." value={search} onChange={v => setSearch(v)} style={{ flex: 1, minWidth: 200 }} />
          </div>

          <div className="card table-card">
            <div className="table-scroll">
              <table className="data-table">
                <thead><tr>
                  {['ソフトウェア名', 'ベンダー', 'ライセンス種別', '購入数', '使用数', '利用率', '有効期限', 'ステータス'].map(h => <th key={h}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {filtered.length > 0 ? filtered.map(l => {
                    const sc = getSamStatus(l.status);
                    const rate = Math.round((l.used / l.purchased) * 100);
                    return (
                      <tr key={l.id} className="table-row-hover" onClick={() => setDetail(l)} style={{ cursor: 'pointer' }}>
                        <td><span className="link-text">{l.name}</span></td>
                        <td>{l.vendor}</td>
                        <td>{l.type}</td>
                        <td>{l.purchased.toLocaleString()}</td>
                        <td className={l.used > l.purchased ? 'text-red' : ''}>{l.used.toLocaleString()}</td>
                        <td style={{ minWidth: 120 }}>
                          <ProgressBar value={l.used} max={l.purchased} size="sm" />
                          <span className="text-sub" style={{ fontSize: 11 }}>{rate}%</span>
                        </td>
                        <td className="text-sub">{l.expiry}</td>
                        <td><Badge variant={sc.v} dot>{sc.l}</Badge></td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan={8} className="table-empty">条件に一致するライセンスが見つかりません</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'cost' && (
        <>
          <div className="card">
            <h2 className="card-title">ベンダー別コスト（万円/年）</h2>
            <MiniBarChart data={vendorBarData} height={180} />
          </div>

          <div className="card">
            <h2 className="card-title">コスト詳細</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {SAM_LICENSES.filter(l => l.cost > 0).sort((a, b) => b.cost - a.cost).map(l => (
                <div key={l.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className="text-sub">{l.name}</span>
                    <span className="text-main" style={{ fontWeight: 600 }}>¥{l.cost.toLocaleString()}</span>
                  </div>
                  <ProgressBar value={l.cost} max={totalCost} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <span className="stat-label">年間ライセンス総コスト</span>
              <span className="stat-value">¥{totalCost.toLocaleString()}</span>
            </div>
          </div>
        </>
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name ?? 'ライセンス詳細'} wide>
        {detail && (
          <div className="detail-grid">
            {([
              ['ベンダー',       detail.vendor],
              ['ライセンス種別', detail.type],
              ['購入数',         String(detail.purchased)],
              ['使用数',         String(detail.used)],
              ['年間コスト',     `¥${detail.cost.toLocaleString()}`],
              ['有効期限',       detail.expiry],
              ['ステータス',     getSamStatus(detail.status).l],
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
