'use client';

import { useState } from 'react';
import { Badge, SearchInput } from '@/components/ui/design-components';

const LICENSES = [
  { id: 'lic-001', name: 'Microsoft 365 Business Premium', vendor: 'Microsoft', type: 'サブスクリプション', purchased: 500, installed: 0,   m365: 423, costPerUnit: 2180, expiry: '2026-03-31' },
  { id: 'lic-002', name: 'Google Chrome Enterprise',       vendor: 'Google',    type: 'デバイス',          purchased: 500, installed: 489, m365: 0,   costPerUnit: 0,    expiry: null         },
  { id: 'lic-003', name: 'Sophos Intercept X',             vendor: 'Sophos',    type: 'デバイス',          purchased: 300, installed: 312, m365: 0,   costPerUnit: 4800, expiry: '2025-12-31' },
  { id: 'lic-004', name: 'Adobe Acrobat Reader DC',        vendor: 'Adobe',     type: 'ユーザー',          purchased: 100, installed: 87,  m365: 0,   costPerUnit: 1500, expiry: '2025-09-30' },
  { id: 'lic-005', name: 'Slack Business+',                vendor: 'Slack',     type: 'ユーザー',          purchased: 200, installed: 0,   m365: 0,   costPerUnit: 1250, expiry: '2025-08-31' },
  { id: 'lic-006', name: 'Zoom Business',                  vendor: 'Zoom',      type: 'ユーザー',          purchased: 150, installed: 142, m365: 0,   costPerUnit: 2000, expiry: '2025-11-30' },
  { id: 'lic-007', name: '7-Zip',                          vendor: 'Igor Pavlov', type: '無償',            purchased: 500, installed: 489, m365: 0,   costPerUnit: 0,    expiry: null         },
  { id: 'lic-008', name: 'Notepad++',                      vendor: 'Don Ho',    type: '無償',              purchased: 200, installed: 198, m365: 0,   costPerUnit: 0,    expiry: null         },
  { id: 'lic-009', name: 'Visual Studio Code',             vendor: 'Microsoft', type: '無償',              purchased: 100, installed: 108, m365: 0,   costPerUnit: 0,    expiry: null         },
  { id: 'lic-010', name: 'Git for Windows',                vendor: 'Git',       type: '無償',              purchased: 100, installed: 95,  m365: 0,   costPerUnit: 0,    expiry: null         },
];

type StatusKey = 'compliant' | 'over' | 'warning' | 'underused';

const STATUS_CFG: Record<StatusKey, { label: string; v: 'success' | 'danger' | 'warning' | 'info' }> = {
  compliant: { label: '準拠',     v: 'success' },
  over:      { label: '超過',     v: 'danger'  },
  warning:   { label: '期限間近', v: 'warning' },
  underused: { label: '低利用',   v: 'info'    },
};

type License = typeof LICENSES[number];

function computeStatus(lic: License): StatusKey {
  const used = lic.installed + lic.m365;
  if (used > lic.purchased) return 'over';
  if (lic.expiry) {
    const days = Math.floor((new Date(lic.expiry).getTime() - Date.now()) / 86400000);
    if (days <= 90) return 'warning';
  }
  if (lic.purchased > 0 && used / lic.purchased < 0.5) return 'underused';
  return 'compliant';
}

function formatExpiry(expiry: string | null): { text: string; urgent: boolean } {
  if (!expiry) return { text: '—', urgent: false };
  const days = Math.floor((new Date(expiry).getTime() - Date.now()) / 86400000);
  if (days < 0)   return { text: `${Math.abs(days)}日超過`, urgent: true };
  if (days === 0) return { text: '本日期限',               urgent: true };
  if (days <= 30) return { text: `残${days}日`,            urgent: true };
  if (days <= 90) return { text: `残${days}日`,            urgent: false };
  const d = new Date(expiry);
  return {
    text: `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`,
    urgent: false,
  };
}

const VENDORS = [...new Set(LICENSES.map(l => l.vendor))].sort();

