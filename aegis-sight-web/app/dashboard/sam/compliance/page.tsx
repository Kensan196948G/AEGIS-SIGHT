'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/design-components';

const COMPLIANCE_DATA = [
  { id: 1,  software: 'Microsoft 365 Business Premium', purchased: 500, installed: 0,   m365: 423, overDeployed: 0  },
  { id: 2,  software: 'Google Chrome',                  purchased: 500, installed: 489, m365: 0,   overDeployed: 0  },
  { id: 3,  software: 'Sophos Intercept X',             purchased: 300, installed: 312, m365: 0,   overDeployed: 12 },
  { id: 4,  software: 'Adobe Acrobat Reader DC',        purchased: 100, installed: 87,  m365: 0,   overDeployed: 0  },
  { id: 5,  software: 'Slack Business+',                purchased: 200, installed: 0,   m365: 0,   overDeployed: 0  },
  { id: 6,  software: 'Zoom Business',                  purchased: 150, installed: 142, m365: 0,   overDeployed: 0  },
  { id: 7,  software: '7-Zip',                          purchased: 500, installed: 489, m365: 0,   overDeployed: 0  },
  { id: 8,  software: 'Notepad++',                      purchased: 200, installed: 198, m365: 0,   overDeployed: 0  },
  { id: 9,  software: 'Visual Studio Code',             purchased: 100, installed: 108, m365: 0,   overDeployed: 8  },
  { id: 10, software: 'Git for Windows',                purchased: 100, installed: 95,  m365: 0,   overDeployed: 0  },
];

type Filter = 'all' | 'compliant' | 'non-compliant';

export default function CompliancePage() {
  const [filter, setFilter] = useState<Filter>('all');

  const withStatus = COMPLIANCE_DATA.map(d => ({
    ...d,
    total:     d.installed + d.m365,
    compliant: (d.installed + d.m365) <= d.purchased,
  }));

  const compliantCount    = withStatus.filter(d =>  d.compliant).length;
  const nonCompliantCount = withStatus.filter(d => !d.compliant).length;
  const totalOverDeployed = withStatus.reduce((s, d) => s + d.overDeployed, 0);

  const filtered =
    filter === 'compliant'      ? withStatus.filter(d =>  d.compliant) :
    filter === 'non-compliant'  ? withStatus.filter(d => !d.compliant) :
    withStatus;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">コンプライアンスチェック</h1>
          <p className="page-subtitle">ライセンスコンプライアンス状況の確認</p>
        </div>
        <button className="btn-secondary">再読み込み</button>
      </div>

      <div className="grid-4">
        <div className="card card-center"><p className="stat-label">チェック総数</p><p className="stat-value">{COMPLIANCE_DATA.length}</p></div>
        <div className="card card-center"><p className="stat-label">準拠</p><p className="stat-value text-green">{compliantCount}</p></div>
        <div className="card card-center"><p className="stat-label">違反</p><p className="stat-value text-red">{nonCompliantCount}</p></div>
        <div className="card card-center"><p className="stat-label">超過デプロイ合計</p><p className="stat-value text-amber">{totalOverDeployed}</p></div>
      </div>

      <div className="card filter-row">
        {([
          { key: 'all',           label: 'すべて', count: COMPLIANCE_DATA.length },
          { key: 'compliant',     label: '準拠',   count: compliantCount },
          { key: 'non-compliant', label: '違反',   count: nonCompliantCount },
        ] as { key: Filter; label: string; count: number }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={filter === tab.key ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: 13 }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      <div className="card table-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr>
              {['ソフトウェア', '購入数', 'インストール数', 'M365 割当', '合計使用数', '状態', '超過数'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(d => (
                <tr key={d.id} className="table-row-hover">
                  <td><span className="text-main" style={{ fontWeight: 500 }}>{d.software}</span></td>
                  <td className="text-sub">{d.purchased}</td>
                  <td className="text-sub">{d.installed}</td>
                  <td className="text-sub">{d.m365}</td>
                  <td className={d.total > d.purchased ? 'text-red' : 'text-sub'} style={{ fontWeight: d.total > d.purchased ? 600 : 400 }}>
                    {d.total}
                  </td>
                  <td><Badge variant={d.compliant ? 'success' : 'danger'}>{d.compliant ? '準拠' : '違反'}</Badge></td>
                  <td className={d.overDeployed > 0 ? 'text-red' : 'text-sub'} style={{ fontWeight: d.overDeployed > 0 ? 600 : 400 }}>
                    {d.overDeployed}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="table-empty">データなし</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span className="table-info">全 {COMPLIANCE_DATA.length} 件中 {filtered.length} 件を表示</span>
        </div>
      </div>
    </div>
  );
}