export default function LicensesPage() {
  const [search,        setSearch]        = useState('');
  const [filterStatus,  setFilterStatus]  = useState('');
  const [filterVendor,  setFilterVendor]  = useState('');

  const totalMonthlyCost = LICENSES.reduce((s, l) => s + l.costPerUnit * l.purchased, 0);
  const overCount        = LICENSES.filter(l => computeStatus(l) === 'over').length;
  const expiringCount    = LICENSES.filter(l => computeStatus(l) === 'warning').length;
  const underusedCount   = LICENSES.filter(l => computeStatus(l) === 'underused').length;

  const filtered = LICENSES.filter(l => {
    const status = computeStatus(l);
    if (filterStatus && status !== filterStatus) return false;
    if (filterVendor && l.vendor !== filterVendor) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!l.name.toLowerCase().includes(q) && !l.vendor.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const selectStyle: React.CSSProperties = {
    padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6,
    background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: 13,
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">ライセンス管理</h1>
          <p className="page-subtitle">ソフトウェアライセンスの遵守状況・コスト・期限管理</p>
        </div>
        <button className="btn-primary">+ ライセンスを追加</button>
      </div>

      <div className="grid-4">
        <div className="card card-center">
          <p className="stat-label">月額総コスト</p>
          <p className="stat-value" style={{ fontSize: 18 }}>¥{totalMonthlyCost.toLocaleString()}</p>
        </div>
        <div className="card card-center">
          <p className="stat-label">超過ライセンス</p>
          <p className={`stat-value ${overCount > 0 ? 'text-red' : ''}`}>{overCount} 件</p>
        </div>
        <div className="card card-center">
          <p className="stat-label">期限間近</p>
          <p className={`stat-value ${expiringCount > 0 ? 'text-amber' : ''}`}>{expiringCount} 件</p>
        </div>
        <div className="card card-center">
          <p className="stat-label">低利用 (削減候補)</p>
          <p className={`stat-value ${underusedCount > 0 ? 'text-amber' : ''}`}>{underusedCount} 件</p>
        </div>
      </div>

      <div className="card filter-row">
        <SearchInput placeholder="ソフトウェア名・ベンダーで検索..." value={search} onChange={setSearch} style={{ flex: 1, minWidth: 200 }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
          <option value="">すべてのステータス</option>
          <option value="compliant">準拠</option>
          <option value="over">超過</option>
          <option value="warning">期限間近</option>
          <option value="underused">低利用</option>
        </select>
        <select value={filterVendor} onChange={e => setFilterVendor(e.target.value)} style={selectStyle}>
          <option value="">すべてのベンダー</option>
          {VENDORS.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      <div className="card table-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr>
              {['ソフトウェア', 'ベンダー', '種別', '購入 / 使用', '使用率', '月額コスト', '有効期限', 'ステータス', 'SKU alias'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(lic => {
                const used       = lic.installed + lic.m365;
                const usageRate  = lic.purchased > 0 ? Math.round((used / lic.purchased) * 100) : 0;
                const monthlyCost = lic.costPerUnit * lic.purchased;
                const expiry     = formatExpiry(lic.expiry);
                const status     = computeStatus(lic);
                const scfg       = STATUS_CFG[status];
                const barColor   = usageRate > 100 ? '#ef4444' : usageRate > 80 ? '#f59e0b' : '#10b981';

                return (
                  <tr key={lic.id} className="table-row-hover">
                    <td><span className="text-main" style={{ fontWeight: 500 }}>{lic.name}</span></td>
                    <td className="text-sub">{lic.vendor}</td>
                    <td className="text-sub">{lic.type}</td>
                    <td>
                      <span className={used > lic.purchased ? 'text-red' : 'text-sub'}
                        style={{ fontWeight: used > lic.purchased ? 600 : 400 }}>{used}</span>
                      <span className="text-sub"> / {lic.purchased}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 100 }}>
                        <div style={{ width: 64, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(usageRate, 100)}%`, height: '100%', background: barColor, borderRadius: 3 }} />
                        </div>
                        <span className="text-sub" style={{ fontSize: 12 }}>{usageRate}%</span>
                      </div>
                    </td>
                    <td className="mono text-sub">{monthlyCost > 0 ? `¥${monthlyCost.toLocaleString()}` : '—'}</td>
                    <td>
                      <span className={expiry.urgent ? 'text-red' : 'text-sub'}
                        style={{ fontSize: 13, fontWeight: expiry.urgent ? 600 : 400 }}>
                        {expiry.text}
                      </span>
                    </td>
                    <td><Badge variant={scfg.v} dot>{scfg.label}</Badge></td>
                    <td>
                      <a href={`/dashboard/sam/licenses/${lic.id}/aliases`} className="link-text" style={{ fontSize: 12 }}>
                        SKU alias →
                      </a>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={9} className="table-empty">条件に一致するライセンスが見つかりません</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span className="table-info">{filtered.length} 件表示 / 全 {LICENSES.length} 件</span>
        </div>
      </div>
    </div>
  );
}
